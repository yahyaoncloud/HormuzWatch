package api

import (
	"net/http"
	"strconv"
	"time"

	"Geospatial-harmuz-watch/server/internal/integrations/ais"

	"github.com/gin-gonic/gin"
)

// GetAISHealth returns operational telemetry and service health metrics for the AIS Stream integration.
// GET /public/ais/status
func GetAISHealth(c *gin.Context) {
	if ais.GlobalAISClient == nil {
		c.JSON(http.StatusOK, gin.H{
			"status":             "uninitialized",
			"isConnected":        false,
			"activeVesselsCount": ais.GlobalVesselCache.Count(),
			"timestamp":          time.Now().UTC().Format(time.RFC3339),
		})
		return
	}

	health := ais.GlobalAISClient.GetHealth()
	c.JSON(http.StatusOK, health)
}

// GetAISVessels returns all active vessels currently monitored in the Gulf theater.
// GET /public/vessels
func GetAISVessels(c *gin.Context) {
	vessels := ais.GlobalVesselCache.GetAllActiveVessels()
	c.JSON(http.StatusOK, gin.H{
		"type":      "vessels",
		"count":     len(vessels),
		"data":      vessels,
		"timestamp": time.Now().UTC().Format(time.RFC3339),
	})
}

// GetAISVesselByMMSI returns detailed state for a single vessel.
// GET /public/vessels/:mmsi
func GetAISVesselByMMSI(c *gin.Context) {
	mmsi := c.Param("mmsi")
	v, exists := ais.GlobalVesselCache.GetVessel(mmsi)
	if !exists {
		c.JSON(http.StatusNotFound, gin.H{"error": "Vessel not found in active telemetry cache"})
		return
	}
	c.JSON(http.StatusOK, v)
}

// GetAISVesselTrack returns the recent downsampled historical path for a vessel.
// GET /public/vessels/:mmsi/track
func GetAISVesselTrack(c *gin.Context) {
	mmsi := c.Param("mmsi")
	track := ais.GlobalVesselCache.GetVesselTrack(mmsi)
	if track == nil {
		track = []ais.TrackPoint{}
	}
	c.JSON(http.StatusOK, gin.H{
		"mmsi":  mmsi,
		"count": len(track),
		"track": track,
	})
}

// GetIncidentNearbyVessels correlates a conflict event coordinate with surrounding AIS vessels.
// GET /public/conflicts/:id/traffic or GET /public/incidents/:id/nearby-vessels
func GetIncidentNearbyVessels(c *gin.Context) {
	incidentID := c.Param("id")

	radiusStr := c.DefaultQuery("radius_nm", "15")
	radiusNm, err := strconv.ParseFloat(radiusStr, 64)
	if err != nil || radiusNm <= 0 {
		radiusNm = 15.0
	}

	// Query conflict from cache or DB
	var event *ConflictEvent
	conflictCacheMu.RLock()
	if conflictCache != nil {
		for i := range conflictCache.Conflicts {
			if conflictCache.Conflicts[i].ID == incidentID {
				event = &conflictCache.Conflicts[i]
				break
			}
		}
	}
	conflictCacheMu.RUnlock()

	// Default fallback coordinate if incident not found in memory
	lat := 26.5
	lon := 56.4
	title := "Conflict Incident"
	incidentTime := time.Now().UTC()

	if event != nil {
		lat = event.Lat
		lon = event.Lon
		title = event.Title
		if t, err := time.Parse(time.RFC3339, event.Timestamp); err == nil {
			incidentTime = t
		}
	}

	correlation := ais.CorrelateIncidentTraffic(incidentID, title, lat, lon, incidentTime, radiusNm, ais.GlobalVesselCache)
	c.JSON(http.StatusOK, correlation)
}
