package main

import (
	"math"
	"testing"
)

func TestCalculateCapacity(t *testing.T) {
	params := CapacityParams{
		ConcurrentUsers:    100000,
		ActiveVessels:      3000,
		VesselUpdateFreqHz: 0.1,  // 1 update per 10s = 300 msg/s fleet-wide
		AvgMsgBytes:        300,  // 300 bytes per JSON message
		ViewportRatio:      0.01, // 1% of fleet (~30 vessels) visible to each user
	}

	res := CalculateCapacity(params)

	// Fleet Ingest Rate = 3000 * 0.1 = 300 msg/s
	if math.Abs(res.TotalIngestMsgPerSec-300.0) > 1e-4 {
		t.Errorf("TotalIngestMsgPerSec = %v; expected 300.0", res.TotalIngestMsgPerSec)
	}

	// Scenario A: Unfiltered Global Broadcast
	// Egress = 100,000 * 300 msg/s * 300 bytes * 8 bits = 72,000,000,000 bps = 72 Gbps
	if math.Abs(res.UnfilteredEgressGbps-72.0) > 1e-4 {
		t.Errorf("UnfilteredEgressGbps = %v; expected 72.0 Gbps", res.UnfilteredEgressGbps)
	}

	// Scenario B: Spatially Filtered Viewport (1% Fleet = 30 vessels)
	// Egress = 100,000 * (300 * 0.01 msg/s) * 300 bytes * 8 bits = 720,000,000 bps = 720 Mbps
	if math.Abs(res.FilteredEgressMbps-720.0) > 1e-4 {
		t.Errorf("FilteredEgressMbps = %v; expected 720.0 Mbps", res.FilteredEgressMbps)
	}
}
