package intelligence

import (
	"context"
	"log"
	"math"
	"strconv"
	"time"

	"Geospatial-harmuz-watch/server/internal/db"
	"Geospatial-harmuz-watch/server/internal/geo"

	"github.com/jackc/pgx/v5"
)

// GateLine defines a virtual gate for transit detection.
type GateLine struct {
	Name        string
	PointA      [2]float64 // (lat, lon)
	PointB      [2]float64 // (lat, lon)
	InboundSide string     // "left" or "right" — which side of A→B is the approach side
	Description string
}

// AIS speed sentinel: 102.3 knots = "not available" in AIS protocol (10-bit 0x3FF)
const (
	aisSpeedUnavailable = 102.3
	maxPositionJumpDeg  = 0.5
	maxTimeGapMinutes   = 30.0
	maxGateDistNM       = 30.0
	transitDedupHours   = 6
)

// GATES defines the three virtual gate lines for transit detection.
var GATES = []GateLine{
	{
		Name: "Strait of Hormuz",
		// A: Oman/Musandam side, B: Iran/Qeshm side
		PointA:      [2]float64{26.05, 56.50},
		PointB:      [2]float64{26.65, 56.10},
		InboundSide: "left", // east (Gulf of Oman) side = approach
		Description: "Main chokepoint — satellite AIS needed for full coverage",
	},
	{
		Name: "Dubai / Jebel Ali Approach",
		// A: south (offshore Abu Dhabi), B: north (offshore Sharjah)
		PointA:      [2]float64{25.00, 55.20},
		PointB:      [2]float64{25.35, 55.20},
		InboundSide: "left", // east (offshore) side approaching port
		Description: "Traffic entering/leaving Dubai & Jebel Ali ports",
	},
	{
		Name: "Fujairah Approach",
		// A: south, B: north
		PointA:      [2]float64{25.00, 56.50},
		PointB:      [2]float64{25.30, 56.50},
		InboundSide: "left", // east (Gulf of Oman offshore) side
		Description: "Fujairah anchorage & bunkering traffic",
	},
}

// GateCrossing represents a detected gate-line crossing event.
type GateCrossing struct {
	MMSI        int64
	GateName    string
	Direction   string
	CrossedAt   string
	Latitude    float64
	Longitude   float64
	Speed       float64
	ShipName    string
	ShipType    int
	Flag        string
	Destination string
}

// previousPosition holds the last known position of a vessel before a time window.
type previousPosition struct {
	Lat         float64
	Lon         float64
	Speed       float64
	ReceivedAt  string
	ShipName    string
	ShipType    int32
	Flag        string
	Destination string
}

