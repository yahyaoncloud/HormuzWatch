package db

import (
	"database/sql"
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
	return DB.Exec(Rebind(query), args...)
}

func Query(query string, args ...any) (*sql.Rows, error) {
	return DB.Query(Rebind(query), args...)
}

func QueryRow(query string, args ...any) *sql.Row {
	return DB.QueryRow(Rebind(query), args...)
}
