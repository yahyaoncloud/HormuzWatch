package hub

import (
	"encoding/json"
	"log"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

const (
	// Time allowed to write a message to the client
	writeWait = 10 * time.Second

	// Time allowed to read the next pong message from the client
	pongWait = 60 * time.Second

	// Send pings to client with this period. Must be less than pongWait.
	pingPeriod = (pongWait * 9) / 10 // 54 seconds

	// Maximum message size allowed from peer
	maxMessageSize = 32 * 1024 // 32 KB
)

type Message struct {
	Type string      `json:"type"`
	Data interface{} `json:"data"`
}

type Client struct {
	Hub  *Hub
	Conn *websocket.Conn
	Send chan Message
}

type Hub struct {
	Clients    map[*Client]bool
	Broadcast  chan Message
	Register   chan *Client
	Unregister chan *Client
	mu         sync.RWMutex
}

func NewHub() *Hub {
	return &Hub{
		Clients:    make(map[*Client]bool),
		Broadcast:  make(chan Message, 512),
		Register:   make(chan *Client),
		Unregister: make(chan *Client),
	}
}

func (h *Hub) Run() {
	for {
		select {
		case client := <-h.Register:
			h.mu.Lock()
			h.Clients[client] = true
			h.mu.Unlock()
			log.Printf("[Hub] Client registered. Total clients: %d", len(h.Clients))

		case client := <-h.Unregister:
			h.mu.Lock()
			if _, ok := h.Clients[client]; ok {
				delete(h.Clients, client)
				close(client.Send)
				h.mu.Unlock()
				log.Printf("[Hub] Client unregistered. Total clients: %d", len(h.Clients))
			} else {
				h.mu.Unlock()
			}

		case message := <-h.Broadcast:
			h.mu.RLock()
			for client := range h.Clients {
				select {
				case client.Send <- message:
				default:
					// Client's send buffer is full — drop and unregister
					log.Printf("[Hub] Client send buffer full. Dropping client.")
					go func(c *Client) {
						h.mu.Lock()
						if _, ok := h.Clients[c]; ok {
							delete(h.Clients, c)
							close(c.Send)
						}
						h.mu.Unlock()
					}(client)
				}
			}
			h.mu.RUnlock()
		}
	}
}

// ReadPump pumps messages from the WebSocket connection to the hub.
// It also handles the server-side ping/pong keepalive.
func (c *Client) ReadPump() {
	defer func() {
		c.Hub.Unregister <- c
		c.Conn.Close()
	}()

	c.Conn.SetReadLimit(maxMessageSize)
	c.Conn.SetReadDeadline(time.Now().Add(pongWait))

	// Renew deadline every time a pong arrives
	c.Conn.SetPongHandler(func(string) error {
		c.Conn.SetReadDeadline(time.Now().Add(pongWait))
		return nil
	})

	for {
		_, _, err := c.Conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(
				err,
				websocket.CloseGoingAway,
				websocket.CloseAbnormalClosure,
				websocket.CloseNormalClosure,
			) {
				log.Printf("[Hub] Unexpected WebSocket close: %v", err)
			}
			break
		}
		// Renew deadline on any received message (not only pongs)
		c.Conn.SetReadDeadline(time.Now().Add(pongWait))
	}
}

// WritePump pumps messages from the hub to the WebSocket connection.
// It sends periodic pings to keep the connection alive.
func (c *Client) WritePump() {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		c.Conn.Close()
	}()

	for {
		select {
		case message, ok := <-c.Send:
			c.Conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				// Hub closed the channel
				c.Conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			w, err := c.Conn.NextWriter(websocket.TextMessage)
			if err != nil {
				return
			}
			json.NewEncoder(w).Encode(message)

			// Flush any queued messages in the same write frame
			n := len(c.Send)
			for i := 0; i < n; i++ {
				json.NewEncoder(w).Encode(<-c.Send)
			}

			if err := w.Close(); err != nil {
				return
			}

		case <-ticker.C:
			// Send a ping — client must respond with pong within pongWait
			c.Conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.Conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				log.Printf("[Hub] Ping failed, closing connection: %v", err)
				return
			}
		}
	}
}
