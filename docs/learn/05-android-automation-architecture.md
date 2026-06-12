# Android Automation Architecture

This document explains the "Two-Process Pipeline" controlled by the HormuzWatch Android Application.

## The Problem

HormuzWatch exists as both a free, always-on Open Source MVP, and a highly powerful, scalable, but expensive Azure Production environment. Logging into multiple dashboards to manage deployments is tedious and error-prone.

## The Solution: A Unified Android Dashboard

The Android app acts as a remote control for the entire infrastructure, authenticating via Google SSO, and communicating directly with the GitHub Actions REST API.

### Process 1: The MVP Branch (Always-On)
The MVP branch is deployed to Vercel (Frontend), Render (Backend), and Supabase (Database).
- **Automation Goal:** Continuous Deployment (CD).
- **How it Works:** Pushing code to the `mvp` branch automatically triggers Vercel and Render hooks. The Android app simply monitors the success/failure of these pipelines and displays the health status. It does not actively "shut down" this environment because the open-source tiers are free.

### Process 2: The Azure-Deploy Branch (On-Demand)
The Production branch is heavily reliant on expensive Azure infrastructure (AVMs, Application Gateways, Redis caches).
- **Automation Goal:** Cost-Controlled Ephemeral Deployments.
- **How it Works:** The Azure environment is kept offline by default to save money.
  - **"Deploy" Button:** The Android app sends a `workflow_dispatch` event to GitHub Actions targeting the `azure-dep` branch with the input `action=apply`. Terraform runs, spins up Azure, and Ansible configures it.
  - **"Destroy" Button:** The Android app triggers the same workflow with `action=destroy`. Terraform tears down the Resource Group, ensuring no lingering costs.
  
## Security & Observability Integration

While deploying the Azure branch, the Android app hooks into the Loki logging instance. This means the user can watch the live terminal logs of Terraform provisioning the cloud directly from their mobile phone, allowing them to debug failures without ever opening a laptop.
