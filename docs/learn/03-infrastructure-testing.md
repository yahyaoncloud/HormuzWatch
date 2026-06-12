# Infrastructure & Automation Testing Strategy

This document outlines the strategic testing processes for Azure Cloud deployments, Infrastructure as Code (IaC) validation, and the automated observability layer.

## 1. Azure Cloud Quick Deploy & Destroy

The project utilizes an Android App to manage cloud infrastructure dynamically. Because Azure resources (especially Virtual Machines and Gateways) incur hourly costs, the "Quick Deploy & Destroy" strategy is critical.

### The 5-Minute Window
- **Deploy:** When triggered via the Android app, GitHub Actions runs Terraform to provision a new Resource Group, VNet, and AVM.
- **Destroy:** A strict tear-down script is bound to the Android app's "Destroy" button. 
- **Strategic Testing:** We must test this lifecycle to ensure that *absolutely no dangling resources* remain after a destroy event. Dangling public IPs or unattached disks can silently drain funds.
  - **Verification Command:** `az resource list --resource-group HormuzWatch-RG` should return empty after a destroy run.

## 2. Terraform & Ansible Testing

### Terraform Idempotency
Terraform must be tested for idempotency (running the same configuration twice should yield no changes).
- **Testing Approach:** Run `terraform plan` immediately after a successful `terraform apply`. It must state `0 to add, 0 to change, 0 to destroy`.

### Ansible Validation
Ansible configures the raw AVM with Docker, pulls the source code, and spins up the stack.
- **Testing Approach:** We simulate a failed deployment by killing the Ansible process halfway, then running it again. It must recover gracefully and finish the installation without breaking existing dependencies.

## 3. Pipeline Automation (CI/CD)

The entire deployment pipeline is heavily automated via GitHub Actions, bypassing the need for manual server configuration.

### Observability Layer Deployment on AVM
1. **Provisioning:** Terraform spins up the AVM.
2. **Configuration:** Ansible SSHes into the AVM, installs Docker, and pulls the `infra-observability` folder.
3. **Execution:** Ansible executes `docker-compose up -d`.
4. **Validation:** The GitHub Action waits for the AVM to report a healthy status on port `3000` (Grafana) and port `3100` (Loki). Only then does it notify the Android app that the deployment was successful.
