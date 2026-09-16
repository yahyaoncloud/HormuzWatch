package main

import (
	"bytes"
	"context"
	"flag"
	"fmt"
	"io"
	"math/rand"
	"net"
	"net/http"
	"os"
	"os/signal"
	"sort"
	"sync"
	"sync/atomic"
	"syscall"
	"time"
)

// Statistics tracking
type Metrics struct {
	TotalRequests atomic.Uint64
	Success2xx    atomic.Uint64
	ClientErrors4xx atomic.Uint64
	ServerErrors5xx atomic.Uint64
	OtherErrors   atomic.Uint64
	TotalBytes    atomic.Uint64
}

func main() {
	targetURL := flag.String("target", "http://192.168.1.40:30020/health", "Target URL on LATE5530")
	targetRPS := flag.Int("rps", 20000, "Target requests per second")
	duration := flag.Duration("duration", 30*time.Second, "Test duration (e.g. 10s, 30s, 1m)")
	workers := flag.Int("workers", 400, "Number of concurrent worker goroutines")
	method := flag.String("method", "GET", "HTTP method (GET or POST)")
	payloadType := flag.String("payload", "telemetry", "Payload type for POST: 'telemetry' or 'empty'")
	warmup := flag.Duration("warmup", 2*time.Second, "Warmup duration to pre-fill TCP connections")
	floodMode := flag.Bool("flood", false, "Unthrottled flood mode: bombard the target at maximum possible speed without rate limiting")
	flag.Parse()

	if *floodMode {
		fmt.Printf(" Mode:         FLOOD / UNTHROTTLED (Bombarding target at max capacity)\n")
	}

	fmt.Println("================================================================================")
	fmt.Println(" 🌊 HormuzWatch — High-Throughput Distributed Load Generator (20k RPS) ")
	fmt.Println("================================================================================")
	fmt.Printf(" Target:       %s\n", *targetURL)
	fmt.Printf(" Target Rate:  %d req/sec\n", *targetRPS)
	fmt.Printf(" Workers:      %d concurrent goroutines\n", *workers)
	fmt.Printf(" Duration:     %v (Warmup: %v)\n", *duration, *warmup)
	fmt.Printf(" Method:       %s\n", *method)
	fmt.Println("================================================================================")

	// Ultra-high throughput HTTP Transport tuned for 20k+ RPS
	transport := &http.Transport{
		Proxy: http.ProxyFromEnvironment,
		DialContext: (&net.Dialer{
			Timeout:   2 * time.Second,
			KeepAlive: 90 * time.Second,
			DualStack: true,
		}).DialContext,
		ForceAttemptHTTP2:     false,
		MaxIdleConns:          50000,
		MaxIdleConnsPerHost:   25000,
		MaxConnsPerHost:       30000,
		IdleConnTimeout:       120 * time.Second,
		TLSHandshakeTimeout:   2 * time.Second,
		ExpectContinueTimeout: 1 * time.Second,
		DisableCompression:   true, // Avoid client/server CPU bottleneck on compression
		WriteBufferSize:       64 * 1024,
		ReadBufferSize:        64 * 1024,
	}

	client := &http.Client{
		Transport: transport,
		Timeout:   3 * time.Second,
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Capture OS signals for graceful shutdown
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, os.Interrupt, syscall.SIGTERM)
	go func() {
		<-sigChan
		fmt.Println("\n[!] Received interrupt signal. Stopping load test...")
		cancel()
	}()

	// Pre-warm TCP connections
	fmt.Printf("[*] Pre-warming connection pool with %d workers (%v)...\n", *workers, *warmup)
	warmupCtx, warmupCancel := context.WithTimeout(ctx, *warmup)
	var warmupWG sync.WaitGroup
	for i := 0; i < *workers; i++ {
		warmupWG.Add(1)
		go func() {
			defer warmupWG.Done()
			for {
				select {
				case <-warmupCtx.Done():
					return
				default:
					req, err := http.NewRequestWithContext(warmupCtx, *method, *targetURL, nil)
					if err == nil {
						resp, err := client.Do(req)
						if err == nil {
							io.Copy(io.Discard, resp.Body)
							resp.Body.Close()
						}
					}
					time.Sleep(5 * time.Millisecond)
				}
			}
		}()
	}
	warmupWG.Wait()
	warmupCancel()
	fmt.Println("[✓] Connection pool established.")

	// Latency samples bucket (subsampled to minimize memory overhead)
	const sampleRate = 50 // sample 1 in every 50 requests
	var latenciesMu sync.Mutex
	latencies := make([]int64, 0, (*targetRPS*int(duration.Seconds()))/sampleRate+1000)

	var metrics Metrics
	startTime := time.Now()

	// Rate Limiting Dispatcher: Token Bucket for microsecond dispatching
	ratePerWorker := *targetRPS / *workers
	if ratePerWorker < 1 {
		ratePerWorker = 1
	}

	var wg sync.WaitGroup
	var sampleCounter atomic.Uint64

	fmt.Println("\n[*] Launching 20,000 RPS benchmark stream...")
	fmt.Println("--------------------------------------------------------------------------------")
	fmt.Printf("%-10s | %-12s | %-12s | %-12s | %-10s | %-10s\n", "Elapsed", "Current RPS", "Success 2xx", "Errors", "P50 Lat", "P99 Lat")
	fmt.Println("--------------------------------------------------------------------------------")

	// Start live progress reporter
	reporterCtx, reporterCancel := context.WithCancel(ctx)
	defer reporterCancel()

	go func() {
		ticker := time.NewTicker(1 * time.Second)
		defer ticker.Stop()

		var lastTotal, lastSuccess, lastErrors uint64

		for {
			select {
			case <-reporterCtx.Done():
				return
			case t := <-ticker.C:
				elapsed := t.Sub(startTime).Truncate(time.Millisecond)
				currentTotal := metrics.TotalRequests.Load()
				currentSuccess := metrics.Success2xx.Load()
				currentErrors := metrics.ClientErrors4xx.Load() + metrics.ServerErrors5xx.Load() + metrics.OtherErrors.Load()

				deltaTotal := currentTotal - lastTotal
				lastTotal = currentTotal
				lastSuccess = currentSuccess
				lastErrors = currentErrors

				// Calculate quick P50 / P99 from recent latency samples
				latenciesMu.Lock()
				sampleLen := len(latencies)
				var p50, p99 float64
				if sampleLen > 10 {
					sorted := make([]int64, sampleLen)
					copy(sorted, latencies)
					sort.Slice(sorted, func(i, j int) bool { return sorted[i] < sorted[j] })
					p50 = float64(sorted[sampleLen*50/100]) / 1000.0 // ms
					p99 = float64(sorted[sampleLen*99/100]) / 1000.0 // ms
				}
				latenciesMu.Unlock()

				fmt.Printf("%-10s | %-12d | %-12d | %-12d | %-8.2fms | %-8.2fms\n",
					elapsed, deltaTotal, lastSuccess, lastErrors, p50, p99)
			}
		}
	}()

	// Worker routines
	testCtx, testCancel := context.WithTimeout(ctx, *duration)
	defer testCancel()

	intervalNs := int64(time.Second) * int64(*workers) / int64(*targetRPS)
	if intervalNs <= 0 {
		intervalNs = 1
	}

	for w := 0; w < *workers; w++ {
		wg.Add(1)
		go func(workerID int) {
			defer wg.Done()

			var payload []byte
			if *method == "POST" {
				if *payloadType == "telemetry" {
					payload = []byte(fmt.Sprintf(`{"mmsi":%d,"lat":%f,"lon":%f,"speed":%f,"heading":%f,"timestamp":"%s"}`,
						400000000+workerID,
						25.0+rand.Float64()*3.0,
						54.0+rand.Float64()*4.0,
						12.5+rand.Float64()*5.0,
						rand.Float64()*360.0,
						time.Now().UTC().Format(time.RFC3339),
					))
				} else {
					payload = []byte(`{"test":true}`)
				}
			}

			if *floodMode {
				for {
					select {
					case <-testCtx.Done():
						return
					default:
						var body io.Reader
						if len(payload) > 0 {
							body = bytes.NewReader(payload)
						}

						req, err := http.NewRequestWithContext(testCtx, *method, *targetURL, body)
						if err != nil {
							metrics.OtherErrors.Add(1)
							metrics.TotalRequests.Add(1)
							continue
						}

						if *method == "POST" {
							req.Header.Set("Content-Type", "application/json")
						}
						req.Header.Set("User-Agent", "HormuzWatch-LoadGen/2.0")

						t0 := time.Now()
						resp, err := client.Do(req)
						elapsedUs := time.Since(t0).Microseconds()

						metrics.TotalRequests.Add(1)

						if err != nil {
							metrics.OtherErrors.Add(1)
							continue
						}

						n, _ := io.Copy(io.Discard, resp.Body)
						resp.Body.Close()
						metrics.TotalBytes.Add(uint64(n))

						if resp.StatusCode >= 200 && resp.StatusCode < 300 {
							metrics.Success2xx.Add(1)
						} else if resp.StatusCode >= 400 && resp.StatusCode < 500 {
							metrics.ClientErrors4xx.Add(1)
						} else if resp.StatusCode >= 500 {
							metrics.ServerErrors5xx.Add(1)
						}

						if sampleCounter.Add(1)%sampleRate == 0 {
							latenciesMu.Lock()
							latencies = append(latencies, elapsedUs)
							latenciesMu.Unlock()
						}
					}
				}
			}

			ticker := time.NewTicker(time.Duration(intervalNs))
			defer ticker.Stop()

			for {
				select {
				case <-testCtx.Done():
					return
				case <-ticker.C:
					var body io.Reader
					if len(payload) > 0 {
						body = bytes.NewReader(payload)
					}

					req, err := http.NewRequestWithContext(testCtx, *method, *targetURL, body)
					if err != nil {
						metrics.OtherErrors.Add(1)
						metrics.TotalRequests.Add(1)
						continue
					}

					if *method == "POST" {
						req.Header.Set("Content-Type", "application/json")
					}
					req.Header.Set("User-Agent", "HormuzWatch-LoadGen/2.0")

					t0 := time.Now()
					resp, err := client.Do(req)
					elapsedUs := time.Since(t0).Microseconds()

					metrics.TotalRequests.Add(1)

					if err != nil {
						metrics.OtherErrors.Add(1)
						continue
					}

					n, _ := io.Copy(io.Discard, resp.Body)
					resp.Body.Close()
					metrics.TotalBytes.Add(uint64(n))

					if resp.StatusCode >= 200 && resp.StatusCode < 300 {
						metrics.Success2xx.Add(1)
					} else if resp.StatusCode >= 400 && resp.StatusCode < 500 {
						metrics.ClientErrors4xx.Add(1)
					} else if resp.StatusCode >= 500 {
						metrics.ServerErrors5xx.Add(1)
					}

					// Sample latency
					if sampleCounter.Add(1)%sampleRate == 0 {
						latenciesMu.Lock()
						latencies = append(latencies, elapsedUs)
						latenciesMu.Unlock()
					}
				}
			}
		}(w)
	}

	wg.Wait()
	reporterCancel()
	totalElapsed := time.Since(startTime)

	// Final Summary Calculation
	fmt.Println("--------------------------------------------------------------------------------")
	fmt.Println("\n================================================================================")
	fmt.Println(" 📊 SRE Performance & Benchmark Summary")
	fmt.Println("================================================================================")

	totalReqs := metrics.TotalRequests.Load()
	successReqs := metrics.Success2xx.Load()
	errors4xx := metrics.ClientErrors4xx.Load()
	errors5xx := metrics.ServerErrors5xx.Load()
	otherErrors := metrics.OtherErrors.Load()
	totalBytes := metrics.TotalBytes.Load()

	actualRPS := float64(totalReqs) / totalElapsed.Seconds()
	successRate := 0.0
	if totalReqs > 0 {
		successRate = (float64(successReqs) / float64(totalReqs)) * 100.0
	}

	fmt.Printf(" Total Execution Time:  %.3f seconds\n", totalElapsed.Seconds())
	fmt.Printf(" Total Requests Sent:   %d\n", totalReqs)
	fmt.Printf(" Average Throughput:    %.2f Requests/Second (Target: %d RPS)\n", actualRPS, *targetRPS)
	fmt.Printf(" Success (HTTP 2xx):    %d (%.2f%%)\n", successReqs, successRate)
	fmt.Printf(" Client Errors (4xx):   %d\n", errors4xx)
	fmt.Printf(" Server Errors (5xx):   %d\n", errors5xx)
	fmt.Printf(" Network/Conn Errors:   %d\n", otherErrors)
	fmt.Printf(" Data Transferred:      %.2f MB (%.2f MB/s)\n",
		float64(totalBytes)/(1024*1024),
		float64(totalBytes)/(1024*1024*totalElapsed.Seconds()))

	if len(latencies) > 0 {
		sort.Slice(latencies, func(i, j int) bool { return latencies[i] < latencies[j] })
		n := len(latencies)
		p50 := float64(latencies[n*50/100]) / 1000.0
		p90 := float64(latencies[n*90/100]) / 1000.0
		p95 := float64(latencies[n*95/100]) / 1000.0
		p99 := float64(latencies[n*99/100]) / 1000.0
		p999 := float64(latencies[n*999/1000]) / 1000.0
		maxLat := float64(latencies[n-1]) / 1000.0

		fmt.Println("\n Latency Percentiles (Sampled):")
		fmt.Printf("   P50  (Median):       %.2f ms\n", p50)
		fmt.Printf("   P90:                 %.2f ms\n", p90)
		fmt.Printf("   P95:                 %.2f ms\n", p95)
		fmt.Printf("   P99:                 %.2f ms\n", p99)
		fmt.Printf("   P99.9:               %.2f ms\n", p999)
		fmt.Printf("   Max Latency:         %.2f ms\n", maxLat)
	}

	fmt.Println("================================================================================")
	if successRate >= 99.0 && actualRPS >= float64(*targetRPS)*0.85 {
		fmt.Println(" 🟢 SLO STATUS: PASSED (System meets high-throughput production targets)")
	} else {
		fmt.Println(" 🟡 SLO STATUS: WARNING (Throughput or success rate below optimal SLA)")
	}
	fmt.Println("================================================================================")
}
