package ais

import (
	"math"
	"sync"
	"time"
)

// VesselCache maintains real-time vessel states and downsampled track buffers in memory.
type VesselCache struct {
	mu           sync.RWMutex
	vessels      map[string]*NormalizedVesselState
	staleTimeout time.Duration
	maxTrackPts  int
}

// GlobalVesselCache is the application-wide singleton vessel state repository.
var GlobalVesselCache = NewVesselCache(1*time.Hour, 120)

// NewVesselCache creates a new in-memory vessel cache.
func NewVesselCache(staleTimeout time.Duration, maxTrackPoints int) *VesselCache {
	if staleTimeout <= 0 {
		staleTimeout = 1 * time.Hour
	}
	if maxTrackPoints <= 0 {
		maxTrackPoints = 120
	}
	return &VesselCache{
		vessels:      make(map[string]*NormalizedVesselState),
		staleTimeout: staleTimeout,
		maxTrackPts:  maxTrackPoints,
	}
}

// UpdatePosition updates or creates a vessel state from a position telemetry report.
func (c *VesselCache) UpdatePosition(
	mmsi, vesselName, callsign string,
	lat, lon, sog, cog, heading float64,
	navStatus int, rot float64,
	msgType string, aisTimestamp time.Time,
) *NormalizedVesselState {
	if mmsi == "" {
		return nil
	}

	c.mu.Lock()
	defer c.mu.Unlock()

	now := time.Now().UTC()
	v, exists := c.vessels[mmsi]
	if !exists {
		group, typeName := ShipTypeToGroup(0)
		v = &NormalizedVesselState{
			MMSI:            mmsi,
			VesselName:      CleanVesselName(vesselName),
			Callsign:        callsign,
			ShipTypeName:    typeName,
			ShipGroup:       group,
			Lat:             lat,
			Lon:             lon,
			SOG:             sog,
			COG:             cog,
			TrueHeading:     heading,
			NavStatusID:     navStatus,
			NavStatusText:   NavStatusToString(navStatus),
			RateOfTurn:      rot,
			AisTimestamp:    aisTimestamp,
			LastSeen:        now,
			LastMessageType: msgType,
			MonitoredZone:   DetermineMonitoredZone(lat, lon),
			RecentTrack:     make([]TrackPoint, 0, c.maxTrackPts),
			IsStale:         false,
		}
		v.RecentTrack = append(v.RecentTrack, TrackPoint{
			Lat:       lat,
			Lon:       lon,
			SOG:       sog,
			COG:       cog,
			Heading:   heading,
			Timestamp: aisTimestamp,
		})
		c.vessels[mmsi] = v
		return v
	}

	// Update existing vessel
	v.PreviousLat = v.Lat
	v.PreviousLon = v.Lon
	v.Lat = lat
	v.Lon = lon
	v.SOG = sog
	v.COG = cog
	v.TrueHeading = heading
	v.NavStatusID = navStatus
	v.NavStatusText = NavStatusToString(navStatus)
	v.RateOfTurn = rot
	v.AisTimestamp = aisTimestamp
	v.LastSeen = now
	v.LastMessageType = msgType
	v.MonitoredZone = DetermineMonitoredZone(lat, lon)
	v.IsStale = false

	if vesselName != "" && (v.VesselName == "Unknown Vessel" || v.VesselName == "") {
		v.VesselName = CleanVesselName(vesselName)
	}
	if callsign != "" && v.Callsign == "" {
		v.Callsign = callsign
	}

	// Downsampled track point addition (add point if >30s passed or distance moved > 0.05 NM)
	shouldAddPoint := true
	if n := len(v.RecentTrack); n > 0 {
		lastPt := v.RecentTrack[n-1]
		timeDiff := now.Sub(lastPt.Timestamp)
		distNm := HaversineDistanceNM(lastPt.Lat, lastPt.Lon, lat, lon)
		if timeDiff < 30*time.Second && distNm < 0.05 {
			shouldAddPoint = false
		}
	}

	if shouldAddPoint {
		v.RecentTrack = append(v.RecentTrack, TrackPoint{
			Lat:       lat,
			Lon:       lon,
			SOG:       sog,
			COG:       cog,
			Heading:   heading,
			Timestamp: aisTimestamp,
		})
		// Keep within ring buffer bounds
		if len(v.RecentTrack) > c.maxTrackPts {
			v.RecentTrack = v.RecentTrack[len(v.RecentTrack)-c.maxTrackPts:]
		}
	}

	return v
}

// UpdateStaticData enriches vessel state with static voyage and dimension properties.
func (c *VesselCache) UpdateStaticData(
	mmsi, vesselName, callsign string,
	imo, shipType, dimA, dimB, dimC, dimD int,
	draught float64, destination, eta, msgType string,
) *NormalizedVesselState {
	if mmsi == "" {
		return nil
	}

	c.mu.Lock()
	defer c.mu.Unlock()

	now := time.Now().UTC()
	v, exists := c.vessels[mmsi]
	if !exists {
		group, typeName := ShipTypeToGroup(shipType)
		v = &NormalizedVesselState{
			MMSI:            mmsi,
			VesselName:      CleanVesselName(vesselName),
			Callsign:        callsign,
			IMO:             imo,
			ShipTypeID:      shipType,
			ShipTypeName:    typeName,
			ShipGroup:       group,
			DimensionA:      dimA,
			DimensionB:      dimB,
			DimensionC:      dimC,
			DimensionD:      dimD,
			LengthMeters:    float64(dimA + dimB),
			BeamMeters:      float64(dimC + dimD),
			DraughtMeters:   draught,
			Destination:     destination,
			ETA:             eta,
			LastSeen:        now,
			LastMessageType: msgType,
			RecentTrack:     make([]TrackPoint, 0, c.maxTrackPts),
			IsStale:         false,
		}
		c.vessels[mmsi] = v
		return v
	}

	if vesselName != "" {
		v.VesselName = CleanVesselName(vesselName)
	}
	if callsign != "" {
		v.Callsign = callsign
	}
	if imo > 0 {
		v.IMO = imo
	}
	if shipType > 0 {
		v.ShipTypeID = shipType
		group, typeName := ShipTypeToGroup(shipType)
		v.ShipGroup = group
		v.ShipTypeName = typeName
	}
	if dimA+dimB > 0 {
		v.DimensionA = dimA
		v.DimensionB = dimB
		v.DimensionC = dimC
		v.DimensionD = dimD
		v.LengthMeters = float64(dimA + dimB)
		v.BeamMeters = float64(dimC + dimD)
	}
	if draught > 0 {
		v.DraughtMeters = draught
	}
	if destination != "" {
		v.Destination = destination
	}
	if eta != "" {
		v.ETA = eta
	}
	v.LastSeen = now
	v.LastMessageType = msgType
	v.IsStale = false

	return v
}

