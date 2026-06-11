# Deployment Guide

## Prerequisites

- Azure subscription with permissions to create networking, monitoring, storage, Event Hubs, Functions, Key Vault, and Cognitive Services.
- Terraform 1.6 or newer.
- Azure CLI.
- GitHub repository secrets for CI/CD.

## Bootstrap Remote State

```powershell
.\terraform\scripts\bootstrap-state.ps1
```

## Deploy Infrastructure

```powershell
cd terraform
terraform init
terraform plan -var-file terraform.tfvars
terraform apply -var-file terraform.tfvars
```

## Deploy App

```powershell
npm install
npm run build
```

Use the Static Web Apps workflow or Azure CLI to publish `dist/`. Deploy the API package to the Function App with managed identity enabled.
