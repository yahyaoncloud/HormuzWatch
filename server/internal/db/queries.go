package db

import (
	"database/sql"
	"errors"
	"fmt"
	"strings"
)

// Rebind converts SQLite-style ? placeholders to PostgreSQL $n placeholders.
func Rebind(query string) string {
	var b strings.Builder
	n := 1
	for _, ch := range query {
		if ch == '?' {
			b.WriteString(fmt.Sprintf("$%d", n))
			n++
		} else {
			b.WriteRune(ch)
		}
	}
	return b.String()
}

func Exec(query string, args ...any) (sql.Result, error) {
	if DB == nil {
		return nil, errors.New("database connection not available")
	}
	return DB.Exec(Rebind(query), args...)
}

func Query(query string, args ...any) (*sql.Rows, error) {
	if DB == nil {
		return nil, errors.New("database connection not available")
	}
	return DB.Query(Rebind(query), args...)
}

func QueryRow(query string, args ...any) *sql.Row {
	if DB == nil {
		return nil
	}
	return DB.QueryRow(Rebind(query), args...)
}
