package api

import (
	"context"
	"log"
	"net/http"
	"strconv"
	"time"

	"Geospatial-harmuz-watch/server/internal/anomaly"
	"Geospatial-harmuz-watch/server/internal/db"
	"Geospatial-harmuz-watch/server/internal/intelligence"

	"github.com/gin-gonic/gin"
)

// ── Transit Analytics ─────────────────────────────────────────────────────

// GetTransits returns transit event summary for the last N hours.
func GetTransits(c *gin.Context) {
	hours, _ := strconv.Atoi(c.DefaultQuery("hours", "24"))
	gate := c.Query("gate")

	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	if db.PGX == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "database not available"})
		return
	}

	// Build query
	gateFilter := ""
	params := []interface{}{hours}
	if gate != "" {
		gateFilter = "AND gate_name = $2"
		params = append(params, gate)
	}

	var inbound, outbound int
	_ = db.PGX.QueryRow(ctx,
		`SELECT COUNT(*) FROM transit_events
		 WHERE direction = 'INBOUND'
		   AND crossed_at > NOW() - ($1 || ' hours')::INTERVAL `+gateFilter,
		params...,
	).Scan(&inbound)

	_ = db.PGX.QueryRow(ctx,
		`SELECT COUNT(*) FROM transit_events
		 WHERE direction = 'OUTBOUND'
		   AND crossed_at > NOW() - ($1 || ' hours')::INTERVAL `+gateFilter,
		params...,
	).Scan(&outbound)

	// Per-gate breakdown
	gateRows, err := db.PGX.Query(ctx, `
		SELECT gate_name, direction, COUNT(*) as cnt
		FROM transit_events
		WHERE crossed_at > NOW() - ($1 || ' hours')::INTERVAL
		GROUP BY gate_name, direction
		ORDER BY gate_name
	`, hours)
	byGate := make(map[string]map[string]int)
	if err == nil {
		defer gateRows.Close()
		for gateRows.Next() {
			var gn, dir string
			var cnt int
			if gateRows.Scan(&gn, &dir, &cnt) == nil {
				if byGate[gn] == nil {
					byGate[gn] = map[string]int{"inbound": 0, "outbound": 0}
				}
				if dir == "INBOUND" {
					byGate[gn]["inbound"] = cnt
				} else {
					byGate[gn]["outbound"] = cnt
				}
			}
		}
	}

	// Recent events
	recentRows, err := db.PGX.Query(ctx, `
		SELECT mmsi, gate_name, direction, crossed_at, speed,
			   ship_name, ship_type, flag, destination
		FROM transit_events
		WHERE crossed_at > NOW() - ($1 || ' hours')::INTERVAL `+gateFilter+`
		ORDER BY crossed_at DESC
		LIMIT 20
	`, params...)
	var recentEvents []map[string]interface{}
	if err == nil {
		defer recentRows.Close()
		for recentRows.Next() {
			var mmsi int64
			var gn, dir, crossedAt, shipName, flag, dest string
			var speed float64
			var shipType int32
			if recentRows.Scan(&mmsi, &gn, &dir, &crossedAt, &speed,
				&shipName, &shipType, &flag, &dest) == nil {
				recentEvents = append(recentEvents, map[string]interface{}{
					"mmsi":        mmsi,
					"gate":        gn,
					"direction":   dir,
					"crossed_at":  crossedAt,
					"speed":       speed,
					"ship_name":   shipName,
					"ship_type":   intelligence.GetShipTypeLabel(shipType),
					"flag":        flag,
					"destination": dest,
				})
			}
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"hours":        hours,
		"gate_filter":  gate,
		"inbound":      inbound,
		"outbound":     outbound,
		"by_gate":      byGate,
		"recent_events": recentEvents,
	})
}

