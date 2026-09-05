# 🚚 Infrastructure Automation & Ansible Portability Migration

> **Date:** September 5, 2026  
> **Status:** Infrastructure Specification & Migration Playbook  
> **Source Host:** `tunkstun` (`192.168.1.51`, user `yahya`)  
> **Target Scope:** Declarative Provisioning for Any Future High-Spec Workstation / Bare Metal  

---

## 1. Context & Operational Imperative

HormuzWatch is currently deployed on the workstation `tunkstun`. As telemetry volume scales and additional deep learning anomaly models (Autoencoders, Graph Neural Networks) are introduced, the platform will require migration to a higher-capacity compute workstation equipped with dedicated GPU accelerators and expanded NVMe storage.

To avoid manual, error-prone shell setup, we establish:
1. **Full Automation on Remote Server (`ssh tunkstun`):** CI/CD deployment hooks, healthcheck gates, systemd management, and automated container cleanup.
2. **Complete Ansible Portability Suite (`ansible/`):** An idempotent, declarative playbook that provisions a clean Ubuntu/Debian/Mint machine from bare metal to fully operational HormuzWatch node in $< 10$ minutes.

---

## 2. Remote Server Architecture (`tunkstun`)

```text
                     Cloudflare Zero-Trust Edge
                               │
                               ▼ (Cloudflare Tunnel: cloudflared.service)
                   tunkstun (192.168.1.51)
┌─────────────────────────────────────────────────────────────┐
│ OS: Linux Mint 22.2 / Ubuntu 24.04 LTS                      │
│ Project Root: /home/yahya/SHARED/Projects/HormuzWatch       │
│ Persistent Storage: /server/datasets                        │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │                  Docker Engine (29.x)                   │ │
│ │                                                         │ │
│ │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │ │
│ │  │Client (Nginx)│  │ Go Server    │  │ Python ML    │   │ │
│ │  │Port 3000     │  │ Port 10020   │  │ Port 8090/91 │   │ │
│ │  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘   │ │
│ │         │                 │                 │           │ │
│ │         └──────────── hormuzwatch-dev ──────┘           │ │
│ │                           │                             │ │
│ │              ┌────────────┴─────────────┐               │ │
│ │              │ Dedicated Dataset Worker │               │ │
│ │              │ (Background Batch ETL)   │               │ │
│ │              └──────────────────────────┘               │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Ansible Portability Directory Layout

```text
ansible/
├── inventory.ini             # Host inventory (tunkstun, new_workstation)
├── ansible.cfg               # Optimized SSH pipelining and host key checking
├── playbooks/
│   ├── site.yml              # Complete end-to-end provisioning
│   ├── deploy.yml            # Rolling code update & restart
│   └── migrate_station.yml   # Workstation-to-workstation data migration
└── roles/
    ├── system_prep/          # Kernel tuning, sysctl, packages, ulimits
    ├── docker_runtime/       # Docker CE, Compose plugin, NVIDIA container toolkit
    ├── cloudflared/          # Cloudflare tunnel setup and systemd daemon
    └── hormuzwatch_stack/    # Git clone, .env templating, dataset dirs, compose up
```

---

## 4. Key Ansible Role Capabilities

### 4.1. `system_prep` Role
* **System Packages:** Installs `curl`, `git`, `htop`, `jq`, `ufw`, `python3-pip`, `build-essential`.
* **Kernel & Network Tuning (`sysctl`):**
  * `fs.file-max = 2097152` (High-concurrency file descriptors)
  * `net.core.somaxconn = 65535` (TCP backlog for high-volume WebSockets)
  * `vm.max_map_count = 262144` (Database & ML memory allocations)
* **Storage Mounts:** Creates persistent directories `/server/datasets` and `/server/data` with proper permissions (`0755` chowned to deployment user).

### 4.2. `docker_runtime` Role
* **Official Repository:** Provisions Docker CE and Docker Compose v2 from official Docker repositories.
* **NVIDIA Toolkit (Conditional):** Detects if an NVIDIA GPU is present via `lspci`; if detected, installs `nvidia-container-toolkit` and configures the default Docker runtime for hardware-accelerated ML inference.
* **Log Rotation:** Configures default Docker daemon `json-file` log driver with `max-size: "100m"` and `max-file: "5"` to prevent disk exhaustion.

### 4.3. `hormuzwatch_stack` Role
* **Git Synchronization:** Clones or pulls target branch (`production-ready`) into project directory.
* **Environment Provisioning:** Renders `.env` from secure Ansible Vault or template variables.
* **Systemd Service (`hormuzwatch.service`):** Wraps Docker Compose into a managed systemd unit ensuring automatic boot on host reboot.
* **Verification Gate:** Executes multi-tier healthchecks against ports 10020, 8090, and 3000 before marking playbook run successful.

---

## 5. Workstation Migration Workflow (`migrate_station.yml`)

When moving from `tunkstun` to a new workstation:

```bash
# 1. Run the migration playbook targeting the new workstation IP
ansible-playbook -i ansible/inventory.ini ansible/playbooks/migrate_station.yml \
  --extra-vars "source_host=tunkstun target_host=new_workstation"
```

### Automated Steps Executed by `migrate_station.yml`:
1. **Source Snapshot:** Stops writes on `tunkstun`, generates an atomic snapshot of `/server/datasets` and local configuration.
2. **Secure Rsync:** Synchronizes `/server/datasets` and repository state over high-speed SSH rsync to the new workstation.
3. **Provisioning Target:** Executes `system_prep` and `docker_runtime` on the new workstation.
4. **Environment Setup:** Configures `.env` and host paths on the target.
5. **Container Build & Startup:** Runs `docker compose build` and `docker compose up -d`.
6. **Edge DNS Switch:** Migrates Cloudflare Tunnel credentials or updates tunnel route to the new workstation IP.
7. **Automated Verification:** Runs full health check suite (`./service/sre/sre.sh health`).