// DetectGateCrossings checks if consecutive positions cross any gate line.
// Returns the number of new transit events detected.
func DetectGateCrossings(ctx context.Context) int {
	if db.PGX == nil {
		return 0
	}

	// Get last transit check time from analytics_state
	var lastCheck string
	err := db.PGX.QueryRow(ctx,
		`SELECT value FROM analytics_state WHERE key = 'last_transit_check'`,
	).Scan(&lastCheck)
	if err != nil {
		lastCheck = "2000-01-01T00:00:00Z"
	}

	nowISO := time.Now().UTC().Format(time.RFC3339)

	// Get all positions since last check, ordered by vessel and time
	rows, err := db.PGX.Query(ctx, `
		SELECT track_id, lat, lon, speed, observed_at::text, asset_name,
			   COALESCE(ship_type, 0) as ship_type, COALESCE(flag, '') as flag,
			   COALESCE(destination, '') as destination
		FROM telemetry_observations
		WHERE domain = 'vessel' AND observed_at > $1
		ORDER BY track_id, observed_at
	`, lastCheck)
	if err != nil {
		log.Printf("[gate] query positions: %v", err)
		return 0
	}
	defer rows.Close()

	type vesselPos struct {
		TrackID     string
		Lat         float64
		Lon         float64
		Speed       float64
		ReceivedAt  string
		ShipName    string
		ShipType    int32
		Flag        string
		Destination string
	}

	var allPositions []vesselPos
	for rows.Next() {
		var vp vesselPos
		if err := rows.Scan(&vp.TrackID, &vp.Lat, &vp.Lon, &vp.Speed, &vp.ReceivedAt,
			&vp.ShipName, &vp.ShipType, &vp.Flag, &vp.Destination); err != nil {
			continue
		}
		allPositions = append(allPositions, vp)
	}
	if len(allPositions) == 0 {
		return 0
	}

	// Collect unique track IDs
	trackSet := make(map[string]bool)
	for _, p := range allPositions {
		trackSet[p.TrackID] = true
	}

	// Fetch previous position for each track (before the window)
	prevPositions := make(map[string]previousPosition)
	for trackID := range trackSet {
		var prev previousPosition
		err := db.PGX.QueryRow(ctx, `
			SELECT lat, lon, speed, observed_at::text,
				   COALESCE(asset_name, ''), COALESCE(ship_type, 0),
				   COALESCE(flag, ''), COALESCE(destination, '')
			FROM telemetry_observations
			WHERE domain = 'vessel' AND track_id = $1 AND observed_at <= $2
			ORDER BY observed_at DESC LIMIT 1
		`, trackID, lastCheck).Scan(
			&prev.Lat, &prev.Lon, &prev.Speed, &prev.ReceivedAt,
			&prev.ShipName, &prev.ShipType, &prev.Flag, &prev.Destination,
		)
		if err == nil {
			prevPositions[trackID] = prev
		}
	}

	// Group positions by track_id (with prev position prepended)
	grouped := make(map[string][]vesselPos)
	for _, p := range allPositions {
		if _, ok := grouped[p.TrackID]; !ok {
			grouped[p.TrackID] = make([]vesselPos, 0)
			if prev, ok := prevPositions[p.TrackID]; ok {
				grouped[p.TrackID] = append(grouped[p.TrackID], vesselPos{
					TrackID:     p.TrackID,
					Lat:         prev.Lat,
					Lon:         prev.Lon,
					Speed:       prev.Speed,
					ReceivedAt:  prev.ReceivedAt,
					ShipName:    prev.ShipName,
					ShipType:    prev.ShipType,
					Flag:        prev.Flag,
					Destination: prev.Destination,
				})
			}
		}
		grouped[p.TrackID] = append(grouped[p.TrackID], p)
	}

	newEvents := 0

	for trackID, positions := range grouped {
		if len(positions) < 2 {
			continue
		}

		// Parse MMSI from track_id (AIS MMSIs are stored as string track_id)
		mmsi, _ := strconv.ParseInt(trackID, 10, 64)

		for i := 0; i < len(positions)-1; i++ {
			p1 := positions[i]
			p2 := positions[i+1]

			// Skip if speed is AIS unavailable sentinel
			if p1.Speed >= aisSpeedUnavailable || p2.Speed >= aisSpeedUnavailable {
				continue
			}

			// Skip position jumps > 0.5°
			if math.Abs(p2.Lat-p1.Lat) > maxPositionJumpDeg ||
				math.Abs(p2.Lon-p1.Lon) > maxPositionJumpDeg {
				continue
			}

			// Skip if time gap > 30 min
			t1, err1 := time.Parse(time.RFC3339, p1.ReceivedAt)
			t2, err2 := time.Parse(time.RFC3339, p2.ReceivedAt)
			if err1 == nil && err2 == nil {
				if t2.Sub(t1).Minutes() > maxTimeGapMinutes {
					continue
				}
			}

			// Check each gate
			for _, gate := range GATES {
				gateCenter := [2]float64{
					(gate.PointA[0] + gate.PointB[0]) / 2,
					(gate.PointA[1] + gate.PointB[1]) / 2,
				}

				// Pre-filter: both points within 30 NM of gate center
				d1 := geo.HaversineNM(p1.Lat, p1.Lon, gateCenter[0], gateCenter[1])
				d2 := geo.HaversineNM(p2.Lat, p2.Lon, gateCenter[0], gateCenter[1])
				if d1 > maxGateDistNM && d2 > maxGateDistNM {
					continue
				}

				// Check segment intersection
				if !segmentsIntersect(
					[2]float64{p1.Lat, p1.Lon},
					[2]float64{p2.Lat, p2.Lon},
					gate.PointA,
					gate.PointB,
				) {
					continue
				}

				direction := determineDirection(
					[2]float64{p1.Lat, p1.Lon},
					[2]float64{p2.Lat, p2.Lon},
					gate.PointA,
					gate.PointB,
					gate.InboundSide,
				)
				if direction == "UNKNOWN" {
					continue
				}

				// Deduplicate: same MMSI + same gate in last 6 hours
				if mmsi > 0 {
					var existingCount int
					err = db.PGX.QueryRow(ctx, `
						SELECT COUNT(*) FROM transit_events
						WHERE mmsi = $1 AND gate_name = $2
						  AND crossed_at > $3::timestamptz - INTERVAL '6 hours'
					`, mmsi, gate.Name, p2.ReceivedAt).Scan(&existingCount)
					if err == nil && existingCount > 0 {
						continue
					}
				}

				crossLat := (p1.Lat + p2.Lat) / 2
				crossLon := (p1.Lon + p2.Lon) / 2
				crossSpeed := p2.Speed
				if crossSpeed == 0 {
					crossSpeed = p1.Speed
				}

				_, err = db.PGX.Exec(ctx, `
					INSERT INTO transit_events
					(mmsi, gate_name, direction, crossed_at, latitude,
					 longitude, speed, ship_name, ship_type, flag, destination)
					VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
				`, mmsi, gate.Name, direction, p2.ReceivedAt,
					crossLat, crossLon, crossSpeed,
					p2.ShipName, p2.ShipType, p2.Flag, p2.Destination)
				if err != nil {
					log.Printf("[gate] insert transit: %v", err)
					continue
				}
				newEvents++
				log.Printf("[gate] Transit [%s]: %s %s at %s (%.1f kn)",
					gate.Name, trackID, direction, p2.ReceivedAt, crossSpeed)
			}
		}
	}

	// Update last transit check time
	_, err = db.PGX.Exec(ctx, `
		INSERT INTO analytics_state (key, value, updated_at)
		VALUES ('last_transit_check', $1, NOW())
		ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()
	`, nowISO)
	if err != nil {
		log.Printf("[gate] update last_check: %v", err)
	}

	return newEvents
}

