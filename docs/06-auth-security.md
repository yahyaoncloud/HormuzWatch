# Authentication & Security

## 1. Authentication Architecture

HormuzWatch implements a **Stateless JWT + Stateful Session Registration** hybrid model. 

### Why this model?
Pure stateless JWTs cannot be immediately revoked without a blacklist. For a security dashboard, immediate access revocation is critical. By tracking sessions in SQLite alongside JWTs, we achieve the performance of stateless validation with the security of stateful revocation.

---

## 2. Token Lifecycle & Flows

### 2.1 Registration Flow
1. User POSTs `{username, email, password}` to `/auth/register`
2. Server hashes password using `bcrypt.GenerateFromPassword(..., bcrypt.DefaultCost)`
3. UUID generated for user
4. Inserted into `users` table with `status = 'pending'`
5. Asynchronous notification sent to administrator email
6. **User is blocked from logging in until an Admin approves them.**

### 2.2 Login & Token Generation
1. User POSTs credentials to `/auth/login`
2. Server verifies password via `bcrypt.CompareHashAndPassword()`
3. Server checks `status` (fails if `pending` or `blacklisted`)
4. Generates a new `sessionID` UUID
5. Inserts session into `sessions` SQLite table
6. Generates HMAC-SHA256 JWT using `JWT_SECRET`
   - **Payload includes:** `username`, `email`, `role`, `sessionID`, `exp` (24h TTL)
7. Returns JWT to client.

### 2.3 Token Storage & Client Security
**Tokens are NOT stored in `localStorage` or `sessionStorage`.**
To mitigate XSS token theft, the React `AuthContext` stores the token inside a module-level variable closure.
* **Tradeoff:** A page refresh destroys the session state, forcing the user to log in again. This is an intentional security posture for a defense-oriented dashboard.

### 2.4 Token Validation (API Requests)
The `JWTMiddleware` executes on protected routes:
1. Validates JWT signature.
2. Extracts `sessionID` from the payload.
3. Queries SQLite: `SELECT expires_at FROM sessions WHERE id = ? AND revoked_at IS NULL`
4. If session is valid, injects `AuthenticatedUser` into the Gin context.

### 2.5 Logout & Revocation
1. User calls `/auth/logout`
2. Server executes `UPDATE sessions SET revoked_at = NOW() WHERE id = ?`
3. Subsequent API calls fail at the middleware database check, rendering the token instantly useless even if the JWT `exp` has not been reached.

---

## 3. Role-Based Access Control (RBAC)

| Role | Access Level |
|---|---|
| `user` | Standard dashboard, analytics, settings |
| `admin` | Everything + User Management (`/admin`) |

The `AdminOnlyMiddleware` enforces role boundaries. An initial immutable admin account is injected into the database on server startup using the `.env` credentials.

### User States
- `pending`: Cannot login. Awaiting approval.
- `approved`: Normal access.
- `blacklisted`: Cannot login. Existing sessions immediately revoked.

---

## 4. Auth-Disabled Mode (Development)

To facilitate rapid local development and testing, the server supports an `AUTH_DISABLED=true` environment variable.

When enabled:
- The `JWTMiddleware` intercepts requests and injects a "Virtual Admin Session" (`sessionID = "auth-disabled-session"`, `role = "admin"`).
- Database session lookups are completely bypassed.
- **Security Control:** Ensure production deployment environments explicitly set `AUTH_DISABLED=false`.

---

## 5. Security Controls & Mitigation

| Threat | Mitigation |
|---|---|
| **SQL Injection** | All DB queries use parameterized queries (`?`) via `database/sql`. |
| **XSS (Token Theft)** | JWT is stored in closure memory, inaccessible to `window.localStorage`. |
| **Brute Force** | API rate-limiting applied via token bucket middleware (1 req/sec average). |
| **Insecure Passwords** | Minimum length 6 required, bcrypt hashing applied immediately. |
| **Account Takeover** | Immediate session revocation via admin blacklist. |
| **CORS Abuse** | Production must configure explicit `Access-Control-Allow-Origin` domains. |

---

## 6. Secrets Management

Secrets are managed via environment variables and injected at runtime. In Azure, these are sourced from **Azure Key Vault** and mapped to Container App environment variables.

| Secret | Purpose |
|---|---|
| `JWT_SECRET` | Signing key for HMAC-SHA256 tokens |
| `AISSTREAM_API_KEY` | Real-time vessel data access |
| `OPENSKY_PASSWORD` | Real-time aircraft data access |
| `DATABASE_URL` | Optional PostgreSQL connection string |
