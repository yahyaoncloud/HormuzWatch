package websocket

import "Geospatial-harmuz-watch/server/internal/websocket/hub"

// Re-export Hub and related types
type Hub = hub.Hub
type Client = hub.Client
type Message = hub.Message

// NewHub creates a new WebSocket hub
func NewHub() *Hub {
	return hub.NewHub()
}
