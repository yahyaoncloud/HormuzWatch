package main

import (
	"log"

	"Geospatial-harmuz-watch/server/internal/bootstrap"
)

var (
	// Injected at build time via ldflags.
	Version   = "dev"
	BuildTime = "unknown"
	GitCommit = "unknown"
)

func main() {
	app, err := bootstrap.New(Version, BuildTime, GitCommit)
	if err != nil {
		log.Fatalf("Failed to bootstrap server: %v", err)
	}

	if err := app.Run(); err != nil {
		log.Fatalf("Server exited with error: %v", err)
	}
}
