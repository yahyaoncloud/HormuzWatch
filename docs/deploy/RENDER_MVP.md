# Render MVP Manual Deployment

Deploy each service as a separate **Web Service** on Render (free tier). Do not use `render.yaml` — configure env vars in the Render dashboard.

## 1. Supabase Postgres

1. Create a Supabase project.
2. Copy the **Transaction pooler** connection string (port 6543).
3. Set `DATABASE_URL` on the API service. The server adds `sslmode=require` automatically.

## 2. ML service (`ml-service/Dockerfile`)

| Setting | Value |
|---------|-------|
| Root directory | `ml-service` |
| Dockerfile | `Dockerfile` |
| Health check | `/health` |

No required env vars. Render sets `PORT` automatically.

## 3. API server (`server/Dockerfile`)

| Setting | Value |
|---------|-------|
| Root directory | `.` (repo root) |
| Dockerfile | `server/Dockerfile` |
| Health check | `/health` |

Required env vars:

- `DATABASE_URL` — Supabase Postgres URI
- `JWT_SECRET` — random secret
- `ML_SERVICE_URL` — `https://<ml-service>.onrender.com`
- `ALLOWED_ORIGINS` — your Vercel frontend URL
- Integration keys as needed (`AISSTREAM_API_KEY`, etc.)

Do **not** mount a persistent disk — data lives in Supabase.

## 4. Frontend (Vercel recommended)

Build with:

- `VITE_API_URL=https://<api>.onrender.com`
- `VITE_STREAM_MODE=poll` — Render free tier does not reliably support WebSockets
- `VITE_POLL_INTERVAL_MS=5000`

The client polls `GET /stream/poll?since=<RFC3339>` instead of `/ws/stream`.

## 5. Smoke test

```bash
curl https://<api>.onrender.com/health
curl -H "Authorization: Bearer <token>" "https://<api>.onrender.com/stream/poll"
```
