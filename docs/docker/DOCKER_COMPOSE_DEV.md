# Local Development with Docker Compose

Quick start guide for running the Geospatial HormuzWatch application locally with Docker Compose.

## Prerequisites

- Docker Desktop installed and running
- Docker Compose (included with Docker Desktop)
- Git (to clone the repository)

## Quick Start

### 1. Clone and Navigate

```bash
cd Geospatial-HormuzWatch
```

### 2. Create Environment File

Copy the example environment file:

```bash
cp .env.example .env
```

For Phase 2 development, the defaults in `.env.example` should work as-is.

### 3. Build and Run Containers

```bash
docker-compose up --build
```

This will:

- Build the Go server container
- Build the React frontend container
- Start both services on a shared network
- Run health checks

Wait for both services to become healthy (~30 seconds).

### 4. Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8080
- **Health Check**: http://localhost:8080/health
- **WebSocket**: ws://localhost:8080/ws/stream (automatic from frontend)

## Common Commands

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f go-server
docker-compose logs -f react-frontend

# Last 50 lines
docker-compose logs --tail=50
```

### Stop Services

```bash
docker-compose down
```

### Rebuild After Code Changes

```bash
# Full rebuild
docker-compose up --build

# Rebuild specific service
docker-compose up --build go-server
docker-compose up --build react-frontend
```

### Remove Everything (Clean State)

```bash
docker-compose down -v
```

This removes containers, networks, and volumes.

### Check Service Status

```bash
docker-compose ps
```

## Troubleshooting

### Port Already in Use

If ports 8080 or 3000 are already in use:

```bash
# Find what's using the port (macOS/Linux)
lsof -i :8080
lsof -i :3000

# Windows
netstat -ano | findstr :8080
```

Stop the conflicting service or modify `docker-compose.yml` to use different ports.

### Services Won't Start

Check logs:

```bash
docker-compose logs go-server
docker-compose logs react-frontend
```

Common issues:

- Docker Desktop not running
- Insufficient disk space
- Base image pull failure (try again after a moment)

### WebSocket Connection Failed

Frontend WebSocket expects the server at `ws://go-server:8080/ws/stream` (inside container network).

If testing locally:

- Dev environment should automatically use `ws://localhost:8080/ws/stream`
- Check browser console (DevTools → Network → WS tab)
- Verify backend is healthy: `curl http://localhost:8080/health`

### Slow/No Telemetry Updates

1. Check WebSocket is connected (browser DevTools → Network)
2. Check backend logs: `docker-compose logs go-server`
3. Verify telemetry is being simulated (should see log messages)
4. Check that `AUTH_DISABLED=true` in `.env`

## Development Workflow

### Making Changes to Go Server

1. Edit files in `server/internal/*/`
2. Rebuild container: `docker-compose up --build go-server`
3. Service restarts automatically

### Making Changes to React Frontend

1. Edit files in `client/src/`
2. Rebuild container: `docker-compose up --build react-frontend`
3. Service restarts automatically

### Testing Authentication

For Phase 3 Azure integration, update `.env`:

```env
AUTH_DISABLED=false
AZURE_TENANT_ID=your-tenant-id
```

Frontend will require JWT tokens in Authorization headers.

## Phase 2 vs Phase 3

### Phase 2 (Current)

- Local containers with simulated telemetry
- In-memory data (no persistence)
- No Azure dependencies
- Development-focused

### Phase 3 (Roadmap)

- Replace with Azure infrastructure (Functions, Event Hubs)
- Replace simulator with real data sources (AISStream, OpenSky, GDELT)
- Add production observability
- Implement persistence layer

## Environment Variables Reference

| Variable                      | Service   | Purpose               | Phase 2 Default       |
| ----------------------------- | --------- | --------------------- | --------------------- |
| `PORT`                        | Go Server | Server listen port    | 8080                  |
| `AUTH_DISABLED`               | Go Server | Bypass JWT validation | true                  |
| `VITE_API_URL`                | Frontend  | Backend API URL       | http://go-server:8080 |
| `VITE_WS_URL`                 | Frontend  | WebSocket URL         | ws://go-server:8080   |
| `AZURE_TENANT_ID`             | Go Server | Azure AD tenant       | (empty Phase 2)       |
| `EVENT_HUB_CONNECTION_STRING` | Go Server | Event Hub endpoint    | (empty Phase 2)       |

## Performance Notes

- **First build**: 2-5 minutes (downloads base images, compiles)
- **Subsequent builds**: <1 minute
- **Container startup**: ~10 seconds per service
- **WebSocket updates**: Every 2 seconds (simulator) or real-time (Phase 3)
- **Heatmap refresh**: Every 5 minutes or on demand

## Next Steps

1. **Test telemetry flow**:
   - Dashboard should show vessel markers updating in real-time
   - Anomaly scores calculated server-side
   - Heatmap layers visible when toggled

2. **Verify WebSocket connectivity**:
   - DevTools Network tab should show `ws://` connection
   - Messages arriving every 2 seconds

3. **Explore routes**:
   - Navigation links should work (React Router v7)
   - Selected vessel persists as URL query param

4. **Prepare for Phase 3**:
   - Plan real data source integration (AISStream, OpenSky)
   - Design Azure infrastructure (Event Hubs, Functions)
   - Outline persistence strategy (Cosmos DB or Table Storage)

## Support

For issues or questions:

1. Check logs: `docker-compose logs`
2. Review CONTRIBUTING.md in docs/
3. Consult troubleshooting-guide.md in docs/