// GetHourlyTransits returns transit counts bucketed by hour for charting.
func GetHourlyTransits(c *gin.Context) {
	hours, _ := strconv.Atoi(c.DefaultQuery("hours", "48"))
	gate := c.Query("gate")

	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	if db.PGX == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "database not available"})
		return
	}

	gateFilter := ""
	params := []interface{}{hours}
	if gate != "" {
		gateFilter = "AND gate_name = $2"
		params = append(params, gate)
	}

	rows, err := db.PGX.Query(ctx, `
		SELECT to_char(crossed_at, 'YYYY-MM-DD"T"HH24:00:00') as hour,
			   direction, COUNT(*) as cnt
		FROM transit_events
		WHERE crossed_at > NOW() - ($1 || ' hours')::INTERVAL `+gateFilter+`
		GROUP BY hour, direction
		ORDER BY hour
	`, params...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	result := make(map[string]map[string]interface{})
	for rows.Next() {
		var hour, dir string
		var cnt int
		if rows.Scan(&hour, &dir, &cnt) != nil {
			continue
		}
		if result[hour] == nil {
			result[hour] = map[string]interface{}{"hour": hour, "inbound": 0, "outbound": 0}
		}
		if dir == "INBOUND" {
			result[hour]["inbound"] = cnt
		} else {
			result[hour]["outbound"] = cnt
		}
	}

	// Sort by hour
	var data []map[string]interface{}
	for _, v := range result {
		data = append(data, v)
	}
	// Simple bubble sort by hour string (lexicographic = chronological for ISO format)
	for i := 0; i < len(data); i++ {
		for j := i + 1; j < len(data); j++ {
			if data[i]["hour"].(string) > data[j]["hour"].(string) {
				data[i], data[j] = data[j], data[i]
			}
		}
	}

	c.JSON(http.StatusOK, gin.H{"hours": hours, "data": data})
}

// ── Vessel State Analytics ────────────────────────────────────────────────

// GetVesselStates returns current vessel state classification.
func GetVesselStates(c *gin.Context) {
	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	if db.PGX == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "database not available"})
		return
	}

	rows, err := db.PGX.Query(ctx, `
		SELECT t.track_id, t.lat, t.lon, t.speed, t.asset_name
		FROM tracks t
		WHERE t.last_updated > NOW() - INTERVAL '30 minutes'
		ORDER BY t.last_updated DESC
	`)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	states := map[string]int{"anchored": 0, "slow": 0, "maneuvering": 0, "transiting": 0, "unknown": 0}
	zoneCounts := make(map[string]int)
	type vesselInfo struct {
		MMSI  string  `json:"mmsi"`
		Lat   float64 `json:"lat"`
		Lon   float64 `json:"lon"`
		Speed float64 `json:"speed"`
		Name  string  `json:"name"`
	}
	vesselsByState := map[string][]vesselInfo{
		"anchored": {}, "slow": {}, "maneuvering": {}, "transiting": {}, "unknown": {},
	}

	for rows.Next() {
		var trackID, assetName string
		var lat, lon, speed float64
		if rows.Scan(&trackID, &lat, &lon, &speed, &assetName) != nil {
			continue
		}

		state := intelligence.ClassifyVesselState(speed)
		states[state]++
		vesselsByState[state] = append(vesselsByState[state], vesselInfo{
			MMSI: trackID, Lat: lat, Lon: lon, Speed: speed, Name: assetName,
		})

		if state == "anchored" || state == "slow" {
			zone := anomaly.IdentifyAnchorageZone(lat, lon)
			if zone != "" {
				zoneCounts[zone]++
			}
		}
	}

	total := 0
	for _, cnt := range states {
		total += cnt
	}

	c.JSON(http.StatusOK, gin.H{
		"states":              states,
		"total":               total,
		"zone_counts":         zoneCounts,
		"vessels_by_state":    vesselsByState,
	})
}

// ── Blockade Analytics ────────────────────────────────────────────────────

// GetBlockadeIndicators returns waiting fleet, anchored ratio, and strait status.
func GetBlockadeIndicators(c *gin.Context) {
	ctx, cancel := context.WithTimeout(c.Request.Context(), 15*time.Second)
	defer cancel()

	indicators := intelligence.GetBlockadeIndicators(ctx)
	c.JSON(http.StatusOK, indicators)
}

