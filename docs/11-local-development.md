# Local Development Guide

## 1. Prerequisites

Ensure the following are installed on your machine:
- **Go**: `1.22+` (1.25 recommended)
- **Node.js**: `v18+` (v20 recommended)
- **Python**: `3.11+`
- **Docker & Docker Compose** (Optional, for containerized local dev)

---

## 2. Environment Setup

### 2.1 Backend (`/server`)
1. Navigate to the server directory: `cd server`
2. Create a `.env` file: `cp ../.env.example .env` (or create manually based on `12-environment-variables.md`)
3. Install dependencies: `go mod download`

**Crucial Local Dev Variables (`server/.env`):**
```ini
PORT=8080
AUTH_DISABLED=true  # Disables JWT checks, auto-logs you in as admin
ML_SERVICE_URL=http://localhost:8090
AISSTREAM_API_KEY=your_key_here
```

### 2.2 Frontend (`/client`)
1. Navigate to the client directory: `cd client`
2. Install dependencies: `npm install`
3. Create a `.env` file (if it doesn't exist):
```ini
VITE_API_URL=http://localhost:8080
```

### 2.3 ML Inference (`/ml-inference`)
1. Navigate to the ML directory: `cd ml-inference`
2. Create a virtual environment: `python -m venv venv`
3. Activate it:
   - Linux/Mac: `source venv/bin/activate`
   - Windows: `venv\Scripts\activate`
4. Install dependencies: `pip install -r requirements.txt`

---

## 3. Running Locally (Native)

You need three terminal windows to run the full stack natively.

**Terminal 1 (Backend):**
```bash
cd server
go run cmd/main.go
```
*The server will initialize the SQLite DB at `server/hormuzwatch.db`.*

**Terminal 2 (Frontend):**
```bash
cd client
npm run dev
```
*Access the app at `http://localhost:5173`. Vite will proxy API requests to `:8080` automatically via `vite.config.ts`.*

**Terminal 3 (ML Service):**
```bash
cd ml-inference
uvicorn app:app --host 0.0.0.0 --port 8090 --reload
```
*Access the Swagger docs at `http://localhost:8090/docs`.*

---

## 4. Running Locally (Docker Compose)

If you prefer not to install Go or Python natively:

```bash
# In the root of the project
docker-compose up --build
```
This will build and start the Go server (`:8081`) and the React frontend (`:3000`).
*Note: Ensure `ML_SERVICE_URL` in docker-compose points correctly if you are running the ML service locally as well.*

---

## 5. Typical Developer Workflows

### Wiping the Database
If you alter the SQLite schema or corrupt your local state:
```bash
cd server
rm hormuzwatch.db*
```
Restarting the Go server will automatically recreate the database and schema.

### Testing Anomaly Scoring Locally
Because generating real maritime anomalies is difficult, you can force anomalous scores by temporarily tweaking the `Rule Engine` logic in `server/internal/anomaly/scorer.go` (e.g., hardcoding `return 90` for specific tracks) to see the frontend Alert Panels light up.

### Adding a New Dependency
- **Go**: `go get github.com/user/pkg`
- **React**: `npm install pkg-name`
- **Python**: `pip install pkg-name && pip freeze > requirements.txt`
