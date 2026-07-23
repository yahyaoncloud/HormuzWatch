// Package datasets implements a queue-based, asynchronous persistence layer that
// snapshots telemetry from the running backend into Google Drive as CSV files.
//
// Design (per TODO.md m1):
//   - A bounded in-memory channel (DatasetJob) decouples ingestion from Drive latency.
//   - Worker goroutine(s) dequeue, serialize CSV, and upload to the Drive `dataset` folder
//     using a service account (no user/OAuth consent).
//   - After each successful upload, retention is enforced: keep the newest DATASET_RETENTION
//     files per domain, delete the rest ("older than 3 files get removed").
//   - On Drive failure, the job is spilled to a local directory and retried later; ingestion
//     is never blocked.
package datasets

import (
	"bytes"
	"context"
	"encoding/csv"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"Geospatial-harmuz-watch/server/internal/domain/telemetry"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/oauth2/google"
	"google.golang.org/api/drive/v3"
	"google.golang.org/api/option"
)

// driveFileScope is sufficient to create/list/delete files the service account owns or that
// are shared with it. Avoids the broader full-drive scope.
const driveFileScope = "https://www.googleapis.com/auth/drive.file"

// ValidDomains are the three dataset types produced by the pipeline.
var ValidDomains = []string{telemetry.DomainVessel, telemetry.DomainAircraft, "heatmap"}

// DatasetJob is a single queued dataset export.
type DatasetJob struct {
	SnapshotID string
	Domain     string
	Header     []string
	Rows       [][]string
	CreatedAt  time.Time
}

// Manifest travels with every external CSV so data provenance remains
// available even when the database is not reachable.
type Manifest struct {
	SnapshotID string    `json:"snapshot_id"`
	Domain     string    `json:"domain"`
	CreatedAt  time.Time `json:"created_at"`
	RowCount   int       `json:"row_count"`
	Format     string    `json:"format"`
	Schema     []string  `json:"schema"`
}

// Config configures the dataset service.
type Config struct {
	FolderID     string // Drive folder id for the `dataset` folder
	Retention    int    // keep newest N files per domain (default 3)
	QueueSize    int    // bounded channel capacity (default 64)
	RowLimit     int    // maximum curated rows per dataset (default 5000)
	SAJSONPath   string // path to service-account JSON key
	SAJSONInline string // inline service-account JSON (alternative to path)
	SpillDir     string // local spill directory when Drive is unavailable
}

// FileInfo describes a dataset file in Drive.
type FileInfo struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Size        int64  `json:"size"`
	CreatedTime string `json:"created_time"`
}

// Status reports runtime state of the pipeline.
type Status struct {
	QueueDepth      int    `json:"queue_depth"`
	LastUpload      string `json:"last_upload,omitempty"`
	Retention       int    `json:"retention"`
	FolderID        string `json:"folder_id"`
	DriveConfigured bool   `json:"drive_configured"`
}

// Service is the dataset pipeline.
type Service struct {
	cfg   Config
	pool  *pgxpool.Pool
	drive *drive.Service

	queue      chan DatasetJob
	done       chan struct{}
	wg         sync.WaitGroup
	scheduleWG sync.WaitGroup

	mu          sync.RWMutex
	lastUpload  time.Time
	enqueueErrs int
}

// New constructs the service and starts the worker. If FolderID is empty or the service
// account is missing, Drive uploads silently spill to disk (so dev runs without GDrive).
func New(cfg Config, pool *pgxpool.Pool) (*Service, error) {
	if pool == nil {
		return nil, errors.New("dataset service requires a pgx pool")
	}
	if cfg.Retention <= 0 {
		cfg.Retention = DefaultRetention
	}
	if cfg.QueueSize <= 0 {
		cfg.QueueSize = DefaultQueueSize
	}
	if cfg.RowLimit <= 0 {
		cfg.RowLimit = DefaultRowLimit
	}
	if cfg.SpillDir == "" {
		cfg.SpillDir = filepath.Join("data", "datasets", "spill")
	}
	_ = os.MkdirAll(cfg.SpillDir, 0o755)

	s := &Service{
		cfg:   cfg,
		pool:  pool,
		queue: make(chan DatasetJob, cfg.QueueSize),
		done:  make(chan struct{}),
	}

	if cfg.FolderID != "" {
		ds, err := buildDriveService(cfg)
		if err != nil {
			log.Printf("[datasets] Drive unavailable (%v); uploads will spill locally", err)
		} else {
			s.drive = ds
		}
	}

	s.wg.Add(1)
	go s.worker()
	return s, nil
}

