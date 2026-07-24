package intelligence

import (
	"context"
	"fmt"
	"math"

	"Geospatial-harmuz-watch/server/internal/db"
)

// ── Blockade / Waiting Fleet Detection ────────────────────────────────────
//
// Mirrors the SQL-based blockade indicators from hormuz-ship-tracker's
// analytics.py. Queries the telemetry_observations table to detect vessels
// that have been stationary for extended periods, and assesses the Strait
// of Hormuz transit situation.
//
// Source: hormuz-ship-tracker/src/analytics.py:get_blockade_indicators()

// BlockadeIndicators holds all computed blockade impact metrics.
type BlockadeIndicators struct {
	ActiveVessels     int                 `json:"active_vessels"`
	AnchoredVessels   int                 `json:"anchored_vessels"`
	AnchoredRatioPct  float64             `json:"anchored_ratio_pct"`
	WaitingFleet6H    int                 `json:"waiting_fleet_6h"`
	WaitingFleet24H   int                 `json:"waiting_fleet_24h"`
	StraitTransits24H int                 `json:"strait_transits_24h"`
	StraitStatus      string              `json:"strait_status"` // NO_TRANSIT, LIMITED, ACTIVE
	Situation         SituationAssessment `json:"situation"`
	FleetByType       []TypeCount         `json:"fleet_by_type"`
	FleetByFlag       []FlagCount         `json:"fleet_by_flag"`
}

// SituationAssessment is a data-driven situational report.
type SituationAssessment struct {
	Level string `json:"level"` // normal, elevated, high, critical
	Title string `json:"title"`
	Text  string `json:"text"`
}

// TypeCount holds a count by ship type.
type TypeCount struct {
	Type  string `json:"type"`
	Count int    `json:"count"`
}

// FlagCount holds a count by flag state.
type FlagCount struct {
	Flag  string `json:"flag"`
	Count int    `json:"count"`
}

// GetBlockadeIndicators computes blockade impact metrics from the database.
func GetBlockadeIndicators(ctx context.Context) BlockadeIndicators {
	result := BlockadeIndicators{}

	if db.PGX == nil {
		return result
	}

	// Active vessels (last 30 min) — using tracks table
	_ = db.PGX.QueryRow(ctx,
		"SELECT COUNT(*) FROM tracks WHERE last_updated > NOW() - INTERVAL '30 minutes'",
	).Scan(&result.ActiveVessels)

	// Anchored vessels (speed < 0.5 kn, excluding AIS unavailable)
	_ = db.PGX.QueryRow(ctx, `
		SELECT COUNT(*) FROM tracks
		WHERE last_updated > NOW() - INTERVAL '30 minutes'
		  AND speed IS NOT NULL AND speed < 0.5 AND speed < 102.0
	`).Scan(&result.AnchoredVessels)

	// Anchored ratio
	if result.ActiveVessels > 0 {
		result.AnchoredRatioPct = math.Round(float64(result.AnchoredVessels)/
			float64(result.ActiveVessels)*1000) / 10
	}

	// Waiting fleet 6h+ (max speed < 1 kn over last 6h, min 3 positions)
	_ = db.PGX.QueryRow(ctx, `
		SELECT COUNT(*) FROM (
			SELECT track_id FROM telemetry_observations
			WHERE domain = 'vessel'
			  AND observed_at > NOW() - INTERVAL '6 hours'
			GROUP BY track_id
			HAVING MAX(CASE WHEN speed >= 102.0 THEN 0 ELSE COALESCE(speed, 0) END) < 1.0
			   AND COUNT(*) >= 3
		) sub
	`).Scan(&result.WaitingFleet6H)

	// Waiting fleet 24h+
	_ = db.PGX.QueryRow(ctx, `
		SELECT COUNT(*) FROM (
			SELECT track_id FROM telemetry_observations
			WHERE domain = 'vessel'
			  AND observed_at > NOW() - INTERVAL '24 hours'
			GROUP BY track_id
			HAVING MAX(CASE WHEN speed >= 102.0 THEN 0 ELSE COALESCE(speed, 0) END) < 1.0
			   AND COUNT(*) >= 10
		) sub
	`).Scan(&result.WaitingFleet24H)

	// Strait transits in last 24h
	_ = db.PGX.QueryRow(ctx, `
		SELECT COUNT(*) FROM transit_events
		WHERE gate_name = 'Strait of Hormuz'
		  AND crossed_at > NOW() - INTERVAL '24 hours'
	`).Scan(&result.StraitTransits24H)

	// Strait status
	switch {
	case result.StraitTransits24H == 0:
		result.StraitStatus = "NO_TRANSIT"
	case result.StraitTransits24H <= 5:
		result.StraitStatus = "LIMITED"
	default:
		result.StraitStatus = "ACTIVE"
	}

	// Fleet by type (waiting 6h+)
	typeRows, err := db.PGX.Query(ctx, `
		SELECT COALESCE(ship_type, 0) as st, COUNT(*) as cnt FROM (
			SELECT track_id, MAX(ship_type) as ship_type FROM telemetry_observations
			WHERE domain = 'vessel'
			  AND observed_at > NOW() - INTERVAL '6 hours'
			GROUP BY track_id
			HAVING MAX(CASE WHEN speed >= 102.0 THEN 0 ELSE COALESCE(speed, 0) END) < 1.0
			   AND COUNT(*) >= 3
		) sub GROUP BY ship_type ORDER BY cnt DESC
	`)
	if err == nil {
		defer typeRows.Close()
		for typeRows.Next() {
			var st int32
			var cnt int
			if err := typeRows.Scan(&st, &cnt); err == nil {
				result.FleetByType = append(result.FleetByType, TypeCount{
					Type:  shipTypeLabel(st),
					Count: cnt,
				})
			}
		}
	}

	// Fleet by flag (waiting 6h+)
	flagRows, err := db.PGX.Query(ctx, `
		SELECT COALESCE(flag, '') as fg, COUNT(*) as cnt FROM (
			SELECT track_id, MAX(flag) as flag FROM telemetry_observations
			WHERE domain = 'vessel'
			  AND observed_at > NOW() - INTERVAL '6 hours'
			  AND flag IS NOT NULL AND flag != ''
			GROUP BY track_id
			HAVING MAX(CASE WHEN speed >= 102.0 THEN 0 ELSE COALESCE(speed, 0) END) < 1.0
			   AND COUNT(*) >= 3
		) sub GROUP BY flag ORDER BY cnt DESC LIMIT 15
	`)
	if err == nil {
		defer flagRows.Close()
		for flagRows.Next() {
			var fg string
			var cnt int
			if err := flagRows.Scan(&fg, &cnt); err == nil {
				result.FleetByFlag = append(result.FleetByFlag, FlagCount{
					Flag:  fg,
					Count: cnt,
				})
			}
		}
	}

	// Generate situation assessment
	result.Situation = assessSituation(
		result.StraitTransits24H,
		result.AnchoredRatioPct,
		result.WaitingFleet6H,
		result.ActiveVessels,
	)

	return result
}

