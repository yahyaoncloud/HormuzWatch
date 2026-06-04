package intelligence

import (
	"log"
	"time"
)

// RunTrainingJob extracts feature vectors from the TrackStateManager's active
// tracks and sends them to the ML service to train a new Isolation Forest model.
func RunTrainingJob(tsm *TrackStateManager, mlClient *MLClient) {
	log.Println("[ML] Starting background training job...")

	tsm.mu.RLock()
	var features []MLFeaturePayload
	for _, state := range tsm.tracks {
		// We only want tracks that have a decent amount of history to form a good baseline
		if len(state.History) < 5 {
			continue
		}

		// Compute deltas for the most recent observation in the history
		currentObs := state.History[len(state.History)-1]
		
		// Create a temporary state without the current observation to compute deltas
		tempState := &TrackState{
			History: state.History[:len(state.History)-1],
		}
		
		deltas := tsm.computeDeltas(tempState, currentObs)
		
		// Extract geospatial features
		distToZone := computeDistToNearestZone(currentObs.Lat, currentObs.Lon)
		nearAttack := false // We approximate this since we don't have api package dependency here easily, or we can compute it
		distToAttack := computeDistToNearestAttack(currentObs.Lat, currentObs.Lon, nearAttack)

		payload := MLFeaturePayload{
			CourseDelta:        deltas.CourseDelta,
			HeadingDelta:       deltas.HeadingDelta,
			SpeedDelta:         deltas.SpeedDelta,
			AverageSpeed:       deltas.AverageSpeed,
			SpeedVariance:      deltas.SpeedVariance,
			AISGapMinutes:      deltas.AISGapMinutes,
			DistRestrictedZone: distToZone,
			DistHistoricalSite: distToAttack,
		}
		features = append(features, payload)
	}
	tsm.mu.RUnlock()

	if len(features) < 50 {
		log.Printf("[ML] Not enough tracks for training (found %d, need 50). Skipping.", len(features))
		return
	}

	version, err := mlClient.Train(features)
	if err != nil {
		log.Printf("[ML] Training job failed: %v", err)
		return
	}

	log.Printf("[ML] Successfully trained new model version: %s with %d samples", version, len(features))
}

// StartAutomatedTraining loop runs the training job periodically (e.g., daily).
func StartAutomatedTraining(tsm *TrackStateManager, mlClient *MLClient) {
	// For testing purposes, we might want to train more frequently. 
	// Let's set it to every 1 hour.
	ticker := time.NewTicker(1 * time.Hour)
	go func() {
		// Run an initial training job after a short delay to allow data to accumulate
		time.Sleep(2 * time.Minute)
		RunTrainingJob(tsm, mlClient)

		for range ticker.C {
			RunTrainingJob(tsm, mlClient)
		}
	}()
}