// buildDriveService constructs a Drive client from a service-account JSON key.
func buildDriveService(cfg Config) (*drive.Service, error) {
	var credJSON []byte
	var err error
	switch {
	case cfg.SAJSONInline != "":
		credJSON = []byte(cfg.SAJSONInline)
	case cfg.SAJSONPath != "":
		credJSON, err = os.ReadFile(cfg.SAJSONPath)
		if err != nil {
			return nil, fmt.Errorf("read service account: %w", err)
		}
	default:
		return nil, errors.New("no GDRIVE_SERVICE_ACCOUNT_JSON configured")
	}

	creds, err := google.CredentialsFromJSON(context.Background(), credJSON, driveFileScope)
	if err != nil {
		return nil, fmt.Errorf("credentials: %w", err)
	}
	ds, err := drive.NewService(context.Background(), option.WithCredentials(creds))
	if err != nil {
		return nil, fmt.Errorf("drive client: %w", err)
	}
	return ds, nil
}

// Enqueue queues a dataset export without blocking the caller.
func (s *Service) Enqueue(job DatasetJob) {
	if job.CreatedAt.IsZero() {
		job.CreatedAt = time.Now().UTC()
	}
	select {
	case s.queue <- job:
	default:
		// Queue full → spill immediately rather than block ingestion.
		s.spill(job)
	}
}

// Snapshot builds a dataset for a domain from running data and enqueues it.
func (s *Service) Snapshot(domain string) (string, error) {
	if !validDomain(domain) {
		return "", fmt.Errorf("invalid domain %q; want one of %v", domain, ValidDomains)
	}
	header, rows, err := s.query(domain)
	if err != nil {
		return "", err
	}
	job := DatasetJob{
		SnapshotID: uuid.NewString(),
		Domain:     domain,
		Header:     header,
		Rows:       rows,
		CreatedAt:  time.Now().UTC(),
	}
	if _, err := s.pool.Exec(context.Background(), insertDatasetSnapshotQuery,
		job.SnapshotID, job.Domain, job.CreatedAt, len(job.Rows), StatusQueued); err != nil {
		return "", fmt.Errorf("record dataset snapshot: %w", err)
	}
	s.Enqueue(job)
	return job.SnapshotID, nil
}

// StartSnapshotSchedule periodically curates all supported domains. A zero
// interval disables automation, leaving operators free to trigger snapshots
// through the API. Each domain is isolated so one failed query does not block
// the remaining exports.
func (s *Service) StartSnapshotSchedule(ctx context.Context, interval time.Duration) {
	if interval <= 0 {
		return
	}
	s.scheduleWG.Add(1)
	go func() {
		defer s.scheduleWG.Done()
		ticker := time.NewTicker(interval)
		defer ticker.Stop()
		for {
			select {
			case <-ctx.Done():
				return
			case <-s.done:
				return
			case <-ticker.C:
				for _, domain := range ValidDomains {
					if _, err := s.Snapshot(domain); err != nil {
						log.Printf("[datasets] scheduled %s snapshot failed: %v", domain, err)
					}
				}
			}
		}
	}()
}

// validDomain reports whether domain is one of the three supported datasets.
func validDomain(domain string) bool {
	for _, d := range ValidDomains {
		if d == domain {
			return true
		}
	}
	return false
}

// worker drains the queue, uploading each job and enforcing retention.
func (s *Service) worker() {
	defer s.wg.Done()
	for job := range s.queue {
		fileID, manifestID, err := s.upload(job)
		if err != nil {
			log.Printf("[datasets] upload failed: %v; spilling", err)
			s.updateSnapshot(job.SnapshotID, StatusSpilled, "", "", err.Error())
			s.spill(job)
			continue
		}
		s.updateSnapshot(job.SnapshotID, StatusUploaded, fileID, manifestID, "")
		s.mu.Lock()
		s.lastUpload = time.Now()
		s.mu.Unlock()
		s.enforceRetention(job.Domain)
	}
}

