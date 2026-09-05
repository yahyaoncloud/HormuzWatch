# 🤖 Ansible Portability & Provisioning Guide

This guide describes how to use Ansible to provision and start the complete HormuzWatch platform on **any clean Linux host** (bare metal, cloud VM, or workstation) without manual configuration.

---

## 📋 Prerequisites on Control Machine

The machine running the Ansible CLI requires:
- Python 3.10+
- `ansible-core` 2.15+ (auto-installed by `deploy_portable.sh` if missing)
- SSH keypair access to the target host with `sudo` permissions without password prompts (or password prompted via `-K`).

---

## 🛠️ Automated Runner: `deploy_portable.sh`

The project includes a turnkey script located at `ansible/deploy_portable.sh`:

```bash
# Display help & options
./ansible/deploy_portable.sh --help
```

### Options Reference:
| Option | Argument | Description |
| :--- | :--- | :--- |
| `-t, --target` | `IP or Hostname` | Target server address |
| `-u, --user` | `Username` | SSH user on target (defaults to current user) |
| `-k, --key` | `Path` | Path to private SSH key |
| `-d, --dir` | `Directory` | Target project directory (e.g. `/opt/hormuzwatch`) |
| `-l, --local` | None | Run against `localhost` using local connection |
| `-p, --playbook` | `Path` | Custom playbook path |
| `-n, --dry-run` | None | Ansible check mode (simulate without making changes) |

---

## 🎯 Common Deployment Scenarios

### Scenario A: Remote Server Cold Start (e.g. `192.168.1.51`)
```bash
./ansible/deploy_portable.sh \
  --target 192.168.1.51 \
  --user yahya \
  --key ~/.ssh/id_ed25519_tnkstn
```
**What happens automatically:**
1. Verifies SSH connectivity.
2. Updates `apt` cache and installs base packages (`curl`, `git`, `htop`, `jq`, `build-essential`, `python3-pip`, `ufw`).
3. Sets kernel parameters in `/etc/sysctl.conf` (`fs.file-max=2097152`, `vm.max_map_count=262144`).
4. Installs official Docker CE, Buildx, and Compose plugin.
5. Configures `/etc/docker/daemon.json` with JSON log rotation and insecure private registry bypass (`127.0.0.1:5000`, `192.168.1.51:5000`).
6. Ensures `.env` exists, pulls or builds images, and starts `docker compose -f docker-compose.dev.yml up -d`.
7. Executes automated health verification loops against ports `10020`, `8090`, and `3000`.

---

### Scenario B: Local Workstation Portability
If you want to provision and deploy on the machine you are sitting at:
```bash
./ansible/deploy_portable.sh --local
```

---

### Scenario C: Fast Container Deployment (Existing Provisioned Host)
If Docker and system packages are already installed, skip OS prep and start containers directly:
```bash
./ansible/deploy_portable.sh \
  --target 192.168.1.51 \
  --user yahya \
  --playbook ansible/playbooks/deploy_docker.yml
```

---

### Scenario D: Launching Private Docker & Model Registries
To launch the private Docker Registry and MinIO storage on the target node:
```bash
./ansible/deploy_portable.sh \
  --target 192.168.1.51 \
  --user yahya \
  --playbook ansible/playbooks/deploy_registries.yml
```

---

## 📂 Ansible Directory Structure

```
ansible/
├── ansible.cfg                    # Global settings (roles_path, inventory, disable host checking)
├── deploy_portable.sh             # Turnkey bash CLI wrapper
├── inventory.ini                  # Static and parameterized inventory
├── playbooks/
│   ├── bootstrap_fresh_node.yml   # Complete cold-start playbook
│   ├── deploy_docker.yml          # Fast container stack startup & health check
│   ├── deploy_registries.yml      # Docker v2 & MinIO registry deployment
│   ├── migrate_station.yml        # Station-to-station migration via rsync
│   └── site.yml                   # Standard provisioning playbook
└── roles/
    ├── docker_runtime/            # Installs Docker CE, Compose, daemon config
    ├── hormuzwatch_stack/         # Environment setup, compose up, health checks
    ├── private_registry/          # Launches registry:5000 and minio:9000
    └── system_prep/               # Apt packages, kernel sysctl, directories
```

---

## ⚖️ Separation of Concerns: What Ansible Does (and What It Does NOT Do)

To keep the architecture robust, maintainable, and prevent tool overlap, Ansible adheres strictly to the **Single Responsibility Principle**:

| Tool | Single Responsibility | When It Runs | What It Owns |
| :--- | :--- | :--- | :--- |
| **Ansible** | **Infrastructure Provisioning & Cold-Start Portability** | Day 0 / Day 1 (Only on new machines or disaster recovery) | OS packages, sysctl tuning, Docker CE installation, `/etc/docker/daemon.json`, directories, user permissions. |
| **Docker Compose** | **Container Isolation & Runtime Execution** | Continuous Runtime | Container processes, network boundaries (`hormuzwatch-dev-network`), volumes, restarts. |
| **Jenkins** | **Application CI/CD on Commits** | Day 2 (On every Git commit / push) | Pulling code changes, running test suites, rebuilding images, rolling container recreation, automated rollbacks. |
| **SRE CLI & Prometheus** | **Reliability Engineering & Observability** | 24/7 Monitoring | Probing health endpoints, SLI/SLO tracking, log streaming, failure detection. |

### Architectural Boundary Rules:
- **Rule 1**: Ansible does **NOT** listen to Git webhooks or deploy code on commits. That is strictly Jenkins's job.
- **Rule 2**: Jenkins does **NOT** install OS packages or modify kernel sysctl parameters. That is strictly Ansible's job.
- **Rule 3**: Ansible does **NOT** monitor metrics or tail logs. That is strictly the SRE CLI (`sre.sh`) and Prometheus's job.
- **Rule 4**: Ansible's sole reason for existing in this repository is to answer: *"How do we spin up the entire server on a blank machine from zero in under 5 minutes?"*

