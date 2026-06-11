# Security Guide

## Identity

- Use managed identities for Functions and deployment automation.
- Use Entra ID authentication for dashboard access.
- Assign least-privilege roles for Event Hubs Data Receiver, Storage Blob Data Contributor, Key Vault Secrets User, and Cognitive Services User.

## Secrets

- Store external API keys in Key Vault.
- Rotate secrets every 90 days or immediately after suspected exposure.
- Prefer workload identity federation for GitHub Actions.

## Network

- Disable public access on storage, Event Hubs, Key Vault, and AI services.
- Route workload subnet egress through Azure Firewall.
- Use Private DNS zones for private endpoint resolution.

## Supply Chain

- Run Trivy on containers and filesystem dependencies.
- Run OWASP Dependency Check for package vulnerabilities.
- Require pull request review for Terraform and application changes.
