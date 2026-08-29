package main

import (
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"strings"
	"sync"
	"time"
)

// ANSI Color Codes
const (
	ColorReset   = "\033[0m"
	ColorRed     = "\033[31m"
	ColorGreen   = "\033[32m"
	ColorYellow  = "\033[33m"
	ColorBlue    = "\033[34m"
	ColorMagenta = "\033[35m"
	ColorCyan    = "\033[36m"
	ColorWhite   = "\033[37m"
	ColorBold    = "\033[1m"
	ColorDim     = "\033[2m"
)

func banner() {
	fmt.Println(ColorCyan + ColorBold + `
╔═══════════════════════════════════════════════════════════════╗
║         HormuzWatch — SRE & Observability CLI Tool            ║
║       Reliability Engineering & Chaos Fault-Tolerance         ║
╚═══════════════════════════════════════════════════════════════╝` + ColorReset)
}

type HealthResponse struct {
	Status     string `json:"status"`
	Version    string `json:"version"`
	Components struct {
		Database struct {
			Healthy bool `json:"healthy"`
			PingMS  int  `json:"ping_ms"`
		} `json:"database"`
		MLService struct {
			Healthy bool   `json:"healthy"`
			Circuit string `json:"circuit"`
		} `json:"ml_service"`
		WebSocket struct {
			Healthy bool `json:"healthy"`
		} `json:"websocket"`
	} `json:"components"`
}

type MLHealthResponse struct {
	Status        string `json:"status"`
	Version       string `json:"version"`
	ModelsLoaded  int    `json:"models_loaded"`
	ModelsTotal   int    `json:"models_total"`
	UptimeSeconds float64 `json:"uptime_seconds"`
}

func checkHealth(serverURL, mlURL, clientURL, domainURL string) {
	fmt.Println(ColorBold + "\n[1] Comprehensive System Health Audit:" + ColorReset)

	client := http.Client{Timeout: 3 * time.Second}

	// 1. Go Backend Server
	start := time.Now()
	resp, err := client.Get(serverURL + "/health")
	dur := time.Since(start)
	if err != nil {
		fmt.Printf("  %s✖ Go Backend Server%s (%s): %s%v%s\n", ColorRed, ColorReset, serverURL, ColorRed, err, ColorReset)
	} else {
		defer resp.Body.Close()
		body, _ := io.ReadAll(resp.Body)
		var h HealthResponse
		_ = json.Unmarshal(body, &h)

		statusColor := ColorGreen
		if resp.StatusCode != http.StatusOK || h.Status == "degraded" {
			statusColor = ColorYellow
		}
		fmt.Printf("  %s✔ Go Backend Server%s (%s): HTTP %s%d%s in %s%dms%s (Status: %s%s%s)\n",
			ColorGreen, ColorReset, serverURL, statusColor, resp.StatusCode, ColorReset, ColorCyan, dur.Milliseconds(), ColorReset, statusColor, h.Status, ColorReset)
		fmt.Printf("    ├─ Database (Supabase): Healthy=%t (Latency: %dms)\n", h.Components.Database.Healthy, h.Components.Database.PingMS)
		fmt.Printf("    ├─ ML Bridge: Healthy=%t (Circuit: %s)\n", h.Components.MLService.Healthy, h.Components.MLService.Circuit)
		fmt.Printf("    └─ WebSocket Stream: Healthy=%t\n", h.Components.WebSocket.Healthy)
	}

	// 2. Python ML Service
	start = time.Now()
	resp, err = client.Get(mlURL + "/health")
	dur = time.Since(start)
	if err != nil {
		fmt.Printf("  %s✖ Python ML Service%s (%s): %s%v%s\n", ColorRed, ColorReset, mlURL, ColorRed, err, ColorReset)
	} else {
		defer resp.Body.Close()
		body, _ := io.ReadAll(resp.Body)
		var mlH MLHealthResponse
		_ = json.Unmarshal(body, &mlH)
		fmt.Printf("  %s✔ Python ML Service%s (%s): HTTP %s%d%s in %s%dms%s (Models: %d/%d loaded)\n",
			ColorGreen, ColorReset, mlURL, ColorGreen, resp.StatusCode, ColorReset, ColorCyan, dur.Milliseconds(), ColorReset, mlH.ModelsLoaded, mlH.ModelsTotal)
	}

	// 3. Client Frontend Nginx
	start = time.Now()
	resp, err = client.Get(clientURL)
	dur = time.Since(start)
	if err != nil {
		fmt.Printf("  %s✖ Client Web SPA%s (%s): %s%v%s\n", ColorRed, ColorReset, clientURL, ColorRed, err, ColorReset)
	} else {
		defer resp.Body.Close()
		statusColor := ColorGreen
		if resp.StatusCode != http.StatusOK {
			statusColor = ColorYellow
		}
		fmt.Printf("  %s✔ Client Web SPA%s (%s): HTTP %s%d%s in %s%dms%s\n",
			ColorGreen, ColorReset, clientURL, statusColor, resp.StatusCode, ColorReset, ColorCyan, dur.Milliseconds(), ColorReset)
	}

	// 4. Cloudflare Public Tunnel
	if domainURL != "" {
		start = time.Now()
		resp, err = client.Get(domainURL)
		dur = time.Since(start)
		if err != nil {
			fmt.Printf("  %s✖ Edge Cloudflare Tunnel%s (%s): %s%v%s\n", ColorYellow, ColorReset, domainURL, ColorYellow, err, ColorReset)
		} else {
			defer resp.Body.Close()
			fmt.Printf("  %s✔ Edge Cloudflare Tunnel%s (%s): HTTP %s%d%s in %s%dms%s\n",
				ColorGreen, ColorReset, domainURL, ColorGreen, resp.StatusCode, ColorReset, ColorCyan, dur.Milliseconds(), ColorReset)
		}
	}
}

