package main

import (
	"flag"
	"log"
	"net/url"
	"os"
	"os/signal"
	"sync"
	"sync/atomic"
	"time"

	"github.com/gorilla/websocket"
)

var (
	addr       = flag.String("addr", "localhost:8080", "http service address")
	numClients = flag.Int("clients", 1000, "number of concurrent websocket clients")
	token      = flag.String("token", "", "JWT token for auth (if required)")
)

func main() {
	flag.Parse()
	log.Printf("Starting %d WebSocket mock clients targeting %s", *numClients, *addr)

	var wg sync.WaitGroup
	var connectedCount int32
	var failedCount int32
	var msgCount int64

	interrupt := make(chan os.Signal, 1)
	signal.Notify(interrupt, os.Interrupt)

	u := url.URL{Scheme: "ws", Host: *addr, Path: "/ws/stream"}
	if *token != "" {
		q := u.Query()
		q.Set("token", *token)
		u.RawQuery = q.Encode()
	}
	targetURL := u.String()

	// Ramp up connections to avoid hitting OS limits instantly
	for i := 0; i < *numClients; i++ {
		wg.Add(1)
		go func(id int) {
			defer wg.Done()
			
			// Stagger connections
			time.Sleep(time.Duration(id*10) * time.Millisecond)

			c, _, err := websocket.DefaultDialer.Dial(targetURL, nil)
			if err != nil {
				atomic.AddInt32(&failedCount, 1)
				// log.Printf("client %d failed to connect: %v", id, err)
				return
			}
			defer c.Close()
			atomic.AddInt32(&connectedCount, 1)

			// Reader loop to consume messages
			for {
				c.SetReadDeadline(time.Now().Add(60 * time.Second))
				_, _, err := c.ReadMessage()
				if err != nil {
					return
				}
				atomic.AddInt64(&msgCount, 1)
			}
		}(i)
	}

	ticker := time.NewTicker(5 * time.Second)
	defer ticker.Stop()

	go func() {
		for {
			select {
			case <-ticker.C:
				log.Printf("[Stats] Connected: %d | Failed: %d | Total Msg Rcvd: %d", atomic.LoadInt32(&connectedCount), atomic.LoadInt32(&failedCount), atomic.LoadInt64(&msgCount))
			}
		}
	}()

	<-interrupt
	log.Println("Shutting down load test...")
}
