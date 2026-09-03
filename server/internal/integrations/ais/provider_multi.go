package ais

import (
	"context"
	"fmt"
	"log"
	"strings"
	"sync"
	"sync/atomic"
	"time"
)

// MultiProvider coordinates multiple active AIS feeds with deduplication.
type MultiProvider struct {
	providers       []AISProvider
	healthMu        sync.RWMutex
	health          ProviderHealth
	totalMessages   uint64
	droppedMessages uint64
	reconnectCount  uint32
	seenMu          sync.Mutex
	recentSeen      map[string]time.Time
}

// NewMultiProvider instantiates a multi-feed aggregator.
func NewMultiProvider(providers ...AISProvider) *MultiProvider {
	return &MultiProvider{
		providers:  providers,
		recentSeen: make(map[string]time.Time),
		health: ProviderHealth{
			Provider: "multi",
			Status:   "initialized",
		},
	}
}

func (m *MultiProvider) Name() string {
	return "multi"
}

func (m *MultiProvider) Start(ctx context.Context, onObservation func(*NormalizedAISObservation)) error {
	log.Printf("[MultiProvider] Launching %d concurrent AIS provider feeds...", len(m.providers))

	for _, p := range m.providers {
		prov := p
		go func() {
			err := prov.Start(ctx, func(obs *NormalizedAISObservation) {
				if obs == nil {
					return
				}

				// Deduplication check: (MMSI + rounded timestamp to 5 seconds)
				dedupKey := fmt.Sprintf("%s-%d", obs.MMSI, obs.AisTimestamp.Unix()/5)
				m.seenMu.Lock()
				_, alreadySeen := m.recentSeen[dedupKey]
				if !alreadySeen {
					m.recentSeen[dedupKey] = time.Now().UTC()
				}
				m.seenMu.Unlock()

				atomic.AddUint64(&m.totalMessages, 1)
				m.healthMu.Lock()
				m.health.LastEventAt = time.Now().UTC()
				m.healthMu.Unlock()

				if onObservation != nil {
					onObservation(obs)
				}
			})
			if err != nil {
				log.Printf("[MultiProvider] Provider %s error: %v", prov.Name(), err)
			}
		}()
	}

	// Periodic cache cleanup for deduplication map
	go func() {
		ticker := time.NewTicker(2 * time.Minute)
		defer ticker.Stop()
		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				m.seenMu.Lock()
				now := time.Now().UTC()
				for k, t := range m.recentSeen {
					if now.Sub(t) > 5*time.Minute {
						delete(m.recentSeen, k)
					}
				}
				m.seenMu.Unlock()
			}
		}
	}()

	m.healthMu.Lock()
	m.health.Status = "connected"
	m.health.IsConnected = true
	m.healthMu.Unlock()

	return nil
}

func (m *MultiProvider) Stop() error {
	var errs []string
	for _, p := range m.providers {
		if err := p.Stop(); err != nil {
			errs = append(errs, err.Error())
		}
	}
	if len(errs) > 0 {
		return fmt.Errorf("stop errors: %s", strings.Join(errs, "; "))
	}
	return nil
}

func (m *MultiProvider) Health() ProviderHealth {
	m.healthMu.RLock()
	defer m.healthMu.RUnlock()

	h := m.health
	h.TotalMessages = atomic.LoadUint64(&m.totalMessages)
	h.DroppedMessages = atomic.LoadUint64(&m.droppedMessages)
	h.ReconnectCount = atomic.LoadUint32(&m.reconnectCount)
	return h
}

func (m *MultiProvider) GetSnapshot(ctx context.Context) ([]*NormalizedAISObservation, error) {
	for _, p := range m.providers {
		if snap, err := p.GetSnapshot(ctx); err == nil && len(snap) > 0 {
			return snap, nil
		}
	}
	return nil, nil
}