// GetVessel returns a copy of the vessel state by MMSI.
func (c *VesselCache) GetVessel(mmsi string) (*NormalizedVesselState, bool) {
	c.mu.RLock()
	defer c.mu.RUnlock()

	v, exists := c.vessels[mmsi]
	if !exists {
		return nil, false
	}
	// Return shallow copy
	copy := *v
	return &copy, true
}

// GetAllActiveVessels returns all non-stale active vessels currently in the Gulf.
func (c *VesselCache) GetAllActiveVessels() []*NormalizedVesselState {
	c.mu.RLock()
	defer c.mu.RUnlock()

	now := time.Now().UTC()
	result := make([]*NormalizedVesselState, 0, len(c.vessels))
	for _, v := range c.vessels {
		if now.Sub(v.LastSeen) > c.staleTimeout {
			continue
		}
		copy := *v
		result = append(result, &copy)
	}
	return result
}

// GetVesselTrack returns the downsampled chronological track points for a vessel.
func (c *VesselCache) GetVesselTrack(mmsi string) []TrackPoint {
	c.mu.RLock()
	defer c.mu.RUnlock()

	v, exists := c.vessels[mmsi]
	if !exists || len(v.RecentTrack) == 0 {
		return nil
	}
	trackCopy := make([]TrackPoint, len(v.RecentTrack))
	copy(trackCopy, v.RecentTrack)
	return trackCopy
}

// GetVesselsNear finds all active vessels within radiusNm nautical miles of a coordinate.
func (c *VesselCache) GetVesselsNear(centerLat, centerLon, radiusNm float64) []NearbyVesselResult {
	c.mu.RLock()
	defer c.mu.RUnlock()

	now := time.Now().UTC()
	var results []NearbyVesselResult

	for _, v := range c.vessels {
		if now.Sub(v.LastSeen) > c.staleTimeout {
			continue
		}
		distNm := HaversineDistanceNM(centerLat, centerLon, v.Lat, v.Lon)
		if distNm <= radiusNm {
			bearing := InitialBearing(centerLat, centerLon, v.Lat, v.Lon)
			results = append(results, NearbyVesselResult{
				Vessel:        *v,
				DistanceNm:    math.Round(distNm*100) / 100,
				DistanceKm:    math.Round(distNm*1.852*100) / 100,
				BearingDeg:    math.Round(bearing*10) / 10,
				ConfidenceTier: "OBSERVED_AIS_FACT",
			})
		}
	}
	return results
}

// PruneStale removes vessels that haven't transmitted within staleTimeout.
func (c *VesselCache) PruneStale() int {
	c.mu.Lock()
	defer c.mu.Unlock()

	now := time.Now().UTC()
	pruned := 0
	for mmsi, v := range c.vessels {
		if now.Sub(v.LastSeen) > c.staleTimeout {
			delete(c.vessels, mmsi)
			pruned++
		}
	}
	return pruned
}

// Count returns current number of cached vessels.
func (c *VesselCache) Count() int {
	c.mu.RLock()
	defer c.mu.RUnlock()
	return len(c.vessels)
}

// HaversineDistanceNM calculates great-circle distance in Nautical Miles.
func HaversineDistanceNM(lat1, lon1, lat2, lon2 float64) float64 {
	const earthRadiusNM = 3440.065
	radLat1 := lat1 * math.Pi / 180.0
	radLat2 := lat2 * math.Pi / 180.0
	deltaLat := (lat2 - lat1) * math.Pi / 180.0
	deltaLon := (lon2 - lon1) * math.Pi / 180.0

	a := math.Sin(deltaLat/2)*math.Sin(deltaLat/2) +
		math.Cos(radLat1)*math.Cos(radLat2)*
			math.Sin(deltaLon/2)*math.Sin(deltaLon/2)
	c := 2 * math.Atan2(math.Sqrt(a), math.Sqrt(1-a))

	return earthRadiusNM * c
}

// InitialBearing calculates the forward initial azimuth in degrees [0, 360).
func InitialBearing(lat1, lon1, lat2, lon2 float64) float64 {
	radLat1 := lat1 * math.Pi / 180.0
	radLat2 := lat2 * math.Pi / 180.0
	deltaLon := (lon2 - lon1) * math.Pi / 180.0

	y := math.Sin(deltaLon) * math.Cos(radLat2)
	x := math.Cos(radLat1)*math.Sin(radLat2) - math.Sin(radLat1)*math.Cos(radLat2)*math.Cos(deltaLon)
	brng := math.Atan2(y, x) * 180.0 / math.Pi

	return math.Mod(brng+360.0, 360.0)
}