// upload serializes and uploads a job to the Drive folder.
func (s *Service) upload(job DatasetJob) (string, string, error) {
	if s.drive == nil {
		return "", "", errors.New("drive not configured")
	}
	buf := renderCSV(job.Header, job.Rows)
	baseName := fmt.Sprintf("hormuzwatch-%s-%s", job.Domain, job.SnapshotID)
	name := baseName + ".csv"
	f := &drive.File{Name: name, Parents: []string{s.cfg.FolderID}}
	csvFile, err := s.drive.Files.Create(f).Media(strings.NewReader(buf)).Fields("id,name").Do()
	if err != nil {
		return "", "", err
	}
	manifest, err := json.Marshal(Manifest{
		SnapshotID: job.SnapshotID,
		Domain:     job.Domain,
		CreatedAt:  job.CreatedAt.UTC(),
		RowCount:   len(job.Rows),
		Format:     DatasetFormatCSV,
		Schema:     job.Header,
	})
	if err != nil {
		return "", "", fmt.Errorf("marshal dataset manifest: %w", err)
	}
	manifestFile, err := s.drive.Files.Create(
		&drive.File{Name: baseName + ".manifest.json", Parents: []string{s.cfg.FolderID}},
	).Media(bytes.NewReader(manifest)).Fields("id").Do()
	if err != nil {
		return "", "", fmt.Errorf("upload dataset manifest: %w", err)
	}
	return csvFile.Id, manifestFile.Id, nil
}

// enforceRetention keeps the newest Retention files per domain, deleting older ones.
func (s *Service) enforceRetention(domain string) {
	if s.drive == nil {
		return
	}
	prefix := fmt.Sprintf("hormuzwatch-%s-", domain)
	q := fmt.Sprintf("name contains '%s' and '%s' in parents and trashed = false", prefix, s.cfg.FolderID)
	lst, err := s.drive.Files.List().Q(q).OrderBy("createdTime desc").
		Fields("files(id,name,createdTime)").Do()
	if err != nil {
		log.Printf("[datasets] list for retention failed: %v", err)
		return
	}
	if len(lst.Files) <= s.cfg.Retention {
		return
	}
	for _, f := range lst.Files[s.cfg.Retention:] {
		if err := s.drive.Files.Delete(f.Id).Do(); err != nil {
			log.Printf("[datasets] delete old dataset %s failed: %v", f.Name, err)
		} else {
			log.Printf("[datasets] retained newest %d; removed old dataset %s", s.cfg.Retention, f.Name)
		}
	}
}

// List returns dataset files currently in the Drive folder.
func (s *Service) List() ([]FileInfo, error) {
	if s.drive == nil {
		return nil, errors.New("drive not configured")
	}
	q := fmt.Sprintf("'%s' in parents and trashed = false", s.cfg.FolderID)
	lst, err := s.drive.Files.List().Q(q).OrderBy("createdTime desc").
		Fields("files(id,name,size,createdTime)").Do()
	if err != nil {
		return nil, err
	}
	out := make([]FileInfo, 0, len(lst.Files))
	for _, f := range lst.Files {
		out = append(out, FileInfo{
			ID:          f.Id,
			Name:        f.Name,
			Size:        f.Size,
			CreatedTime: f.CreatedTime,
		})
	}
	return out, nil
}

// Status returns runtime pipeline state.
func (s *Service) Status() Status {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return Status{
		QueueDepth:      len(s.queue),
		LastUpload:      s.lastUpload.Format(time.RFC3339),
		Retention:       s.cfg.Retention,
		FolderID:        s.cfg.FolderID,
		DriveConfigured: s.drive != nil,
	}
}

// Flush blocks until the queue drains or the timeout elapses.
func (s *Service) Flush(ctx context.Context, timeout time.Duration) error {
	dl, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()
	for {
		select {
		case <-dl.Done():
			return dl.Err()
		case <-time.After(100 * time.Millisecond):
			if len(s.queue) == 0 {
				return nil
			}
		}
	}
}

// Close stops the worker and waits for in-flight uploads to finish.
func (s *Service) Close() {
	close(s.done)
	s.scheduleWG.Wait()
	close(s.queue)
	s.wg.Wait()
}

