# Standard Operating Procedures

## Alert Triage

1. Verify alert source and severity.
2. Check vessel telemetry and recent image queue status.
3. Confirm whether the event is a safety, logistics, or data-quality incident.
4. Add operator notes and assign status.
5. Export report for stakeholders when needed.

## Secret Rotation

1. Create new secret version in Key Vault.
2. Restart dependent Function App.
3. Validate API and inference calls.
4. Disable old secret version after confirmation.

## Change Management

1. Open pull request.
2. Run app build, Terraform fmt, and Terraform plan.
3. Review blast radius.
4. Apply through approved pipeline.