// ── Flag & Destination Distribution ────────────────────────────────────────

// GetFlagDistribution returns vessel flag state distribution.
func GetFlagDistribution(c *gin.Context) {
	hours, _ := strconv.Atoi(c.DefaultQuery("hours", "24"))

	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	if db.PGX == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "database not available"})
		return
	}

	rows, err := db.PGX.Query(ctx, `
		SELECT COALESCE(flag, 'Unknown') as flag,
			   COUNT(DISTINCT track_id) as vessels
		FROM telemetry_observations
		WHERE domain = 'vessel'
		  AND observed_at > NOW() - ($1 || ' hours')::INTERVAL
		  AND flag IS NOT NULL AND flag != ''
		GROUP BY flag
		ORDER BY vessels DESC
		LIMIT 20
	`, hours)
	if err != nil {
		log.Printf("[analytics] flag distribution: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	var data []map[string]interface{}
	for rows.Next() {
		var flag string
		var vessels int
		if rows.Scan(&flag, &vessels) == nil {
			data = append(data, map[string]interface{}{
				"flag":         flag,
				"vessels":      vessels,
				"display_name": intelligence.FlagName(flag),
			})
		}
	}

	c.JSON(http.StatusOK, gin.H{"hours": hours, "data": data})
}

// GetDestinationDistribution returns destination distribution.
func GetDestinationDistribution(c *gin.Context) {
	hours, _ := strconv.Atoi(c.DefaultQuery("hours", "24"))

	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	if db.PGX == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "database not available"})
		return
	}

	rows, err := db.PGX.Query(ctx, `
		SELECT COALESCE(destination, 'Unknown') as dest,
			   COUNT(DISTINCT track_id) as vessels
		FROM telemetry_observations
		WHERE domain = 'vessel'
		  AND observed_at > NOW() - ($1 || ' hours')::INTERVAL
		  AND destination IS NOT NULL AND destination != ''
		GROUP BY destination
		ORDER BY vessels DESC
		LIMIT 20
	`, hours)
	if err != nil {
		log.Printf("[analytics] destination distribution: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	var data []map[string]interface{}
	for rows.Next() {
		var dest string
		var vessels int
		if rows.Scan(&dest, &vessels) == nil {
			data = append(data, map[string]interface{}{
				"destination":      dest,
				"vessels":          vessels,
				"normalized":       intelligence.NormalizeDestination(dest),
				"region":           intelligence.GetDestinationRegion(intelligence.NormalizeDestination(dest)),
			})
		}
	}

	c.JSON(http.StatusOK, gin.H{"hours": hours, "data": data})
}

// ── Gate Info (GeoJSON-style) ─────────────────────────────────────────────

// GetGateInfo returns all gate lines, anchorage zones, danger zone, and crisis timeline.
func GetGateInfo(c *gin.Context) {
	type gateJSON struct {
		A           map[string]float64 `json:"a"`
		B           map[string]float64 `json:"b"`
		Description string             `json:"description"`
	}
	gates := make(map[string]gateJSON)
	for _, g := range intelligence.GATES {
		gates[g.Name] = gateJSON{
			A:           map[string]float64{"lat": g.PointA[0], "lon": g.PointA[1]},
			B:           map[string]float64{"lat": g.PointB[0], "lon": g.PointB[1]},
			Description: g.Description,
		}
	}

	type zoneJSON struct {
		Lat      float64 `json:"lat"`
		Lon      float64 `json:"lon"`
		RadiusNM float64 `json:"radius_nm"`
	}
	zones := make(map[string]zoneJSON)
	for _, z := range anomaly.GetAnchorageZones() {
		zones[z.Name] = zoneJSON{Lat: z.Lat, Lon: z.Lon, RadiusNM: z.RadiusNM}
	}

	// Also include restricted zones
	type restrictedJSON struct {
		Name string  `json:"name"`
		Lat  float64 `json:"lat"`
		Lon  float64 `json:"lon"`
		Rad  float64 `json:"radius_deg"`
	}
	var restricted []restrictedJSON
	for _, rz := range anomaly.GetRestrictedZones() {
		restricted = append(restricted, restrictedJSON{
			Name: rz.Name, Lat: rz.CenterLat, Lon: rz.CenterLon, Rad: rz.RadiusDeg,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"gates":            gates,
		"anchorage_zones":  zones,
		"restricted_zones": restricted,
		"crisis_timeline":  getCrisisTimeline(),
	})
}

// ── Data Quality ───────────────────────────────────────────────────────────

// GetDataQuality returns AIS data anomaly counts.
func GetDataQuality(c *gin.Context) {
	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	if db.PGX == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "database not available"})
		return
	}

	var total, speedUnavailable, speedSuspicious int

	// Total positions
	_ = db.PGX.QueryRow(ctx,
		"SELECT COUNT(*) FROM telemetry_observations WHERE domain = 'vessel'",
	).Scan(&total)

	// Speed unavailable (>= 102.0)
	_ = db.PGX.QueryRow(ctx,
		"SELECT COUNT(*) FROM telemetry_observations WHERE domain = 'vessel' AND speed >= 102.0",
	).Scan(&speedUnavailable)

	// Speed suspicious (40-102)
	_ = db.PGX.QueryRow(ctx,
		"SELECT COUNT(*) FROM telemetry_observations WHERE domain = 'vessel' AND speed >= 40.0 AND speed < 102.0",
	).Scan(&speedSuspicious)

	clean := total - speedUnavailable - speedSuspicious
	cleanPct := 0.0
	if total > 0 {
		cleanPct = float64(clean) / float64(total) * 100
	}

	c.JSON(http.StatusOK, gin.H{
		"total_positions":   total,
		"clean_positions":   clean,
		"clean_percentage":  round(cleanPct, 1),
		"anomalies": gin.H{
			"speed_unavailable": gin.H{
				"count":       speedUnavailable,
				"description": "AIS speed = 102.3 kn (protocol sentinel for 'not available')",
			},
			"speed_suspicious": gin.H{
				"count":       speedSuspicious,
				"description": "Speed 40-102 kn, likely AIS receiver glitch or signal mixup",
			},
		},
		"notes": []string{
			"AIS is a self-reporting system — vessels control what they broadcast",
			"Terrestrial AIS receivers cannot cover mid-strait (30+ NM offshore)",
			"Speed = 102.3 kn is the AIS protocol 'not available' value (0x3FF in 10-bit field)",
		},
	})
}