// spill writes a failed job to local disk for later retry.
func (s *Service) spill(job DatasetJob) {
	s.mu.Lock()
	s.enqueueErrs++
	s.mu.Unlock()
	name := fmt.Sprintf("hormuzwatch-%s-%s.csv", job.Domain, job.SnapshotID)
	path := filepath.Join(s.cfg.SpillDir, name)
	if err := os.WriteFile(path, []byte(renderCSV(job.Header, job.Rows)), 0o644); err != nil {
		log.Printf("[datasets] spill write failed: %v", err)
	}
}

// query extracts a dataset's rows from the running backend's data.
func (s *Service) query(domain string) ([]string, [][]string, error) {
	switch domain {
	case telemetry.DomainVessel, telemetry.DomainAircraft:
		return s.queryTracks(domain)
	case "heatmap":
		return s.queryHeatmap()
	default:
		return nil, nil, fmt.Errorf("unsupported domain %q", domain)
	}
}

// queryTracks exports the latest track telemetry. The `tracks` table holds both vessel and
// aircraft rows; the requested domain is recorded as a column (the schema has no type field).
func (s *Service) queryTracks(domain string) ([]string, [][]string, error) {
	rows, err := s.pool.Query(context.Background(), selectCuratedTelemetryQuery, domain, s.cfg.RowLimit)
	if err != nil {
		return nil, nil, err
	}
	defer rows.Close()

	header := []string{"domain", "source", "track_id", "asset_name", "observed_at", "lat", "lon", "speed",
		"previous_speed", "heading", "course_delta", "ais_age_minutes", "hot_zone_distance_nm", "altitude", "squawk", "on_ground"}
	var out [][]string
	for rows.Next() {
		var (
			trackID, assetName, rowDomain, source, squawk                       string
			observedAt                                                          time.Time
			lat, lon, speed, prevSpeed, heading, courseDelta, hotZone, altitude float64
			aisAge                                                              int
			onGround                                                            bool
		)
		if err := rows.Scan(&trackID, &assetName, &rowDomain, &source, &observedAt, &lat, &lon, &speed, &prevSpeed, &heading,
			&courseDelta, &aisAge, &hotZone, &altitude, &squawk, &onGround); err != nil {
			return nil, nil, err
		}
		out = append(out, []string{
			rowDomain, source, trackID, assetName, observedAt.Format(time.RFC3339),
			fmt.Sprintf("%v", lat), fmt.Sprintf("%v", lon), fmt.Sprintf("%v", speed),
			fmt.Sprintf("%v", prevSpeed), fmt.Sprintf("%v", heading), fmt.Sprintf("%v", courseDelta),
			fmt.Sprintf("%v", aisAge), fmt.Sprintf("%v", hotZone), fmt.Sprintf("%v", altitude), squawk, fmt.Sprintf("%t", onGround),
		})
	}
	return header, out, rows.Err()
}

// queryHeatmap exports a coarse density grid (count per 1° cell) from tracks,
// producing a heatmap-style dataset without inventing a new table.
func (s *Service) queryHeatmap() ([]string, [][]string, error) {
	rows, err := s.pool.Query(context.Background(), selectHeatmapSnapshotQuery, s.cfg.RowLimit)
	if err != nil {
		return nil, nil, err
	}
	defer rows.Close()

	header := []string{"window_start", "lat_cell", "lon_cell", "observation_count"}
	var out [][]string
	for rows.Next() {
		var windowStart time.Time
		var latCell, lonCell, n int
		if err := rows.Scan(&windowStart, &latCell, &lonCell, &n); err != nil {
			return nil, nil, err
		}
		out = append(out, []string{
			windowStart.Format(time.RFC3339),
			fmt.Sprintf("%d", latCell),
			fmt.Sprintf("%d", lonCell),
			fmt.Sprintf("%d", n),
		})
	}
	return header, out, rows.Err()
}

func (s *Service) updateSnapshot(snapshotID, status, fileID, manifestID, message string) {
	if snapshotID == "" {
		return
	}
	if _, err := s.pool.Exec(context.Background(), updateDatasetSnapshotQuery,
		snapshotID, status, fileID, manifestID, message); err != nil {
		log.Printf("[datasets] update snapshot %s: %v", snapshotID, err)
	}
}

// renderCSV serializes header + rows to CSV text.
func renderCSV(header []string, rows [][]string) string {
	var b bytes.Buffer
	w := csv.NewWriter(&b)
	_ = w.Write(header)
	_ = w.WriteAll(rows)
	w.Flush()
	return b.String()
}
