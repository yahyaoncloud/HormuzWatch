package integrations

import (
	"context"

	"Geospatial-harmuz-watch/server/internal/integrations/ais"
	"Geospatial-harmuz-watch/server/internal/intelligence"
)

// StartAISStream initializes the production AISStream maritime integration engine.
func StartAISStream(ctx context.Context, p *intelligence.Pipeline) {
	client := ais.NewAISClient(p, ais.GlobalVesselCache)
	client.Start(ctx)
}
