package api

import (
	"archive/zip"
	"context"
	"encoding/csv"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"

	"Geospatial-harmuz-watch/server/internal/db"

	"github.com/gin-gonic/gin"
)

// ── Admin Dataset Export ──────────────────────────────────────────────────
//
// Admin-only endpoints for exporting curated datasets from the PostgreSQL
// backend to local storage (CSV/JSON). Files are saved under the ./datasets/
// directory and can be downloaded manually from the admin dashboard or used
// for offline analysis via the companion Python analysis script.
//
// Routes (all protected by JWTMiddleware + AdminOnlyMiddleware):
//   POST /api/admin/datasets/export   — trigger export
//   GET  /api/admin/datasets/exports  — list exported files
//   GET  /api/admin/datasets/download/:filename — download a file

// ── Types ─────────────────────────────────────────────────────────────────

// ExportRequest describes the parameters for a dataset export.
type ExportRequest struct {
	PeriodHours int    `json:"period_hours" form:"period_hours"` // time window in hours (0 = all data)
	Format      string `json:"format" form:"format"`             // "csv" or "json" (default "csv")
	Tables      string `json:"tables" form:"tables"`             // comma-separated table names, empty = all relevant
}

// ExportFileInfo describes an exported file visible to the admin.
type ExportFileInfo struct {
	Name       string `json:"name"`
	Size       int64  `json:"size"`
	CreatedAt  string `json:"created_at"`
	Format     string `json:"format"`
	PeriodHrs  int    `json:"period_hours"`
}

var exportDir = filepath.Join("datasets", "exports")

// relevantExportTables lists the tables that are exported by default.
var relevantExportTables = []string{
	"telemetry_observations",
	"tracks",
	"anomalies",
	"transit_events",
	"events",
	"articles",
}

// ── Handlers ──────────────────────────────────────────────────────────────

// AdminExportDataset handles POST /api/admin/datasets/export
func AdminExportDataset(c *gin.Context) {
	var req ExportRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		// Try form binding as fallback for browser-based requests
		if err := c.ShouldBind(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request: " + err.Error()})
			return
		}
	}
	if req.PeriodHours < 0 {
		req.PeriodHours = 0
	}
	if req.Format == "" {
		req.Format = "csv"
	}
	req.Format = strings.ToLower(req.Format)
	if req.Format != "csv" && req.Format != "json" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "format must be 'csv' or 'json'"})
		return
	}

	// Determine which tables to export
	tables := relevantExportTables
	if req.Tables != "" {
		tables = parseTableList(req.Tables)
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 60*time.Second)
	defer cancel()

	if db.PGX == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "database not available"})
		return
	}

	// Ensure export directory exists
	if err := os.MkdirAll(exportDir, 0o755); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create export directory"})
		return
	}

	timestamp := time.Now().UTC().Format("20060102-150405")
	label := fmt.Sprintf("hormuzwatch-export-%s-%dh", timestamp, req.PeriodHours)

	var exportedFiles []string

	switch req.Format {
	case "csv":
		// One CSV per table, zipped together
		files, err := exportCSV(ctx, tables, req.PeriodHours, label)
		if err != nil {
			log.Printf("[admin-export] CSV export failed: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		exportedFiles = files
	case "json":
		// Single JSON file with all tables
		f, err := exportJSON(ctx, tables, req.PeriodHours, label)
		if err != nil {
			log.Printf("[admin-export] JSON export failed: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		exportedFiles = []string{f}
	}

	log.Printf("[admin-export] Export complete: %s (%d tables, %s format)", label, len(tables), req.Format)
	c.JSON(http.StatusOK, gin.H{
		"status":  "completed",
		"label":   label,
		"files":   exportedFiles,
		"format":  req.Format,
		"tables":  tables,
		"period_hours": req.PeriodHours,
	})
}

// AdminListExports handles GET /api/admin/datasets/exports
func AdminListExports(c *gin.Context) {
	_ = os.MkdirAll(exportDir, 0o755)

	entries, err := os.ReadDir(exportDir)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	var files []ExportFileInfo
	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}
		info, err := entry.Info()
		if err != nil {
			continue
		}
		f := ExportFileInfo{
			Name:      entry.Name(),
			Size:      info.Size(),
			CreatedAt: info.ModTime().UTC().Format(time.RFC3339),
		}
		if strings.HasSuffix(entry.Name(), ".zip") {
			f.Format = "csv"
		} else if strings.HasSuffix(entry.Name(), ".json") {
			f.Format = "json"
		}
		files = append(files, f)
	}

	// Sort by creation time, newest first
	sort.Slice(files, func(i, j int) bool {
		return files[i].CreatedAt > files[j].CreatedAt
	})

	c.JSON(http.StatusOK, gin.H{"exports": files, "count": len(files)})
}

// AdminDownloadExport handles GET /api/admin/datasets/download/:filename
func AdminDownloadExport(c *gin.Context) {
	filename := c.Param("filename")
	if filename == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "filename required"})
		return
	}
	// Basic path traversal protection
	filename = filepath.Base(filename)
	filePath := filepath.Join(exportDir, filename)
	if _, err := os.Stat(filePath); os.IsNotExist(err) {
		c.JSON(http.StatusNotFound, gin.H{"error": "file not found"})
		return
	}
	c.File(filePath)
}

