// Package version holds build-time information injected via ldflags.
package version

// Injected at build time via:
//
//	go build -ldflags="-X main.Version=${VERSION} -X main.BuildTime=... -X main.GitCommit=..."
//
// For shared access, these are copied at startup via version.Init().
var (
	AppVersion = "dev"
	BuildTime  = "unknown"
	GitCommit  = "unknown"
)

// Init sets the version information from main's injected variables.
func Init(ver, build, commit string) {
	if ver != "" {
		AppVersion = ver
	}
	if build != "" {
		BuildTime = build
	}
	if commit != "" {
		GitCommit = commit
	}
}