// ── Daily Summary ─────────────────────────────────────────────────────────

// GetDailySummary generates a comprehensive daily summary.
func GetDailySummary(c *gin.Context) {
	ctx, cancel := context.WithTimeout(c.Request.Context(), 15*time.Second)
	defer cancel()

	indicators := intelligence.GetBlockadeIndicators(ctx)

	var totalRecords, records24H, unique24H int
	if db.PGX != nil {
		_ = db.PGX.QueryRow(ctx,
			"SELECT COUNT(*) FROM telemetry_observations WHERE domain = 'vessel'",
		).Scan(&totalRecords)
		_ = db.PGX.QueryRow(ctx,
			"SELECT COUNT(*) FROM telemetry_observations WHERE domain = 'vessel' AND observed_at > NOW() - INTERVAL '24 hours'",
		).Scan(&records24H)
		_ = db.PGX.QueryRow(ctx,
			"SELECT COUNT(DISTINCT track_id) FROM telemetry_observations WHERE domain = 'vessel' AND observed_at > NOW() - INTERVAL '24 hours'",
		).Scan(&unique24H)
	}

	c.JSON(http.StatusOK, gin.H{
		"generated_at":       time.Now().UTC().Format(time.RFC3339),
		"total_records":      totalRecords,
		"records_24h":        records24H,
		"unique_vessels_24h": unique24H,
		"transits_24h": gin.H{
			"inbound":  indicators.StraitTransits24H,
			"total":    indicators.StraitTransits24H,
		},
		"vessel_states":    indicators,
		"strait_status":    indicators.StraitStatus,
		"situation":        indicators.Situation,
	})
}