// assessSituation generates a data-driven situation assessment.
func assessSituation(straitTransits int, anchoredPct float64, waiting6H int, active int) SituationAssessment {
	if straitTransits == 0 && anchoredPct > 40 {
		return SituationAssessment{
			Level: "critical",
			Title: "Strait Transit Suspended",
			Text: fmt.Sprintf(
				"No vessel transits detected through the Strait of Hormuz in the last 24 hours. "+
					"%.0f%% of %d monitored vessels are stationary. "+
					"%d vessels have been waiting 6+ hours. "+
					"This pattern indicates a significant disruption to normal shipping activity.",
				anchoredPct, active, waiting6H,
			),
		}
	}
	if straitTransits == 0 && anchoredPct > 20 {
		return SituationAssessment{
			Level: "high",
			Title: "No Strait Transit Detected",
			Text: fmt.Sprintf(
				"Zero strait crossings in 24h with %.0f%% of vessels anchored. "+
					"Note: terrestrial AIS coverage in the open strait is limited — "+
					"satellite AIS data would provide a more complete picture.",
				anchoredPct,
			),
		}
	}
	if straitTransits > 0 && straitTransits <= 5 {
		return SituationAssessment{
			Level: "elevated",
			Title: "Limited Strait Transit",
			Text: fmt.Sprintf(
				"Only %d vessel(s) detected crossing the Strait in 24h. "+
					"Normal traffic volume is significantly higher. "+
					"%d vessels waiting 6+ hours.",
				straitTransits, waiting6H,
			),
		}
	}
	if straitTransits > 5 && anchoredPct > 40 {
		return SituationAssessment{
			Level: "elevated",
			Title: "High Anchorage Congestion",
			Text: fmt.Sprintf(
				"%d strait transits detected, but %.0f%% of vessels are anchored — "+
					"higher than typical. Possible delays or congestion.",
				straitTransits, anchoredPct,
			),
		}
	}
	return SituationAssessment{
		Level: "normal",
		Title: "Monitoring Active",
		Text: fmt.Sprintf(
			"Tracking %d vessels across the Persian Gulf region. "+
				"%d strait transits in 24h. Anchored ratio: %.0f%%.",
			active, straitTransits, anchoredPct,
		),
	}
}

// ── AIS Ship Type Labels ──────────────────────────────────────────────────

func shipTypeLabel(code int32) string {
	switch {
	case code >= 20 && code < 30:
		return "WIG"
	case code >= 30 && code < 36:
		return "Fishing/Towing/Dredging"
	case code >= 36 && code < 40:
		return "Military/Sailing/Pleasure"
	case code >= 40 && code < 50:
		return "HSC"
	case code >= 60 && code < 70:
		return "Passenger"
	case code >= 70 && code < 80:
		return "Cargo"
	case code >= 80 && code < 90:
		return "Tanker"
	case code >= 90 && code < 100:
		return "Other"
	default:
		return "Unknown"
	}
}

// GetShipTypeLabel is the public accessor for ship type classification.
func GetShipTypeLabel(code int32) string {
	return shipTypeLabel(code)
}

// ── Vessel State Classification ───────────────────────────────────────────

const (
	SpeedAnchored    = 0.5
	SpeedSlow        = 3.0
	SpeedManeuvering = 8.0
)

// ClassifyVesselState returns the operational state based on speed.
func ClassifyVesselState(speed float64) string {
	if speed < SpeedAnchored {
		return "anchored"
	}
	if speed < SpeedSlow {
		return "slow"
	}
	if speed < SpeedManeuvering {
		return "maneuvering"
	}
	return "transiting"
}