// AdminDeleteExport handles DELETE /api/admin/datasets/download/:filename
func AdminDeleteExport(c *gin.Context) {
	filename := c.Param("filename")
	if filename == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "filename required"})
		return
	}
	filename = filepath.Base(filename)
	filePath := filepath.Join(exportDir, filename)
	if err := os.Remove(filePath); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "deleted", "file": filename})
}

// ── Export Logic ──────────────────────────────────────────────────────────

// exportCSV exports each table as a CSV file, then zips them into a single archive.
func exportCSV(ctx context.Context, tables []string, periodHours int, label string) ([]string, error) {
	var csvFiles []string

	for _, table := range tables {
		header, rows, err := queryTable(ctx, table, periodHours)
		if err != nil {
			log.Printf("[admin-export] query %s failed: %v", table, err)
			continue
		}
		fileName := fmt.Sprintf("%s_%s.csv", label, table)
		filePath := filepath.Join(exportDir, fileName)
		if err := writeCSV(filePath, header, rows); err != nil {
			log.Printf("[admin-export] write %s failed: %v", table, err)
			continue
		}
		csvFiles = append(csvFiles, fileName)
	}

	if len(csvFiles) == 0 {
		return nil, fmt.Errorf("no data exported from any table")
	}

	// Zip all CSVs together
	zipName := label + ".zip"
	zipPath := filepath.Join(exportDir, zipName)
	if err := createZip(zipPath, csvFiles, exportDir); err != nil {
		return nil, fmt.Errorf("zip creation failed: %w", err)
	}

	return []string{zipName}, nil
}

// exportJSON exports all tables into a single JSON file.
func exportJSON(ctx context.Context, tables []string, periodHours int, label string) (string, error) {
	result := make(map[string]interface{})
	result["label"] = label
	result["exported_at"] = time.Now().UTC().Format(time.RFC3339)
	result["period_hours"] = periodHours

	tableData := make(map[string]interface{})
	for _, table := range tables {
		header, rows, err := queryTable(ctx, table, periodHours)
		if err != nil {
			log.Printf("[admin-export] query %s failed: %v", table, err)
			continue
		}
		tableData[table] = gin.H{
			"columns": header,
			"rows":    rows,
			"count":   len(rows),
		}
	}
	result["tables"] = tableData

	fileName := label + ".json"
	filePath := filepath.Join(exportDir, fileName)
	data, err := json.MarshalIndent(result, "", "  ")
	if err != nil {
		return "", fmt.Errorf("marshal json: %w", err)
	}
	if err := os.WriteFile(filePath, data, 0o644); err != nil {
		return "", fmt.Errorf("write json: %w", err)
	}
	return fileName, nil
}

// ── Query Helpers ─────────────────────────────────────────────────────────