// ── Transit Ship Details ──────────────────────────────────────────────────

// GetTransitShips returns detailed list of ships that crossed gate lines.
func GetTransitShips(c *gin.Context) {
	hours, _ := strconv.Atoi(c.DefaultQuery("hours", "0"))
	gate := c.Query("gate")

	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
	defer cancel()

	if db.PGX == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "database not available"})
		return
	}

	query := `
		SELECT t.mmsi, t.gate_name, t.direction, t.crossed_at,
			   t.speed, t.ship_name, t.ship_type, t.flag, t.destination,
			   t.latitude, t.longitude
		FROM transit_events t
	`
	var conditions []string
	params := []interface{}{}
	paramIdx := 1

	if hours > 0 {
		conditions = append(conditions, "t.crossed_at > NOW() - ($1 || ' hours')::INTERVAL")
		params = append(params, hours)
		paramIdx++
	}
	if gate != "" {
		conditions = append(conditions, "t.gate_name = $"+strconv.Itoa(paramIdx))
		params = append(params, gate)
	}

	for i, cond := range conditions {
		if i == 0 {
			query += " WHERE " + cond
		} else {
			query += " AND " + cond
		}
	}
	query += " ORDER BY t.crossed_at DESC"

	rows, err := db.PGX.Query(ctx, query, params...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	var ships []map[string]interface{}
	for rows.Next() {
		var mmsi int64
		var gateName, dir, crossedAt, shipName, flag, dest string
		var speed, lat, lon float64
		var shipType int32
		if rows.Scan(&mmsi, &gateName, &dir, &crossedAt, &speed,
			&shipName, &shipType, &flag, &dest, &lat, &lon) != nil {
			continue
		}
		ships = append(ships, map[string]interface{}{
			"mmsi":        mmsi,
			"name":        shipName,
			"type":        intelligence.GetShipTypeLabel(shipType),
			"type_code":   shipType,
			"flag":        flag,
			"destination": dest,
			"gate":        gateName,
			"direction":   dir,
			"crossed_at":  crossedAt,
			"speed_kn":    speed,
			"lat":         lat,
			"lon":         lon,
		})
	}

	// Summary
	uniqueShips := make(map[int64]bool)
	byGate := make(map[string]int)
	byFlag := make(map[string]int)
	for _, s := range ships {
		uniqueShips[s["mmsi"].(int64)] = true
		byGate[s["gate"].(string)]++
		if f, ok := s["flag"].(string); ok && f != "" {
			byFlag[f]++
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"ships": ships,
		"summary": gin.H{
			"total_transits": len(ships),
			"unique_ships":   len(uniqueShips),
			"by_gate":        byGate,
			"by_flag":        byFlag,
		},
	})
}

// ── Helpers ────────────────────────────────────────────────────────────────

func round(val float64, precision int) float64 {
	pow := 1.0
	for i := 0; i < precision; i++ {
		pow *= 10
	}
	return float64(int(val*pow+0.5)) / pow
}

// getCrisisTimeline returns key events in the Strait of Hormuz crisis.
func getCrisisTimeline() []map[string]string {
	return []map[string]string{
		{"date": "2026-02-28", "event": "US-Israel strikes on Iran", "severity": "critical"},
		{"date": "2026-03-01", "event": "Iran retaliatory missile/drone strikes", "severity": "critical"},
		{"date": "2026-03-04", "event": "IRGC declares Strait closed, attacks on ships", "severity": "critical"},
		{"date": "2026-03-05", "event": "Iran: closed to US/Israel/Western allies only", "severity": "high"},
		{"date": "2026-03-07", "event": "Kuwait declares force majeure, cuts production", "severity": "high"},
		{"date": "2026-03-12", "event": "US admits escort readiness lacking", "severity": "medium"},
		{"date": "2026-03-13", "event": "Limited passages: Turkey, India, Saudi allowed", "severity": "medium"},
		{"date": "2026-03-13", "event": "US attacks Kharg Island oil facilities", "severity": "critical"},
	}
}
