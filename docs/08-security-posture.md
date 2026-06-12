# Security Posture & Vulnerability Analysis

This document outlines the current security posture of the HormuzWatch platform, specifically focusing on API integrity, database read/write isolation, URL hacking (IDOR), and user-based authentication gaps identified during the MVP transition to PostgreSQL and Supabase.

> [!WARNING]
> The vulnerabilities listed below must be remediated before the application can be considered production-ready.

## 1. URL Hacking & Broken Object Level Authorization (IDOR)
Currently, several API endpoints do not verify object ownership before performing operations. This means a malicious user could guess or enumerate IDs to manipulate data they do not own.

*   **Vulnerable Endpoints:**
    *   `POST /watchlist/:id`
    *   `DELETE /watchlist/:id`
*   **The Issue:** The backend extracts the `:id` parameter from the URL but never checks if the authenticated user owns that specific watchlist item. Since the watchlist is conceptually a per-user feature, failing to check ownership allows **User A** to delete or modify **User B**'s watchlist by simply firing a `DELETE /watchlist/TRACK_123` request.

## 2. Database R/W & Data Isolation
The transition from a single-user local SQLite database to a multi-tenant PostgreSQL database exposed a critical data isolation flaw.

*   **Vulnerable Tables:** `watchlist`, `settings`
*   **The Issue:** The schema for the `watchlist` and `settings` tables lacks a `user_id` column. 
    *   When `GET /watchlist` is called, it executes `SELECT * FROM watchlist`. 
    *   Because there is no partitioning by `user_id`, the watchlist is treated as a **global, shared resource**. Any track added by one user becomes instantly visible to all other users.
*   **Remediation Required:** We must run a database migration to add `user_id TEXT REFERENCES users(id)` to the `watchlist` and `settings` tables, and update the backend queries to append `WHERE user_id = $1`.

## 3. API Compromise & SQL Syntax (Denial of Service)
The recent database migration from SQLite to PostgreSQL introduced several query syntax regressions that crash endpoints.

*   **The Issue:** While Go's `database/sql` mitigates traditional SQL Injection via parameterized queries, several files (e.g., `history.go`, `watchlist.go`) are still using SQLite's `?` placeholder syntax instead of PostgreSQL's `$1`, `$2` syntax.
*   **Impact:** When an attacker hits these endpoints, the PostgreSQL driver fails to parse the `?` placeholder, resulting in a database panic and returning a `500 Internal Server Error`. While this doesn't expose data, it serves as a trivial **Denial of Service (DoS)** vector against the API.
*   **Remediation Required:** Audit all `db.Query` and `db.Exec` calls in `server/internal/api/*.go` and replace `?` with positional PostgreSQL placeholders (`$1`).

## 4. User-Based Authentication Context
The hybrid auth architecture (Supabase + Go) successfully restricts access so that only `approved` users can hit the API. However, the authorization context is dropped immediately after the middleware layer.

*   **The Issue:** The `JWTMiddleware` successfully extracts the `user_id` (from the Supabase `sub` claim) and verifies it against the `users` table. However, it does not inject this `user_id` into the `gin.Context`.
*   **Impact:** Because the handlers (`watchlist.go`, `settings.go`, etc.) do not know *who* is making the request, they cannot enforce user-based data isolation.
*   **Remediation Required:**
    1. Update `JWTMiddleware` to call `c.Set("user_id", userID)`.
    2. Update all handlers to retrieve `userID := c.GetString("user_id")`.
    3. Pass this `userID` into the SQL queries to enforce row-level security.
