# HormuzWatch — Operations & Maintenance Manual

## Common Operational Tasks

### Checking Service Logs
```bash
# View all container logs
docker compose -f docker-compose.dev.yml logs -f

# View individual service logs
docker compose -f docker-compose.dev.yml logs -f server
docker compose -f docker-compose.dev.yml logs -f ml
docker compose -f docker-compose.dev.yml logs -f client
```

### Checking System Resources
```bash
docker stats
df -h /
```

### Restarting the Entire Stack
```bash
cd ~/SHARED/Projects/HormuzWatch
docker compose -f docker-compose.dev.yml down
docker compose -f docker-compose.dev.yml up -d
```
