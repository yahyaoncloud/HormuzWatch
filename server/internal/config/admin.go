package config

import "os"

// Primary admin identity is configured via environment variables.
// Both PRIMARY_ADMIN_EMAIL and PRIMARY_ADMIN_USERNAME must be set.
// Single-admin guarantee: only an account whose email matches
// PrimaryAdminEmail is ever granted the "admin" role.
var (
	PrimaryAdminEmail    string
	PrimaryAdminUsername string
)

// InitAdminConfig re-evaluates admin configuration from environment variables.
// Called during bootstrap lifecycle after .env is parsed.
func InitAdminConfig() {
	PrimaryAdminEmail = os.Getenv("PRIMARY_ADMIN_EMAIL")
	PrimaryAdminUsername = os.Getenv("PRIMARY_ADMIN_USERNAME")
}

func GetPrimaryAdminEmail() string {
	if PrimaryAdminEmail != "" {
		return PrimaryAdminEmail
	}
	return os.Getenv("PRIMARY_ADMIN_EMAIL")
}

func GetPrimaryAdminUsername() string {
	if PrimaryAdminUsername != "" {
		return PrimaryAdminUsername
	}
	return os.Getenv("PRIMARY_ADMIN_USERNAME")
}

func init() {
	InitAdminConfig()
}