// segmentsIntersect checks if line segment p1-p2 intersects p3-p4.
func segmentsIntersect(p1, p2, p3, p4 [2]float64) bool {
	d1 := crossProduct2D(p3, p4, p1)
	d2 := crossProduct2D(p3, p4, p2)
	d3 := crossProduct2D(p1, p2, p3)
	d4 := crossProduct2D(p1, p2, p4)

	return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
		((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))
}

// crossProduct2D of vectors OA and OB. Positive = counter-clockwise.
func crossProduct2D(o, a, b [2]float64) float64 {
	return (a[0]-o[0])*(b[1]-o[1]) - (a[1]-o[1])*(b[0]-o[0])
}

// determineDirection determines if a crossing is INBOUND or OUTBOUND
// using cross product relative to the gate vector (A→B).
func determineDirection(p1, p2, gateA, gateB [2]float64, inboundSide string) string {
	side1 := crossProduct2D(gateA, gateB, p1)
	side2 := crossProduct2D(gateA, gateB, p2)

	if inboundSide == "left" {
		// left (positive) = outside/approach side → moving left→right = INBOUND
		if side1 > 0 && side2 < 0 {
			return "INBOUND"
		} else if side1 < 0 && side2 > 0 {
			return "OUTBOUND"
		}
	} else {
		// right (negative) = outside/approach side
		if side1 < 0 && side2 > 0 {
			return "INBOUND"
		} else if side1 > 0 && side2 < 0 {
			return "OUTBOUND"
		}
	}
	return "UNKNOWN"
}

// StartTransitDetectionLoop runs periodic transit detection as a background goroutine.
func StartTransitDetectionLoop(ctx context.Context, intervalSec int) {
	if db.PGX == nil {
		log.Println("[gate] Database not initialized; transit detection disabled")
		return
	}

	// Run initial detection on startup
	go func() {
		n := DetectGateCrossings(ctx)
		if n > 0 {
			log.Printf("[gate] Initial transit scan complete: %d events", n)
		}
	}()

	ticker := time.NewTicker(time.Duration(intervalSec) * time.Second)
	go func() {
		for {
			select {
			case <-ctx.Done():
				ticker.Stop()
				return
			case <-ticker.C:
				n := DetectGateCrossings(ctx)
				if n > 0 {
					log.Printf("[gate] Periodic scan: %d new transits detected", n)
				}
			}
		}
	}()
}

// ActiveTrackWithTransit enriches active track data with transit info.
func ActiveTrackWithTransit(ctx context.Context) ([]map[string]interface{}, error) {
	if db.PGX == nil {
		return nil, nil
	}

	rows, err := db.PGX.Query(ctx, `
		SELECT t.track_id, t.asset_name, t.lat, t.lon, t.speed,
			   COALESCE(t.heading, 0) as heading,
			   COALESCE(a.score, 0) as score,
			   COALESCE(a.severity, 'low') as severity,
			   t.last_updated,
			   t.object_type,
			   (SELECT COUNT(*) FROM transit_events te
			    WHERE te.mmsi::text = t.track_id
			      AND te.crossed_at > NOW() - INTERVAL '24 hours') as transit_count
		FROM tracks t
		LEFT JOIN anomalies a ON t.track_id = a.track_id
		WHERE t.last_updated > NOW() - INTERVAL '24 hours'
		ORDER BY t.last_updated DESC
		LIMIT 500
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []map[string]interface{}
	for rows.Next() {
		var trackID, assetName, severity, objectType string
		var lat, lon, speed, heading, score float64
		var lastUpdated time.Time
		var transitCount int

		if err := rows.Scan(&trackID, &assetName, &lat, &lon, &speed,
			&heading, &score, &severity, &lastUpdated, &objectType,
			&transitCount); err != nil {
			continue
		}

		result = append(result, map[string]interface{}{
			"trackId":      trackID,
			"assetName":    assetName,
			"lat":          lat,
			"lon":          lon,
			"speed":        speed,
			"heading":      heading,
			"anomalyScore": int(score),
			"severity":     severity,
			"lastUpdated":  lastUpdated.Format(time.RFC3339),
			"objectType":   objectType,
			"transitCount": transitCount,
		})
	}
	return result, nil
}

// ensure pgx import retained
var _ = pgx.QueryExecModeSimpleProtocol
