output "acr_login_server" {
  value = azurerm_container_registry.acr.login_server
}

output "acr_name" {
  value = azurerm_container_registry.acr.name
}

output "backend_fqdn" {
  description = "Public FQDN of the backend Container App."
  value       = azurerm_container_app.backend.ingress[0].fqdn
}

output "ml_fqdn" {
  description = "Internal FQDN of the ML service Container App."
  value       = azurerm_container_app.ml_service.ingress[0].fqdn
}

output "backend_identity_principal_id" {
  description = "Managed identity principal ID for Key Vault access policy."
  value       = azurerm_container_app.backend.identity[0].principal_id
}

output "ml_identity_principal_id" {
  value = azurerm_container_app.ml_service.identity[0].principal_id
}
