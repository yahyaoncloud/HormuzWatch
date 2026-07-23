package config

import "os"

// Primary admin identity is configured via environment variables only.
// Both PRIMARY_ADMIN_EMAIL and PRIMARY_ADMIN_USERNAME must be set.
// Single-admin guarantee: only an account whose email matches
// PrimaryAdminEmail is ever granted the "admin" role.
var (
	PrimaryAdminEmail    = os.Getenv("PRIMARY_ADMIN_EMAIL")
	PrimaryAdminUsername = os.Getenv("PRIMARY_ADMIN_USERNAME")
)
