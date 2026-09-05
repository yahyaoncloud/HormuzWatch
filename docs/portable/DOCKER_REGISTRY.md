# 📦 Private Docker Registry Deployment & Operations

This document details how to run, operate, and maintain an internal, self-hosted Docker Registry v2 for HormuzWatch container images.

---

## 🌟 Why a Private Registry?

1. **Air-Gapped & Offline Portability**: Enables deploying onto air-gapped data centers or environments with restricted external internet access.
2. **Deterministic Versioning**: Locks exact container builds to semver tags (`2.4.0`) and immutable SHA256 image digests.
3. **Bandwidth Efficiency**: Multi-node deployments pull directly over local high-speed LAN (e.g. 1 Gbps / 10 Gbps) rather than public Docker Hub.

---

## 🚀 Quickstart: Starting the Registry

The registry is defined in `docker-compose.registry.yml` and managed via `scripts/registry/registry_ctl.sh`.

```bash
# Start Docker Registry (port 5000) and MinIO (port 9000/9001)
./scripts/registry/registry_ctl.sh start

# Check status
./scripts/registry/registry_ctl.sh status

# Stop registries
./scripts/registry/registry_ctl.sh stop
```

### Verification
Check the registry API catalog:
```bash
curl -s http://localhost:5000/v2/_catalog
# Output: {"repositories":[]}
```

---

## 📤 Publishing Images to Private Registry

Use `scripts/registry/push_images.sh` to automatically build, tag, and push all HormuzWatch core images (`server`, `ml`, `client`):

```bash
# Push to localhost:5000
./scripts/registry/push_images.sh localhost:5000

# Push to a remote node hosting the registry (e.g. 192.168.1.51:5000)
./scripts/registry/push_images.sh 192.168.1.51:5000
```

### What this produces:
- `192.168.1.51:5000/hormuzwatch-server:2.4.0`
- `192.168.1.51:5000/hormuzwatch-server:latest`
- `192.168.1.51:5000/hormuzwatch-ml:2.4.0`
- `192.168.1.51:5000/hormuzwatch-ml:latest`
- `192.168.1.51:5000/hormuzwatch-client:2.4.0`
- `192.168.1.51:5000/hormuzwatch-client:latest`

---

## 📥 Pulling Images on Target Workstations

On any client machine or edge node that needs to run the images:

```bash
./scripts/registry/pull_images.sh 192.168.1.51:5000
```
This pulls each image and re-tags them locally as `hormuzwatch-server:dev`, `hormuzwatch-ml:dev`, etc., allowing `docker compose -f docker-compose.dev.yml up -d` to spin up instantly without compiling from source.

---

## 🔐 Insecure Registry Configuration

Because local registries typically operate over plaintext HTTP on LAN, Docker daemons on pulling machines must permit the registry address.

Edit `/etc/docker/daemon.json` (Ansible role `docker_runtime` does this automatically):
```json
{
  "insecure-registries": [
    "127.0.0.1:5000",
    "localhost:5000",
    "192.168.1.51:5000"
  ]
}
```
Reload docker:
```bash
sudo systemctl restart docker
```

---

## 💾 Storage & Data Persistence

Registry image layers are stored on disk in:
`data/docker-registry` (or the Docker named volume `docker_registry_data`).

To backup the entire registry volume:
```bash
tar -czvf backup-docker-registry-$(date +%F).tar.gz data/docker-registry/
```
