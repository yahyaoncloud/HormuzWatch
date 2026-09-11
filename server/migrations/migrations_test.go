package migrations

import (
	"strings"
	"testing"
)

func TestMigrationFilesConsistency(t *testing.T) {
	entries, err := Files.ReadDir(".")
	if err != nil {
		t.Fatalf("Failed to read embedded migration files: %v", err)
	}

	upVersions := make(map[string]bool)
	downVersions := make(map[string]bool)

	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}
		name := entry.Name()
		if strings.HasSuffix(name, ".up.sql") {
			v := strings.TrimSuffix(name, ".up.sql")
			upVersions[v] = true
		} else if strings.HasSuffix(name, ".down.sql") {
			v := strings.TrimSuffix(name, ".down.sql")
			downVersions[v] = true
		}
	}

	if len(upVersions) == 0 {
		t.Fatal("Expected at least one .up.sql migration, found none")
	}

	for v := range upVersions {
		if !downVersions[v] {
			t.Errorf("Migration %s has a .up.sql file but lacks a matching .down.sql rollback file", v)
		}

		upContent, err := Files.ReadFile(v + ".up.sql")
		if err != nil || len(upContent) == 0 {
			t.Errorf("Failed to read or empty content in %s.up.sql", v)
		}

		downContent, err := Files.ReadFile(v + ".down.sql")
		if err != nil || len(downContent) == 0 {
			t.Errorf("Failed to read or empty content in %s.down.sql", v)
		}
	}
}
