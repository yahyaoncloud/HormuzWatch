package main

import (
	"bufio"
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"os/signal"
	"regexp"
	"strings"
	"sync"
	"syscall"
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

// Precompiled regexes for fast text log highlighting
var (
	reHTTPMethod = regexp.MustCompile(`\b(GET|POST|PUT|DELETE|PATCH|OPTIONS|HEAD)\b`)
	reHTTP2xx    = regexp.MustCompile(`\b(200|201|204)\b`)
	reHTTP3xx    = regexp.MustCompile(`\b(301|302|304)\b`)
	reHTTP4xx    = regexp.MustCompile(`\b(400|401|403|404|422)\b`)
	reHTTP5xx    = regexp.MustCompile(`\b(500|502|503|504)\b`)
	reDuration   = regexp.MustCompile(`\b([0-9]+(?:\.[0-9]+)?(?:ms|s|µs))\b`)
	reIPAddr     = regexp.MustCompile(`\b(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\b`)
)

func getServiceBadge(serviceName string) (badge string, normalizedService string) {
	lower := strings.ToLower(serviceName)
	switch {
	case strings.Contains(lower, "server"):
		return ColorCyan + ColorBold + "[SERVER]" + ColorReset, "server"
	case strings.Contains(lower, "ml"):
		return ColorMagenta + ColorBold + "[ML-SVC]" + ColorReset, "ml"
	case strings.Contains(lower, "client") || strings.Contains(lower, "spa") || strings.Contains(lower, "frontend"):
		return ColorGreen + ColorBold + "[CLIENT]" + ColorReset, "client"
	case strings.Contains(lower, "db") || strings.Contains(lower, "postgres") || strings.Contains(lower, "supabase"):
		return ColorBlue + ColorBold + "[DB    ]" + ColorReset, "db"
	case strings.Contains(lower, "tunnel") || strings.Contains(lower, "cloudflared"):
		return ColorYellow + ColorBold + "[TUNNEL]" + ColorReset, "cloudflared"
	case strings.Contains(lower, "grafana") || strings.Contains(lower, "prometheus") || strings.Contains(lower, "obs"):
		return ColorWhite + ColorBold + "[OBSERV]" + ColorReset, "observability"
	default:
		pad := serviceName
		if len(pad) > 6 {
			pad = pad[:6]
		}
		for len(pad) < 6 {
			pad += " "
		}
		return ColorDim + "[" + strings.ToUpper(pad) + "]" + ColorReset, lower
	}
}

func getLevelBadge(levelStr string) (badge string, rank int) {
	switch strings.ToLower(strings.TrimSpace(levelStr)) {
	case "debug":
		return ColorCyan + "[DEBUG]" + ColorReset, 1
	case "info":
		return ColorGreen + "[INFO ]" + ColorReset, 2
	case "warn", "warning":
		return ColorYellow + "[WARN ]" + ColorReset, 3
	case "error", "err":
		return ColorRed + "[ERROR]" + ColorReset, 4
	case "fatal", "critical", "crit":
		return "\033[1;41;37m[FATAL]\033[0m", 5
	default:
		return ColorDim + "[LOG  ]" + ColorReset, 2
	}
}

func parseLevelRank(levelStr string) int {
	switch strings.ToLower(strings.TrimSpace(levelStr)) {
	case "debug":
		return 1
	case "info":
		return 2
	case "warn", "warning":
		return 3
	case "error", "err":
		return 4
	case "fatal", "critical", "crit":
		return 5
	default:
		return 0
	}
}

func colorizeLogLine(rawLine string, minLevelRank int, filterService string) (string, bool) {
	trimmed := strings.TrimSpace(rawLine)
	if trimmed == "" {
		return "", false
	}

	var serviceName, logBody string
	if parts := strings.SplitN(trimmed, "|", 2); len(parts) == 2 {
		serviceName = strings.TrimSpace(parts[0])
		logBody = strings.TrimSpace(parts[1])
	} else {
		serviceName = "hormuzwatch"
		logBody = trimmed
	}

	badge, normService := getServiceBadge(serviceName)
	if filterService != "" && filterService != "all" && !strings.Contains(normService, strings.ToLower(filterService)) {
		return "", false
	}

	// Try JSON parse
	if strings.HasPrefix(logBody, "{") && strings.HasSuffix(logBody, "}") {
		var j map[string]interface{}
		if err := json.Unmarshal([]byte(logBody), &j); err == nil && len(j) > 0 {
			// Extract time
			timeStr := time.Now().Format("15:04:05.000")
			if tVal, ok := j["time"].(string); ok && tVal != "" {
				if parsedTime, err := time.Parse(time.RFC3339Nano, tVal); err == nil {
					timeStr = parsedTime.Format("15:04:05.000")
				} else if parsedTime, err := time.Parse(time.RFC3339, tVal); err == nil {
					timeStr = parsedTime.Format("15:04:05.000")
				} else {
					timeStr = tVal
				}
				delete(j, "time")
			} else if tVal, ok := j["ts"].(string); ok && tVal != "" {
				timeStr = tVal
				delete(j, "ts")
			}

			// Extract level
			levelStr := "info"
			if lVal, ok := j["level"].(string); ok {
				levelStr = lVal
				delete(j, "level")
			} else if lVal, ok := j["severity"].(string); ok {
				levelStr = lVal
				delete(j, "severity")
			}
			levelBadge, rank := getLevelBadge(levelStr)
			if rank < minLevelRank {
				return "", false
			}

			// Extract msg
			msgStr := ""
			if mVal, ok := j["msg"].(string); ok {
				msgStr = mVal
				delete(j, "msg")
			} else if mVal, ok := j["message"].(string); ok {
				msgStr = mVal
				delete(j, "message")
			}

			// Remaining key-values
			var attrs []string
			for k, v := range j {
				vStr := fmt.Sprintf("%v", v)
				isErr := strings.Contains(strings.ToLower(k), "err") || strings.Contains(strings.ToLower(k), "fail")
				if isErr {
					attrs = append(attrs, fmt.Sprintf("%s%s=%s%s%s", ColorDim+ColorCyan, k, ColorRed, vStr, ColorReset))
				} else if k == "status" {
					if strings.HasPrefix(vStr, "2") {
						attrs = append(attrs, fmt.Sprintf("%s%s=%s%s%s", ColorDim+ColorCyan, k, ColorGreen, vStr, ColorReset))
					} else if strings.HasPrefix(vStr, "3") {
						attrs = append(attrs, fmt.Sprintf("%s%s=%s%s%s", ColorDim+ColorCyan, k, ColorCyan, vStr, ColorReset))
					} else if strings.HasPrefix(vStr, "4") {
						attrs = append(attrs, fmt.Sprintf("%s%s=%s%s%s", ColorDim+ColorCyan, k, ColorYellow, vStr, ColorReset))
					} else {
						attrs = append(attrs, fmt.Sprintf("%s%s=%s%s%s", ColorDim+ColorCyan, k, ColorRed, vStr, ColorReset))
					}
				} else if strings.Contains(k, "latency") || strings.Contains(k, "duration") || strings.Contains(k, "ping") {
					attrs = append(attrs, fmt.Sprintf("%s%s=%s%s%s", ColorDim+ColorCyan, k, ColorYellow, vStr, ColorReset))
				} else if strings.HasPrefix(vStr, "http") || strings.HasPrefix(vStr, "/") {
					attrs = append(attrs, fmt.Sprintf("%s%s=%s%s%s", ColorDim+ColorCyan, k, ColorCyan, vStr, ColorReset))
				} else {
					attrs = append(attrs, fmt.Sprintf("%s%s=%s%s%s", ColorDim+ColorCyan, k, ColorWhite, vStr, ColorReset))
				}
			}

			attrJoined := ""
			if len(attrs) > 0 {
				attrJoined = " " + strings.Join(attrs, " ")
			}

			return fmt.Sprintf("%s %s %s %s%s%s%s",
				badge,
				ColorDim+timeStr+ColorReset,
				levelBadge,
				ColorBold, msgStr, ColorReset,
				attrJoined,
			), true
		}
	}

	// Text line formatting
	lineLevel := "info"
	lowerBody := strings.ToLower(logBody)
	if strings.Contains(lowerBody, "error") || strings.Contains(lowerBody, "panic") || strings.Contains(lowerBody, "fatal") {
		lineLevel = "error"
	} else if strings.Contains(lowerBody, "warn") {
		lineLevel = "warn"
	} else if strings.Contains(lowerBody, "debug") {
		lineLevel = "debug"
	}

	levelBadge, rank := getLevelBadge(lineLevel)
	if rank < minLevelRank {
		return "", false
	}

	// Syntax highlight text body
	formattedBody := logBody
	formattedBody = reHTTPMethod.ReplaceAllString(formattedBody, ColorCyan+ColorBold+"$1"+ColorReset)
	formattedBody = reHTTP2xx.ReplaceAllString(formattedBody, ColorGreen+"$1"+ColorReset)
	formattedBody = reHTTP3xx.ReplaceAllString(formattedBody, ColorCyan+"$1"+ColorReset)
	formattedBody = reHTTP4xx.ReplaceAllString(formattedBody, ColorYellow+"$1"+ColorReset)
	formattedBody = reHTTP5xx.ReplaceAllString(formattedBody, ColorRed+ColorBold+"$1"+ColorReset)
	formattedBody = reDuration.ReplaceAllString(formattedBody, ColorYellow+"$1"+ColorReset)
	formattedBody = reIPAddr.ReplaceAllString(formattedBody, ColorDim+ColorBlue+"$1"+ColorReset)

	return fmt.Sprintf("%s %s %s", badge, levelBadge, formattedBody), true
}

func tailColorLogs(tailCount int, minLevel string, serviceFilter string) {
	fmt.Println(ColorBold + "\n[3] Streaming Multi-Container Colorized Logs (server, ml, client)..." + ColorReset)
	if minLevel != "" && minLevel != "all" {
		fmt.Printf("    • Min Level Filter: %s%s%s\n", ColorYellow, strings.ToUpper(minLevel), ColorReset)
	}
	if serviceFilter != "" && serviceFilter != "all" {
		fmt.Printf("    • Service Filter  : %s%s%s\n", ColorCyan, serviceFilter, ColorReset)
	}
	fmt.Println(ColorDim + "Press Ctrl+C to stop log stream.\n" + ColorReset)

	args := []string{"compose", "logs", "-f", fmt.Sprintf("--tail=%d", tailCount), "server", "ml", "client"}
	cmd := exec.Command("docker", args...)

	stdout, err := cmd.StdoutPipe()
	if err != nil {
		fmt.Printf("%sFailed to create stdout pipe: %v%s\n", ColorRed, err, ColorReset)
		return
	}
	cmd.Stderr = cmd.Stdout

	if err := cmd.Start(); err != nil {
		fmt.Printf("%sFailed to start docker compose logs: %v%s\n", ColorRed, err, ColorReset)
		return
	}

	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, os.Interrupt, syscall.SIGTERM)
	go func() {
		<-sigCh
		if cmd.Process != nil {
			_ = cmd.Process.Kill()
		}
	}()

	minRank := parseLevelRank(minLevel)
	scanner := bufio.NewScanner(stdout)
	for scanner.Scan() {
		line := scanner.Text()
		if formatted, ok := colorizeLogLine(line, minRank, serviceFilter); ok {
			fmt.Println(formatted)
		}
	}
	_ = cmd.Wait()
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
	users := flag.Int("users", 100000, "Concurrent users for capacity model")
	vessels := flag.Int("vessels", 3000, "Active vessels for capacity model")
	freq := flag.Float64("freq", 0.1, "Vessel update frequency (Hz)")
	bytesPerMsg := flag.Int("bytes", 300, "Average message size in bytes")
	viewportRatio := flag.Float64("ratio", 0.01, "Viewport fraction visible to each user")
	tailCount := flag.Int("tail", 50, "Number of lines to tail in logs")
	logLevel := flag.String("level", "all", "Minimum log level to show (debug, info, warn, error)")
	logService := flag.String("service", "all", "Service to filter logs (server, ml, client, db)")

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
	case "capacity":
		PrintCapacityReport(CapacityParams{
			ConcurrentUsers:    *users,
			ActiveVessels:      *vessels,
			VesselUpdateFreqHz: *freq,
			AvgMsgBytes:        *bytesPerMsg,
			ViewportRatio:      *viewportRatio,
		})
	case "tolerance", "chaos", "bench":
		checkHealth(*serverURL, *mlURL, *clientURL, *domainURL)
		runToleranceTest(*serverURL, *requests, *concurrency)
	case "logs":
		tailColorLogs(*tailCount, *logLevel, *logService)
	case "monitor", "top":
		liveMonitor(*serverURL, *mlURL)
	default:
		fmt.Printf("Unknown command: %s\n", command)
		fmt.Println("Available commands: health, capacity, tolerance, logs, monitor")
		os.Exit(1)
	}
}

