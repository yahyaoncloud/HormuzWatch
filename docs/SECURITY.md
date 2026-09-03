# HormuzWatch — Security & Hardening Controls

## 1. Principle of Least Privilege
* **Docker Container Execution:** Both Go backend and Python ML containers run as non-root unprivileged user `hormuz` (UID/GID created in Dockerfiles).
* **SSH Remote Access:** Key-based authentication with password authentication disabled for automated runner access.

## 2. Network Isolation & Surface Minimization
* **Cloudflare Tunnel:** Inbound ports are NOT exposed directly to the public internet. All traffic flows encrypted through outbound Cloudflare Tunnel connection (`cloudflared`).
* **Inter-Service Communication:** Go backend communicates with Python ML service via private Docker bridge network (`hormuzwatch-dev-network`).

## 3. Secret & Credentials Management
* No API keys, database passwords, or JWT secrets are stored in Git.
* Production secrets reside strictly in `.env` on `tunkstun` with restricted file permissions (`600`).
