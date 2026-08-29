package bootstrap

import (
	"log"
	"os"
	"path/filepath"
	"runtime"
	"strconv"
	"time"

	"github.com/joho/godotenv"
)

// Config represents runtime configuration values for the server.
type Config struct {
	Port           string
	IsAuthDisabled bool
	AllowedOrigins string
}

// LoadEnv loads .env files from standard paths.
func LoadEnv() {
	_, filename, _, _ := runtime.Caller(0)
	bootstrapDir := filepath.Dir(filename)
	internalDir := filepath.Dir(bootstrapDir)
	serverDir := filepath.Dir(internalDir)
	projectRoot := filepath.Dir(serverDir)

	paths := []string{
		filepath.Join(projectRoot, ".env"),
		filepath.Join(serverDir, ".env"),
		filepath.Join(serverDir, "cmd", ".env"),
		".env",
	}

	for _, path := range paths {
		if err := godotenv.Load(path); err == nil {
			log.Printf("Loaded environment from: %s", path)
			return
		}
	}
	log.Println("Warning: No .env file found in any standard location")
}

// LoadConfig constructs a Config from environment variables.
func LoadConfig() Config {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	return Config{
		Port:           port,
		IsAuthDisabled: os.Getenv("AUTH_DISABLED") == "true",
		AllowedOrigins: os.Getenv("ALLOWED_ORIGINS"),
	}
}

// AtoiEnv reads an integer env var, returning fallback on missing/invalid.
func AtoiEnv(key string, fallback int) int {
	v := os.Getenv(key)
	if v == "" {
		return fallback
	}
	n := 0
	for _, r := range v {
		if r < '0' || r > '9' {
			return fallback
		}
		n = n*10 + int(r-'0')
	}
	if n <= 0 {
		return fallback
	}
	return n
}

// DurationMinutesEnv reads a positive minute interval. A missing or zero
// value disables the corresponding scheduler.
func DurationMinutesEnv(key string) time.Duration {
	value := os.Getenv(key)
	minutes, err := strconv.Atoi(value)
	if value == "" || err != nil || minutes <= 0 {
		return 0
	}
	return time.Duration(minutes) * time.Minute
}