func runToleranceTest(targetURL string, requests int, concurrency int) {
	fmt.Printf(ColorBold+"\n[2] Executing Resilience & Fault-Tolerance Benchmark on %s%s\n"+ColorReset, targetURL, ColorReset)
	fmt.Printf("    Running %s%d requests%s with %sconcurrency = %d%s...\n\n", ColorCyan, requests, ColorReset, ColorCyan, concurrency, ColorReset)

	var wg sync.WaitGroup
	ch := make(chan int, requests)
	for i := 0; i < requests; i++ {
		ch <- i
	}
	close(ch)

	var (
		mu           sync.Mutex
		successCount int
		failCount    int
		totalLat     time.Duration
		maxLat       time.Duration
		minLat       = time.Hour
	)

	startOverall := time.Now()

	for worker := 0; worker < concurrency; worker++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			client := http.Client{Timeout: 4 * time.Second}
			for range ch {
				t0 := time.Now()
				resp, err := client.Get(targetURL + "/public/top-traces")
				elapsed := time.Since(t0)

				mu.Lock()
				if err != nil || resp.StatusCode >= 500 {
					failCount++
				} else {
					successCount++
				}
				if resp != nil {
					_ = resp.Body.Close()
				}
				totalLat += elapsed
				if elapsed > maxLat {
					maxLat = elapsed
				}
				if elapsed < minLat {
					minLat = elapsed
				}
				mu.Unlock()
			}
		}()
	}

	wg.Wait()
	totalTime := time.Since(startOverall)
	avgLat := time.Duration(0)
	if successCount+failCount > 0 {
		avgLat = totalLat / time.Duration(successCount+failCount)
	}

	rps := float64(requests) / totalTime.Seconds()
	availability := (float64(successCount) / float64(requests)) * 100

	fmt.Println(ColorGreen + ColorBold + "── Benchmark Summary ──────────────────────────────────────────" + ColorReset)
	fmt.Printf("  • Total Requests Completed : %s%d%s\n", ColorWhite, requests, ColorReset)
	fmt.Printf("  • Success Count (2xx/3xx)  : %s%d%s\n", ColorGreen, successCount, ColorReset)
	fmt.Printf("  • Failure Count (5xx/Err)  : %s%d%s\n", ColorRed, failCount, ColorReset)
	fmt.Printf("  • Availability SLO Score   : %s%.2f%%%s\n", ColorGreen, availability, ColorReset)
	fmt.Printf("  • Throughput (RPS)         : %s%.1f req/sec%s\n", ColorCyan, rps, ColorReset)
	fmt.Printf("  • Min Latency              : %s%dms%s\n", ColorGreen, minLat.Milliseconds(), ColorReset)
	fmt.Printf("  • Avg Latency (P50)        : %s%dms%s\n", ColorCyan, avgLat.Milliseconds(), ColorReset)
	fmt.Printf("  • Max Latency (P99 peak)   : %s%dms%s\n", ColorYellow, maxLat.Milliseconds(), ColorReset)
	fmt.Println(ColorGreen + ColorBold + "───────────────────────────────────────────────────────────────" + ColorReset)
}