// queryTable executes a SELECT * query on the given table with an optional time filter.
func queryTable(ctx context.Context, table string, periodHours int) ([]string, [][]string, error) {
	// Whitelist allowed tables to prevent SQL injection
	if !isAllowedTable(table) {
		return nil, nil, fmt.Errorf("table %q is not in the export whitelist", table)
	}

	query := fmt.Sprintf("SELECT * FROM %s", sanitizeTableName(table))

	// Apply time filter based on known timestamp columns
	timeCol := getTimeColumn(table)
	if timeCol != "" && periodHours > 0 {
		query += fmt.Sprintf(" WHERE %s >= NOW() - INTERVAL '%d hours'", timeCol, periodHours)
	}

	query += " ORDER BY " + getOrderColumn(table) + " DESC"

	// Limit rows to prevent memory exhaustion
	query += " LIMIT 50000"

	rows, err := db.PGX.Query(ctx, query)
	if err != nil {
		return nil, nil, fmt.Errorf("db query: %w", err)
	}
	defer rows.Close()

	// Get column names from the row description
	fieldDescs := rows.FieldDescriptions()
	header := make([]string, len(fieldDescs))
	for i, fd := range fieldDescs {
		header[i] = string(fd.Name)
	}

	var data [][]string
	for rows.Next() {
		values, err := rows.Values()
		if err != nil {
			return nil, nil, fmt.Errorf("scan row: %w", err)
		}
		row := make([]string, len(values))
		for i, v := range values {
			if v == nil {
				row[i] = ""
			} else if t, ok := v.(time.Time); ok {
				row[i] = t.Format(time.RFC3339)
			} else {
				row[i] = fmt.Sprintf("%v", v)
			}
		}
		data = append(data, row)
	}
	return header, data, rows.Err()
}

// ── Table Metadata ────────────────────────────────────────────────────────

// getTimeColumn returns the primary timestamp column for time-based filtering per table.
func getTimeColumn(table string) string {
	switch table {
	case "telemetry_observations":
		return "observed_at"
	case "tracks":
		return "last_updated"
	case "anomalies":
		return "last_updated"
	case "transit_events":
		return "crossed_at"
	case "events":
		return "created_at"
	case "articles":
		return "published_at"
	default:
		return ""
	}
}

// getOrderColumn returns the default ordering column for each table.
func getOrderColumn(table string) string {
	switch table {
	case "telemetry_observations":
		return "observed_at"
	case "tracks":
		return "last_updated"
	case "anomalies":
		return "last_updated"
	case "transit_events":
		return "crossed_at"
	case "events":
		return "created_at"
	case "articles":
		return "published_at"
	default:
		return "1"
	}
}

// isAllowedTable checks if a table name is in the export whitelist.
func isAllowedTable(table string) bool {
	for _, t := range relevantExportTables {
		if t == table {
			return true
		}
	}
	return false
}

// sanitizeTableName escapes a table name for safe SQL interpolation.
// Only alphanumeric and underscore characters are allowed.
func sanitizeTableName(name string) string {
	// Use a whitelist approach
	for _, r := range name {
		if (r >= 'a' && r <= 'z') || (r >= 'A' && r <= 'Z') || (r >= '0' && r <= '9') || r == '_' {
			continue
		}
		return "INVALID_TABLE_NAME"
	}
	return name
}

// parseTableList splits a comma-separated table list and validates each entry.
func parseTableList(raw string) []string {
	parts := strings.Split(raw, ",")
	var out []string
	for _, p := range parts {
		p = strings.TrimSpace(p)
		if p != "" && isAllowedTable(p) {
			out = append(out, p)
		}
	}
	if len(out) == 0 {
		return relevantExportTables
	}
	return out
}

// ── File Utilities ────────────────────────────────────────────────────────

// writeCSV writes header + rows to a CSV file.
func writeCSV(path string, header []string, rows [][]string) error {
	f, err := os.Create(path)
	if err != nil {
		return err
	}
	defer f.Close()

	w := csv.NewWriter(f)
	if err := w.Write(header); err != nil {
		return err
	}
	if err := w.WriteAll(rows); err != nil {
		return err
	}
	w.Flush()
	return w.Error()
}

// createZip bundles a list of files into a zip archive.
func createZip(zipPath string, fileNames []string, baseDir string) error {
	f, err := os.Create(zipPath)
	if err != nil {
		return err
	}
	defer f.Close()

	zw := zip.NewWriter(f)
	defer zw.Close()

	for _, name := range fileNames {
		fullPath := filepath.Join(baseDir, name)
		w, err := zw.Create(name)
		if err != nil {
			return err
		}
		data, err := os.ReadFile(fullPath)
		if err != nil {
			return err
		}
		if _, err := w.Write(data); err != nil {
			return err
		}
		// Remove the individual CSV after adding to zip
		_ = os.Remove(fullPath)
	}
	return nil
}
