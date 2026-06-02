# Backup Strategy

- Terraform state: remote Azure Storage with blob versioning and soft delete.
- Blob imagery and manifests: lifecycle policy plus optional GRS in production.
- App code: GitHub repository and release artifacts.
- Monitoring: export dashboard definitions and alert rules.
- Key Vault: document secret names and rotation owners; never back up secret values in plain text.