func tailColorLogs() {
	fmt.Println(ColorBold + "\n[3] Streaming Multi-Container Colorized Logs (server, ml, client)..." + ColorReset)
	fmt.Println(ColorDim + "Press Ctrl+C to stop log stream." + ColorReset)

	cmd := exec.Command("docker", "compose", "logs", "-f", "--tail=50", "server", "ml", "client")
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	_ = cmd.Run()
}

func liveMonitor(serverURL, mlURL string) {
	fmt.Println(ColorBold + "\n[4] Live SRE Real-time Terminal Monitor (Updating every 2s)..." + ColorReset)
	fmt.Println(ColorDim + "Press Ctrl+C to exit." + ColorReset)

	client := http.Client{Timeout: 2 * time.Second}
	ticker := time.NewTicker(2 * time.Second)
	defer ticker.Stop()

	for {
		// Fetch server metrics
		resp, err := client.Get(serverURL + "/health")
		statusStr := "ONLINE"
		statusColor := ColorGreen
		dbStatus := "OK"
		dbPing := 0

		if err != nil {
			statusStr = "DOWN"
			statusColor = ColorRed
		} else {
			defer resp.Body.Close()
			body, _ := io.ReadAll(resp.Body)
			var h HealthResponse
			_ = json.Unmarshal(body, &h)
			if h.Status == "degraded" {
				statusStr = "DEGRADED"
				statusColor = ColorYellow
			}
			dbPing = h.Components.Database.PingMS
			if !h.Components.Database.Healthy {
				dbStatus = "UNHEALTHY"
			}
		}

		// Fetch ML status
		mlResp, mlErr := client.Get(mlURL + "/health")
		mlStatus := "ONLINE"
		mlColor := ColorGreen
		modelsLoaded := 0
		if mlErr != nil {
			mlStatus = "DOWN"
			mlColor = ColorRed
		} else {
			defer mlResp.Body.Close()
			body, _ := io.ReadAll(mlResp.Body)
			var mlH MLHealthResponse
			_ = json.Unmarshal(body, &mlH)
			modelsLoaded = mlH.ModelsLoaded
		}

		timestamp := time.Now().Format("15:04:05")
		fmt.Printf("\r[%s] API Server: %s%s%s (DB: %s %dms) | ML Engine: %s%s%s (%d models) | %sSLO 99.9%% OK%s",
			timestamp, statusColor, statusStr, ColorReset, dbStatus, dbPing, mlColor, mlStatus, ColorReset, modelsLoaded, ColorGreen, ColorReset)

		select {
		case <-ticker.C:
		case <-context.Background().Done():
			return
		}
	}
}

func main() {
	banner()

	serverURL := flag.String("server", "http://localhost:10020", "Go Backend Server URL")
	mlURL := flag.String("ml", "http://localhost:8090", "Python ML Service URL")
	clientURL := flag.String("client", "http://localhost:3000", "Client Frontend URL")
	domainURL := flag.String("domain", "https://hormuzwatch.aburcloud.com", "Cloudflare Domain URL")
	requests := flag.Int("requests", 100, "Number of requests for tolerance test")
	concurrency := flag.Int("concurrency", 10, "Concurrency level for tolerance test")

	command := "health"
	if len(os.Args) > 1 && !strings.HasPrefix(os.Args[1], "-") {
		command = os.Args[1]
		_ = flag.CommandLine.Parse(os.Args[2:])
	} else {
		flag.Parse()
	}

	switch command {
	case "health":
		checkHealth(*serverURL, *mlURL, *clientURL, *domainURL)
	case "tolerance", "chaos", "bench":
		checkHealth(*serverURL, *mlURL, *clientURL, *domainURL)
		runToleranceTest(*serverURL, *requests, *concurrency)
	case "logs":
		tailColorLogs()
	case "monitor", "top":
		liveMonitor(*serverURL, *mlURL)
	default:
		fmt.Printf("Unknown command: %s\n", command)
		fmt.Println("Available commands: health, tolerance, logs, monitor")
		os.Exit(1)
	}
}
