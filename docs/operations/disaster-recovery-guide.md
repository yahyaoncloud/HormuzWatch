# Disaster Recovery Guide

## Recovery Objectives

- RTO: 4 hours for dashboard/API restoration.
- RPO: 15 minutes for telemetry metadata in production with geo-redundant design.

## Strategy

- Keep Terraform state in a locked remote backend.
- Rebuild infrastructure from code into a paired Azure region.
- Keep dashboard artifacts in CI/CD release history.
- Use storage lifecycle policies and optional geo-redundant storage for production.
- Export critical runbooks and dashboards as code.
