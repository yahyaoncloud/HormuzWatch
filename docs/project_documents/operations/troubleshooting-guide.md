# Troubleshooting Guide

## API Failures

Detection: Application Insights dependency failures or HTTP 5xx alerts.
Resolution: Check Function logs, deployment package, app settings, Key Vault access, and managed identity role assignments.

## DNS Failures

Detection: private endpoint name resolution failures.
Resolution: Verify private DNS zone links, records, and VNet resolver path.

## Storage Failures

Detection: Blob transaction errors, queue backlog, or 403 responses.
Resolution: Check private endpoint health, RBAC assignments, firewall settings, and container existence.

## Event Hub Failures

Detection: server errors, throttling, or consumer lag.
Resolution: Check namespace status, throughput units, diagnostic logs, and producer credentials.

## AI Service Failures

Detection: inference timeout or 429 rate limits.
Resolution: Retry with backoff, lower batch size, verify quota, and fail over to rules-only scoring.

## Authentication Failures

Detection: Entra ID sign-in failures or API 401/403.
Resolution: Validate app registration, allowed audiences, token issuer, role assignment, and clock skew.

## Network Connectivity Issues

Detection: connection timeouts to private endpoints.
Resolution: Validate route tables, Azure Firewall rules, NSGs, DNS, and private endpoint approval state.
