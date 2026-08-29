package main

import (
	"fmt"
)

// CapacityParams defines the parameterized inputs for maritime telemetry network egress calculation.
type CapacityParams struct {
	ConcurrentUsers    int     // U: Number of connected browser clients
	ActiveVessels      int     // V: Active tracked vessels in operational area
	VesselUpdateFreqHz float64 // F: AIS report frequency per vessel (e.g. 0.1 Hz = 1 update / 10s)
	AvgMsgBytes        int     // B: Average JSON WebSocket frame size in bytes
	ViewportRatio      float64 // R: Spatial filter fraction (e.g. 0.01 = user views ~1% of fleet)
}

// CapacityResult represents the exact calculated bandwidth requirements.
type CapacityResult struct {
	TotalIngestMsgPerSec        float64
	UnfilteredEgressBytesPerSec float64
	UnfilteredEgressMbps        float64
	UnfilteredEgressGbps        float64
	FilteredEgressBytesPerSec   float64
	FilteredEgressMbps          float64
	FilteredEgressGbps          float64
}

// CalculateCapacity computes both full-broadcast and spatial-filtered egress.
//
// Mathematical Model:
//
//	Ingest Rate:             R_ingest = V * F (messages/sec)
//	Unfiltered Broadcast:    E_unfiltered = U * (V * F) * B * 8 (bps)
//	Spatially Filtered:      E_filtered   = U * (V * F * R) * B * 8 (bps)
func CalculateCapacity(p CapacityParams) CapacityResult {
	ingestRate := float64(p.ActiveVessels) * p.VesselUpdateFreqHz

	// Unfiltered broadcast: every user receives every vessel position update
	unfilteredBytes := float64(p.ConcurrentUsers) * ingestRate * float64(p.AvgMsgBytes)
	unfilteredBits := unfilteredBytes * 8.0

	// Spatially filtered (geohash / bounding box viewport):
	filteredBytes := float64(p.ConcurrentUsers) * (ingestRate * p.ViewportRatio) * float64(p.AvgMsgBytes)
	filteredBits := filteredBytes * 8.0

	return CapacityResult{
		TotalIngestMsgPerSec:        ingestRate,
		UnfilteredEgressBytesPerSec: unfilteredBytes,
		UnfilteredEgressMbps:        unfilteredBits / 1_000_000.0,
		UnfilteredEgressGbps:        unfilteredBits / 1_000_000_000.0,
		FilteredEgressBytesPerSec:   filteredBytes,
		FilteredEgressMbps:          filteredBits / 1_000_000.0,
		FilteredEgressGbps:          filteredBits / 1_000_000_000.0,
	}
}

// PrintCapacityReport prints the formal capacity model analysis.
func PrintCapacityReport(p CapacityParams) {
	res := CalculateCapacity(p)

	fmt.Println(ColorCyan + ColorBold + "\n================================================================" + ColorReset)
	fmt.Println(ColorCyan + ColorBold + "        NETWORK EGRESS CAPACITY MODEL (Audit Claim C-20)        " + ColorReset)
	fmt.Println(ColorCyan + ColorBold + "================================================================" + ColorReset)
	fmt.Printf(" Parameters:\n")
	fmt.Printf("   • Concurrent Users (U):         %s%d%s\n", ColorBold, p.ConcurrentUsers, ColorReset)
	fmt.Printf("   • Active Vessels (V):           %s%d%s\n", ColorBold, p.ActiveVessels, ColorReset)
	fmt.Printf("   • Update Frequency (F):         %s%.2f Hz%s (1 update every %.0f s)\n", ColorBold, p.VesselUpdateFreqHz, ColorReset, 1.0/p.VesselUpdateFreqHz)
	fmt.Printf("   • Avg Payload Size (B):         %s%d bytes%s\n", ColorBold, p.AvgMsgBytes, ColorReset)
	fmt.Printf("   • Viewport Spatial Ratio (R):   %s%.2f%%%s (~%d vessels in view)\n", ColorBold, p.ViewportRatio*100.0, ColorReset, int(float64(p.ActiveVessels)*p.ViewportRatio))
	fmt.Printf("\n Ingest Throughput:\n")
	fmt.Printf("   • Fleet Ingest Rate:            %s%.1f msg/s%s\n", ColorGreen, res.TotalIngestMsgPerSec, ColorReset)
	fmt.Printf("\n Scenario A: Unfiltered Global Broadcast (All Vessels -> All Users):\n")
	fmt.Printf("   • Egress Bandwidth:             %s%.2f Gbps%s (%.2f Mbps)\n", ColorYellow, res.UnfilteredEgressGbps, ColorReset, res.UnfilteredEgressMbps)
	fmt.Printf("   • Formula:                      %d * (%.1f msg/s) * %d bytes * 8 = %.2f Gbps\n",
		p.ConcurrentUsers, res.TotalIngestMsgPerSec, p.AvgMsgBytes, res.UnfilteredEgressGbps)
	fmt.Printf("\n Scenario B: Spatially Filtered Viewport (~1%% Fleet per User):\n")
	fmt.Printf("   • Egress Bandwidth:             %s%.2f Mbps%s (%.4f Gbps)\n", ColorGreen, res.FilteredEgressMbps, ColorReset, res.FilteredEgressGbps)
	fmt.Printf("   • Formula:                      %d * (%.1f msg/s * %.2f) * %d bytes * 8 = %.2f Mbps\n",
		p.ConcurrentUsers, res.TotalIngestMsgPerSec, p.ViewportRatio, p.AvgMsgBytes, res.FilteredEgressMbps)
	fmt.Println(ColorCyan + ColorBold + "================================================================\n" + ColorReset)
}
