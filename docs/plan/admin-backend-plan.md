# HormuzWatch Admin Backend — Implementation Plan

> **Version:** 1.0
> **Date:** 2026-07-24
> **Status:** Planning — Architecture & Gap Analysis Complete

---

## Table of Contents

1. [Current State Audit](#1-current-state-audit)
2. [Gap Analysis — What's Missing](#2-gap-analysis--whats-missing)
3. [Database Schema Design](#3-database-schema-design)
4. [RBAC & Permission Model](#4-rbac--permission-model)
5. [Admin API Surface](#5-admin-api-surface)
6. [Authentication Architecture](#6-authentication-architecture)
7. [LLM Administration](#7-llm-administration)
8. [ML Administration](#8-ml-administration)
9. [Monitoring & Observability](#9-monitoring--observability)
10. [Audit & Activity Logging](#10-audit--activity-logging)
11. [CMS & Content Management](#11-cms--content-management)
12. [Notification Center](#12-notification-center)
13. [Implementation Phases](#13-implementation-phases)

---

## 1. Current State Audit

### 1.1 What Exists Today

| Capability | Status | Details |
|---|---|---|
| User registration/login | ✅ Working | JWT auth, bcrypt passwords, sessions table |
| Admin approval flow | ✅ Working | Pending → Approved flow, email notifications |
| Single-admin RBAC | ✅ Working | `AdminOnlyMiddleware`, one admin email |
| Settings DB table | ✅ Working | Key-value settings, 6 default keys |
| Settings API | ✅ Working | `GET/POST /settings` with typed `SettingsData` |
| Settings Admin UI | ✅ Working | LLM provider switcher, feature toggles |
| User management API | ✅ Working | Approve/blacklist/delete/list users |
| Admin frontend layout | ✅ Working | 13-page layout with sidebar, auth guard |
| Supabase auth bridge | ✅ Partial | Token validation only, no admin-specific flow |
| Audit logging | ❌ Missing | No audit table or API |
| Feature flags | ❌ Missing | No `feature_flags` table or toggle system |
| Monitoring endpoints | ❌ Partial | Only queue metrics, no health aggregation |
| CMS capabilities | ❌ Missing | No content storage or API |
| ML config from admin | ❌ Missing | All ML config is env-var or hardcoded |
| LLM provider routing | ❌ Broken | Settings table has provider config but Go code ignores it |

### 1.2 Critical Architectural Issue: Dual LLM Configuration

The `openrouter.go` intelligence client reads `OPENROUTER_API_KEY` from environment variables. The `settings` table stores `openrouter_api_key`, `deepseek_api_key`, etc. — but the Go backend **never reads them**. The 5-provider admin settings UI controls dead switches. This must be unified.

### 1.3 Critical Architectural Issue: Single-Admin Hardcode

The system hardcodes one email as admin via `PRIMARY_ADMIN_EMAIL`. The `AdminOnlyMiddleware` checks email equality, not role/permission. There is no way to add a second admin without code changes. The admin promotion logic in `db.go` deletes/demotes non-primary accounts on every startup. This must be replaced with proper RBAC.

---

## 2. Gap Analysis — What's Missing

### 2.1 Dashboard & Monitoring

| Feature | Priority | What's Needed |
|---|---|---|
| Platform overview dashboard | MVP | API aggregating vessel/aircraft counts, alert counts, uptime |
| Service health status | MVP | Health check aggregation (Go, gRPC, ML, DB, cache) |
| Queue/worker metrics | MVP | Existing `QueueMetrics()` need a REST endpoint |
| API usage stats | Production | Request counts, latency percentiles per endpoint |
| LLM usage & cost | Production | Token counts, cost per provider per day |
| Storage usage | Production | DB size, telemetry table row counts |
| Notification metrics | Enterprise | Delivery rate, open rate per channel |

### 2.2 Intelligence Data Management

| Feature | Priority | Current | Needed |
|---|---|---|---|
| Dataset CRUD | MVP | 6-seed events hardcoded | Full CRUD API + admin UI |
| Publish/unpublish | MVP | None | `is_published` flag, visibility toggle |
| Categories/tags | MVP | None | `categories` + `tags` tables |
| Approval workflow | Production | None | Draft → Review → Published flow |
| Regional visibility | Enterprise | None | Per-region show/hide |
| Source attribution | MVP | None | `source_url`, `source_name`, `attribution_text` |

### 2.3 CMS / Content Management

| Feature | Priority | Current | Needed |
|---|---|---|---|
| Page content storage | MVP | None | `cms_pages` table, markdown content |
| Homepage/hero editing | MVP | None | Editable from admin without code deploy |
| Navigation management | Production | None | Dynamic nav items from DB |
| SEO metadata | MVP | None | Title, description, og:image per page |
| Versioned docs | Production | None | Docs pages with version history |
| FAQ management | Production | None | FAQ CRUD with categories |
| Announcements | MVP | None | Publish announcements to all users |

### 2.4 Intelligence Module Controls

| Feature | Priority | Current | Needed |
|---|---|---|---|
| Vessel Tracking toggle | MVP | `aisstream_enabled` in settings | Already exists |
| Aircraft Tracking toggle | MVP | `opensky_enabled` in settings | Already exists |
| Heatmap toggle | MVP | `heatmap_enabled` in settings | Already exists |
| ML Detection toggle | MVP | None | `ml_enabled` feature flag |
| AI Insights toggle | Production | `llm_threat_analysis_enabled` | Exists but not wired to code |
| Risk Engine toggle | Production | None | New feature flag |
| Historical Replay toggle | Production | None | New feature flag |
| Export API toggle | Production | None | New feature flag |

### 2.5 Auth & RBAC Gaps

| Feature | Priority | Gap |
|---|---|---|
| Multiple admin roles | MVP | Only one hardcoded admin |
| Granular permissions | MVP | No permissions table/model |
| MFA for admins | Production | Supabase MFA not integrated |
| IP allowlist | Production | No middleware or config |
| Session timeout control | MVP | Hardcoded 24h in code |
| Brute-force protection | MVP | No login rate limiter |
| JWT refresh token rotation | Production | Refresh endpoint exists but no rotation |
| Audit trail for auth events | MVP | No audit logging at all |

---

## 3. Database Schema Design

### 3.1 New Tables (Phase 1 — MVP)

```sql
-- ── Roles & Permissions ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS roles (
    id          TEXT PRIMARY KEY,          -- e.g. "super_admin", "analyst"
    name        TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS role_permissions (
    role_id     TEXT REFERENCES roles(id) ON DELETE CASCADE,
    permission  TEXT NOT NULL,             -- e.g. "users:read", "settings:write"
    PRIMARY KEY (role_id, permission)
);

CREATE TABLE IF NOT EXISTS user_roles (
    user_id     TEXT REFERENCES users(id) ON DELETE CASCADE,
    role_id     TEXT REFERENCES roles(id) ON DELETE CASCADE,
    granted_by  TEXT,
    granted_at  TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, role_id)
);

-- ── Extended Settings (replaces key-value settings table) ──────────────────

CREATE TABLE IF NOT EXISTS platform_config (
    key         TEXT PRIMARY KEY,
    value       JSONB NOT NULL,            -- Typed values: strings, bools, objects
    category    TEXT NOT NULL,             -- "llm", "ml", "feature_flag", "general"
    description TEXT,
    updated_by  TEXT,
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── Feature Flags ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS feature_flags (
    name        TEXT PRIMARY KEY,          -- e.g. "vessel_tracking"
    enabled     BOOLEAN NOT NULL DEFAULT TRUE,
    visibility  TEXT NOT NULL DEFAULT 'public',  -- "public", "internal", "admin"
    roles       JSONB DEFAULT '[]',        -- roles that can access
    updated_by  TEXT,
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── CMS Pages ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS cms_pages (
    slug        TEXT PRIMARY KEY,          -- "homepage", "about", "docs/getting-started"
    title       TEXT NOT NULL,
    content     TEXT NOT NULL,             -- Markdown or MDX
    meta_title  TEXT,
    meta_description TEXT,
    og_image    TEXT,
    is_published BOOLEAN DEFAULT FALSE,
    version     INTEGER DEFAULT 1,
    created_by  TEXT,
    updated_by  TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── Audit Log ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS audit_log (
    id          BIGSERIAL PRIMARY KEY,
    actor_id    TEXT,                      -- user who performed the action
    actor_email TEXT,
    action      TEXT NOT NULL,             -- "user.login", "settings.update", "dataset.publish"
    resource    TEXT,                      -- affected resource identifier
    details     JSONB,                     -- before/after values, metadata
    ip_address  TEXT,
    user_agent  TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_actor ON audit_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at DESC);

-- ── Notifications ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS notifications (
    id          BIGSERIAL PRIMARY KEY,
    title       TEXT NOT NULL,
    body        TEXT NOT NULL,
    channel     TEXT NOT NULL DEFAULT 'in_app', -- "in_app", "email", "push", "broadcast"
    target_type TEXT NOT NULL DEFAULT 'all',    -- "all", "role", "user"
    target_id   TEXT,                           -- role_id or user_id
    scheduled_for TIMESTAMPTZ,                  -- NULL = send immediately
    sent_at     TIMESTAMPTZ,
    status      TEXT DEFAULT 'pending',         -- "pending", "sent", "failed"
    created_by  TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notification_deliveries (
    id              BIGSERIAL PRIMARY KEY,
    notification_id BIGINT REFERENCES notifications(id),
    user_id         TEXT REFERENCES users(id),
    delivered_at    TIMESTAMPTZ DEFAULT NOW(),
    read_at         TIMESTAMPTZ,
    channel         TEXT NOT NULL
);

-- ── Dataset Management ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS datasets (
    id          TEXT PRIMARY KEY,
    title       TEXT NOT NULL,
    description TEXT,
    category    TEXT,
    tags        JSONB DEFAULT '[]',
    source_name TEXT,
    source_url  TEXT,
    region      TEXT,                      -- "Persian Gulf", "Red Sea", "Global"
    is_published BOOLEAN DEFAULT FALSE,
    is_featured  BOOLEAN DEFAULT FALSE,
    visibility   TEXT DEFAULT 'public',    -- "public", "internal", "private"
    data        JSONB,                     -- The actual dataset payload
    created_by  TEXT,
    updated_by  TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── API Keys ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS api_keys (
    id          TEXT PRIMARY KEY,
    user_id     TEXT REFERENCES users(id),
    name        TEXT NOT NULL,             -- "HormuzWatch Dashboard", "External Analyst"
    key_hash    TEXT NOT NULL,             -- SHA-256 of the API key
    prefix      TEXT NOT NULL,             -- First 8 chars for display (e.g. "hw_sk_a1b2c3d4")
    permissions JSONB DEFAULT '[]',
    last_used   TIMESTAMPTZ,
    expires_at  TIMESTAMPTZ,
    revoked_at  TIMESTAMPTZ,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── LLM Usage Tracking ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS llm_usage (
    id          BIGSERIAL PRIMARY KEY,
    provider    TEXT NOT NULL,             -- "openrouter", "openai", "deepseek"...
    model       TEXT NOT NULL,
    endpoint    TEXT NOT NULL,             -- "translate", "classify_threat", "summarize"
    prompt_tokens   INTEGER DEFAULT 0,
    completion_tokens INTEGER DEFAULT 0,
    total_tokens    INTEGER DEFAULT 0,
    cost_usd    REAL DEFAULT 0.0,
    latency_ms  REAL,
    status      TEXT DEFAULT 'success',    -- "success", "error"
    error_msg   TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);
```

### 3.2 Migration from Existing Schema

```sql
-- Migrate existing settings to platform_config
INSERT INTO platform_config (key, value, category)
SELECT key, to_jsonb(value::text), 'general'
FROM settings
ON CONFLICT (key) DO NOTHING;

-- Seed default roles
INSERT INTO roles (id, name, description) VALUES
    ('super_admin', 'Super Admin', 'Full platform access'),
    ('admin', 'Platform Admin', 'Manage platform configuration and users'),
    ('analyst', 'Intelligence Analyst', 'View and analyze intelligence data'),
    ('editor', 'Content Editor', 'Manage CMS content and datasets'),
    ('moderator', 'Moderator', 'Review and approve content'),
    ('viewer', 'Read-only Viewer', 'View-only access to dashboards')
ON CONFLICT (id) DO NOTHING;

-- Seed default permissions
INSERT INTO role_permissions (role_id, permission) VALUES
    ('super_admin', '*'),
    ('admin', 'users:read'), ('admin', 'users:write'),
    ('admin', 'settings:read'), ('admin', 'settings:write'),
    ('admin', 'datasets:read'), ('admin', 'datasets:write'),
    ('admin', 'cms:read'), ('admin', 'cms:write'),
    ('admin', 'audit:read'),
    ('analyst', 'datasets:read'), ('analyst', 'dashboard:read'),
    ('editor', 'cms:read'), ('editor', 'cms:write'),
    ('editor', 'datasets:read'), ('editor', 'datasets:write'),
    ('moderator', 'datasets:approve'), ('moderator', 'users:read'),
    ('viewer', 'dashboard:read')
ON CONFLICT DO NOTHING;
```

---

## 4. RBAC & Permission Model

### 4.1 Permission String Convention

```
resource:action
```

| Pattern | Examples |
|---|---|
| `*` | All permissions (super admin) |
| `users:*` | All user operations |
| `users:read` | List/view users |
| `users:write` | Create/update/delete users |
| `settings:read` | View settings |
| `settings:write` | Update settings |
| `datasets:*` | All dataset operations |
| `cms:*` | All CMS operations |
| `audit:read` | View audit logs |
| `dashboard:read` | View dashboards |
| `llm:configure` | Change LLM provider/API keys |
| `ml:configure` | Change ML model/thresholds |
| `notifications:send` | Send notifications |
| `api_keys:manage` | Create/revoke API keys |

### 4.2 Middleware Chain

```
Request → JWTMiddleware → RBACMiddleware(resource:action) → Handler
                                │
                    ┌───────────┴───────────┐
                    │ Load user roles        │
                    │ Load role permissions  │
                    │ Check permission match │
                    └───────────┬───────────┘
                                │
                        ┌───────┴───────┐
                        │ Granted?       │
                        │ YES → next()  │
                        │ NO  → 403     │
                        └───────────────┘
```

### 4.3 Go Middleware Implementation

```go
// RequirePermission returns a middleware that checks the authenticated user
// has the specified permission via their assigned roles.
func RequirePermission(permission string) gin.HandlerFunc {
    return func(c *gin.Context) {
        user := GetAuthUser(c)
        if user == nil {
            c.AbortWithStatusJSON(401, gin.H{"error": "authentication required"})
            return
        }
        // Super admin bypass
        if hasPermission(user.ID, "*") {
            c.Next()
            return
        }
        if !hasPermission(user.ID, permission) {
            auditLog(user.ID, "access.denied", permission, nil)
            c.AbortWithStatusJSON(403, gin.H{"error": "insufficient permissions"})
            return
        }
        c.Next()
    }
}
```

### 4.4 Role Hierarchy

```
super_admin  ──── * (all permissions)
    │
admin        ──── users:*, settings:*, datasets:*, cms:*, audit:read
    │
analyst      ──── datasets:read, dashboard:read
editor       ──── cms:*, datasets:*
moderator    ──── datasets:approve, users:read
viewer       ──── dashboard:read
```

---

## 5. Admin API Surface

### 5.1 Dashboard APIs

| Method | Endpoint | Permission | Description |
|---|---|---|---|
| `GET` | `/admin/dashboard/overview` | `dashboard:read` | Platform KPIs (vessels, aircraft, alerts, users) |
| `GET` | `/admin/dashboard/health` | `dashboard:read` | Service health for all components |
| `GET` | `/admin/dashboard/queue` | `dashboard:read` | Pipeline queue metrics |
| `GET` | `/admin/dashboard/usage` | `dashboard:read` | API usage, LLM tokens, storage |

### 5.2 User & Role Management

| Method | Endpoint | Permission | Description |
|---|---|---|---|
| `GET` | `/admin/users` | `users:read` | List all users with roles |
| `GET` | `/admin/users/:id` | `users:read` | User detail with role/permission summary |
| `PUT` | `/admin/users/:id/roles` | `users:write` | Assign/remove roles |
| `PUT` | `/admin/users/:id/status` | `users:write` | Change status (approved/pending/suspended) |
| `DELETE` | `/admin/users/:id` | `users:write` | Delete user |
| `GET` | `/admin/roles` | `users:read` | List all roles with permissions |
| `POST` | `/admin/roles` | `users:write` | Create role with permissions |
| `PUT` | `/admin/roles/:id` | `users:write` | Update role permissions |
| `DELETE` | `/admin/roles/:id` | `users:write` | Delete role |

### 5.3 Settings & Configuration

| Method | Endpoint | Permission | Description |
|---|---|---|---|
| `GET` | `/admin/config` | `settings:read` | All platform config grouped by category |
| `PUT` | `/admin/config/:key` | `settings:write` | Update single config value |
| `GET` | `/admin/feature-flags` | `settings:read` | All feature flags |
| `PUT` | `/admin/feature-flags/:name` | `settings:write` | Toggle feature flag |

### 5.4 LLM Administration

| Method | Endpoint | Permission | Description |
|---|---|---|---|
| `GET` | `/admin/llm/providers` | `llm:configure` | All LLM provider configs |
| `PUT` | `/admin/llm/providers/:name` | `llm:configure` | Update provider config |
| `POST` | `/admin/llm/test` | `llm:configure` | Test provider connectivity |
| `GET` | `/admin/llm/usage` | `llm:configure` | Token usage & cost (daily/monthly) |
| `GET` | `/admin/llm/prompts` | `llm:configure` | List prompt templates |
| `PUT` | `/admin/llm/prompts/:name` | `llm:configure` | Update prompt template |

### 5.5 ML Administration

| Method | Endpoint | Permission | Description |
|---|---|---|---|
| `GET` | `/admin/ml/status` | `ml:configure` | ML service health, active models |
| `GET` | `/admin/ml/models` | `ml:configure` | List all model versions per domain |
| `POST` | `/admin/ml/models/activate` | `ml:configure` | Activate a model version |
| `POST` | `/admin/ml/train` | `ml:configure` | Trigger training job |
| `GET` | `/admin/ml/metrics` | `ml:configure` | Precision/recall/F1 per domain |

### 5.6 CMS APIs

| Method | Endpoint | Permission | Description |
|---|---|---|---|
| `GET` | `/admin/cms/pages` | `cms:read` | List all CMS pages |
| `GET` | `/admin/cms/pages/:slug` | `cms:read` | Get page content + metadata |
| `PUT` | `/admin/cms/pages/:slug` | `cms:write` | Update page content |
| `POST` | `/admin/cms/pages/:slug/publish` | `cms:write` | Publish a page |
| `GET` | `/admin/cms/pages/:slug/versions` | `cms:read` | Version history |
| `POST` | `/admin/cms/pages/:slug/restore` | `cms:write` | Restore a previous version |

### 5.7 Dataset Management

| Method | Endpoint | Permission | Description |
|---|---|---|---|
| `GET` | `/admin/datasets` | `datasets:read` | List all datasets |
| `POST` | `/admin/datasets` | `datasets:write` | Create dataset |
| `PUT` | `/admin/datasets/:id` | `datasets:write` | Update dataset |
| `DELETE` | `/admin/datasets/:id` | `datasets:write` | Delete dataset |
| `POST` | `/admin/datasets/:id/publish` | `datasets:write` | Publish dataset |
| `POST` | `/admin/datasets/:id/approve` | `datasets:approve` | Approve dataset (moderator) |

### 5.8 Audit & Activity

| Method | Endpoint | Permission | Description |
|---|---|---|---|
| `GET` | `/admin/audit` | `audit:read` | Paginated audit log with filters |
| `GET` | `/admin/audit/users/:id` | `audit:read` | User-specific activity |

### 5.9 Notifications

| Method | Endpoint | Permission | Description |
|---|---|---|---|
| `POST` | `/admin/notifications` | `notifications:send` | Send notification |
| `GET` | `/admin/notifications` | `notifications:send` | Notification history |
| `GET` | `/admin/notifications/templates` | `notifications:send` | List templates |
| `PUT` | `/admin/notifications/templates/:name` | `notifications:send` | Update template |

### 5.10 API Key Management

| Method | Endpoint | Permission | Description |
|---|---|---|---|
| `POST` | `/admin/api-keys` | `api_keys:manage` | Create API key |
| `GET` | `/admin/api-keys` | `api_keys:manage` | List API keys (prefix + metadata only) |
| `POST` | `/admin/api-keys/:id/revoke` | `api_keys:manage` | Revoke API key |

---

## 6. Authentication Architecture

### 6.1 Public User Flow

```
Registration: username + password → bcrypt hash → status=pending → admin approval
Login: credentials → bcrypt verify → JWT access (1h) + refresh (7d) tokens
Token refresh: POST /auth/refresh → new access token
Session: sessions table tracks active sessions with expiry
```

**Improvements needed:**
- Add login rate limiting (5 failures in 15 min = lockout)
- Add `failed_login_attempts` and `locked_until` columns to users
- JWT access token expiry via env var (currently hardcoded)
- Token blacklist for immediate revocation
- `remember_me` support with extended refresh token expiry

### 6.2 Admin Authentication Flow

```
Admin Login → Supabase Auth (email + password) → MFA challenge (TOTP) → JWT
   → RBAC middleware checks role.permissions → Handler
```

**Implementation:**
- Supabase Auth handles identity, MFA, password policy
- RBAC middleware translates Supabase claims to HormuzWatch roles
- `validateSupabaseSession()` already exists — extend it to populate roles
- Admin session stored in `sessions` table with `is_admin BOOLEAN` flag
- Force re-auth for sensitive operations (config changes, user deletion)

### 6.3 Login Rate Limiting

```go
// In auth/handlers.go Login():
var loginLimiter = NewRateLimiter(5, 15*time.Minute) // 5 attempts per 15 min per IP

func Login(c *gin.Context) {
    ip := c.ClientIP()
    if loginLimiter.IsLimited(ip) {
        auditLog("", "login.blocked", ip, nil)
        c.JSON(429, gin.H{"error": "too many attempts, try again later"})
        return
    }
    // ... normal login flow ...
    if invalidPassword {
        loginLimiter.Increment(ip)
        auditLog(username, "login.failed", ip, gin.H{"reason": "invalid_password"})
        return
    }
    loginLimiter.Reset(ip)
}
```

### 6.4 Refresh Token Rotation

```
1. Client sends refresh token
2. Server validates refresh token
3. Server issues new access token + new refresh token
4. Server invalidates old refresh token (marks revoked in sessions table)
5. Client stores new tokens
```

---

## 7. LLM Administration

### 7.1 Unified LLM Provider Architecture

The dual-config problem must be solved. The `openrouter.go` client currently reads from env vars. The settings table has provider configs that Go ignores.

**Solution: LLM Provider Registry**

```go
// New file: internal/intelligence/llm/registry.go
type LLMProvider interface {
    Name() string
    Chat(ctx, systemPrompt, userMessage, maxTokens) (string, error)
    IsAvailable() bool
}

type LLMRegistry struct {
    providers map[string]LLMProvider
    active    string  // currently active provider name
    fallback  []string // fallback chain
}

func (r *LLMRegistry) Chat(...) (string, error) {
    // Try active provider
    // On failure, try fallback chain
    // Track usage in llm_usage table
}

// Providers read their config from platform_config table, NOT env vars:
type OpenRouterProvider struct {
    apiKey string  // from platform_config: llm.openrouter.api_key
    model  string  // from platform_config: llm.openrouter.model
}
```

### 7.2 Prompt Template Management

Store prompt templates in the DB (not hardcoded):

```sql
CREATE TABLE IF NOT EXISTS prompt_templates (
    name        TEXT PRIMARY KEY,          -- "translate", "classify_threat", "summarize"
    system_prompt TEXT NOT NULL,
    user_template TEXT,                    -- {{.Title}} {{.Content}} placeholders
    temperature REAL DEFAULT 0.7,
    max_tokens   INTEGER DEFAULT 1024,
    version     INTEGER DEFAULT 1,
    updated_by  TEXT,
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 8. ML Administration

### 8.1 ML Config from Admin Panel

Currently all ML config is environment-variable or hardcoded:

| Config | Current | After |
|---|---|---|
| ML service address | `ML_SERVICE_ADDR` env | `platform_config` → `ml.grpc_address` |
| gRPC timeout | Hardcoded 2s | `platform_config` → `ml.grpc_timeout_ms` |
| Anomaly threshold | Hardcoded `score > 0` | `platform_config` → `ml.anomaly_threshold` |
| Contamination | Hardcoded 0.05 | `platform_config` → `ml.contamination` |
| Auto-train enabled | `ML_AUTO_TRAIN_ENABLED` env | `feature_flags` → `ml_auto_train` |
| Detection domain | Hardcoded "vessel" only | `feature_flags` → per-domain toggles |

### 8.2 Model Version Management

```go
// New file: internal/api/admin_ml.go
func GetMLModels(c *gin.Context) {
    // Call Python ML service: GET /api/models
    // Returns: { domain: { version, metrics, artifact_size, trained_at } }
}

func ActivateModel(c *gin.Context) {
    // POST /admin/ml/models/activate { domain, version }
    // Calls Python ML service to swap active model
}
```

---

## 9. Monitoring & Observability

### 9.1 Health Aggregation Endpoint

```go
// GET /admin/health
func GetAdminHealth(c *gin.Context) {
    health := AdminHealth{
        Server:    checkServerHealth(),
        Database:  checkDatabaseHealth(),
        MLService: checkMLHealth(),       // gRPC ping to Python
        LLMProvider: checkLLMHealth(),     // Quick test call
        Redis:     checkRedisHealth(),     // If using Redis
        Queue:     intelligence.QueueMetrics(),
        Uptime:    time.Since(startTime).String(),
    }
    // Calculate overall status from component statuses
    c.JSON(200, health)
}
```

### 9.2 Metric Endpoints

| Endpoint | Description |
|---|---|
| `GET /admin/metrics/api` | Request count, latency (p50/p95/p99), error rate per endpoint |
| `GET /admin/metrics/llm` | Token usage per provider/day, cost, latency |
| `GET /admin/metrics/ml` | Predictions/sec, avg latency, model version per domain |
| `GET /admin/metrics/db` | Connection pool stats, query latency, table sizes |

---

## 10. Audit & Activity Logging

### 10.1 What to Log

Every state-changing operation logs:

| Event | Details Logged |
|---|---|
| `user.login` | IP, success/fail, user agent |
| `user.logout` | Session ID |
| `user.created` | Created by whom |
| `user.role_changed` | Old roles → new roles |
| `settings.updated` | Key changed, old value, new value |
| `feature_flag.toggled` | Flag name, old state, new state |
| `llm.provider_changed` | Old provider, new provider |
| `llm.api_key_rotated` | Provider name (never log the key) |
| `ml.model_activated` | Domain, old version, new version |
| `dataset.published` | Dataset ID, title |
| `cms.page_updated` | Page slug, version number |
| `notification.sent` | Channel, target count |
| `api_key.created` | Key prefix, permissions |

### 10.2 Audit Logger Implementation

```go
func AuditLog(ctx *gin.Context, action, resource string, details map[string]interface{}) {
    user := GetAuthUser(ctx)
    entry := AuditEntry{
        ActorID:    user.ID,
        ActorEmail: user.Email,
        Action:     action,
        Resource:   resource,
        Details:    details,
        IPAddress:  ctx.ClientIP(),
        UserAgent:  ctx.Request.UserAgent(),
    }
    // Fire-and-forget write to audit_log table
    go db.InsertAuditLog(entry)
}
```

---

## 11. CMS & Content Management

### 11.1 Page Model

```go
type CMSPage struct {
    Slug            string    `json:"slug"`
    Title           string    `json:"title"`
    Content         string    `json:"content"`         // Markdown
    MetaTitle       string    `json:"metaTitle"`
    MetaDescription string    `json:"metaDescription"`
    OgImage         string    `json:"ogImage"`
    IsPublished     bool      `json:"isPublished"`
    Version         int       `json:"version"`
    CreatedAt       time.Time `json:"createdAt"`
    UpdatedAt       time.Time `json:"updatedAt"`
}
```

### 11.2 Content Delivery (Public)

Public pages served via:
- `GET /public/page/:slug` → returns `CMSPage` (if `is_published=true`)
- Frontend renders markdown with React Markdown component
- SEO metadata injected by Helmet/React Head

### 11.3 Content Workflow

```
Draft (is_published=false)
  → Editor saves → Version incremented
  → Editor clicks "Publish" → is_published=true, old published version archived
  → Public API serves new version
```

---

## 12. Notification Center

### 12.1 Notification Channels

| Channel | Implementation |
|---|---|
| In-app | Stored in `notifications` table, delivered via WebSocket |
| Email | SMTP via existing `auth/email.go` |
| Push | Future — Firebase Cloud Messaging or Web Push API |
| Broadcast | Admin announcement visible to all users on dashboard |

### 12.2 Template System

```sql
-- Seed default templates
INSERT INTO notification_templates (name, subject_template, body_template) VALUES
    ('user_approved', 'Your HormuzWatch access has been approved',
     'Hello {{.Username}}, your account has been approved. You can now log in.'),
    ('emergency_alert', 'URGENT: {{.Title}}',
     '{{.Body}}'),
    ('dataset_published', 'New intelligence dataset: {{.Title}}',
     'A new dataset "{{.Title}}" has been published. View it at {{.URL}}');
```

---

## 13. Implementation Phases

### Phase 1: MVP (Weeks 1-3)

**Goal:** RBAC, audit logging, dashboard, unified LLM config, basic CMS.

| Week | Tasks |
|---|---|
| 1 | Database: `roles`, `role_permissions`, `user_roles`, `platform_config`, `audit_log`, `feature_flags` tables + migration |
| 1 | Auth: `RequirePermission()` middleware, role loading, login rate limiter |
| 1 | Admin APIs: dashboard overview, health, queue metrics, user/role CRUD |
| 2 | Settings: migrate settings to `platform_config`, typed JSONB values |
| 2 | LLM: unified `LLMRegistry` that reads from `platform_config`, migrate `openrouter.go` to use it |
| 2 | Audit: `AuditLog()` in all state-changing handlers |
| 3 | CMS: `cms_pages` CRUD APIs, public page delivery, admin page editor UI stub |
| 3 | Frontend: dashboard page with real API data, user management with role assignment |

### Phase 2: Production (Weeks 4-6)

**Goal:** Full ML admin, LLM provider routing, CMS workflow, notification center.

| Week | Tasks |
|---|---|
| 4 | ML admin: model version listing, activation, training trigger, metrics |
| 4 | LLM admin: provider test endpoint, fallback routing, usage tracking, cost analytics |
| 5 | CMS: publishing workflow, version history, restore, SEO metadata, announcement system |
| 5 | Notifications: templates, in-app delivery, email channel, broadcast |
| 6 | Frontend: ML admin UI, LLM admin UI with cost charts, full CMS editor, notification center |

### Phase 3: Enterprise (Weeks 7-10)

**Goal:** API keys, MFA integration, IP allowlists, monitoring dashboards.

| Week | Tasks |
|---|---|
| 7 | API key management: create, list, revoke, middleware for key auth |
| 8 | MFA: Supabase MFA integration for admin login, force re-auth for sensitive ops |
| 8 | Monitoring: detailed metrics dashboards (API latency, LLM cost, ML performance) |
| 9 | IP allowlists, session timeout controls, brute-force detection |
| 10 | Documentation, load testing, production hardening |

---

## Appendix A: Key Decisions

| Decision | Rationale |
|---|---|
| JSONB for config values | Allows typed values (bool, int, string, object) vs current TEXT-only |
| Permission-based RBAC | String permissions (`resource:action`) are extensible without code changes |
| Audit via fire-and-forget goroutine | Avoids adding latency to user-facing requests |
| LLM Registry pattern | Decouples provider selection from business logic; enables runtime switching |
| Keep Supabase for admin auth | Avoids building MFA, password policies, and session management from scratch |

## Appendix B: Existing Code to Modify

| File | Change |
|---|---|
| `auth/jwt.go` | Add `RequirePermission()`, login rate limiter |
| `auth/handlers.go` | Add audit logging, rate limiting to Login |
| `db/db.go` | Add new table schemas, migration from settings |
| `api/settings.go` | Replace with `platform_config`-based handlers |
| `news/openrouter.go` | Read config from `platform_config`, not env vars |
| `intelligence/ml_client.go` | Add ML admin endpoints (model info, training trigger) |
| `cmd/main.go` | Register new admin routes, RBAC middleware |

## Appendix C: New Files to Create

| File | Purpose |
|---|---|
| `api/admin_dashboard.go` | Dashboard overview, health, queue, usage endpoints |
| `api/admin_users.go` | User CRUD with role assignment |
| `api/admin_roles.go` | Role CRUD with permission management |
| `api/admin_settings.go` | Platform config CRUD, feature flags |
| `api/admin_llm.go` | LLM provider management, usage stats |
| `api/admin_ml.go` | ML model management, training trigger |
| `api/admin_cms.go` | CMS page CRUD with versioning |
| `api/admin_datasets.go` | Dataset CRUD with publishing workflow |
| `api/admin_audit.go` | Audit log querying |
| `api/admin_notifications.go` | Notification CRUD and templates |
| `api/admin_apikeys.go` | API key management |
| `intelligence/llm/registry.go` | Unified LLM provider registry |
| `intelligence/llm/providers/` | Per-provider implementations |
| `db/queries_admin.go` | Admin-specific DB queries |
| `middleware/rbac.go` | RBAC permission-checking middleware |
| `middleware/audit.go` | Audit logging helper |
