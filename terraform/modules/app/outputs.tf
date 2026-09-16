output "acr_login_server" {
  value = azurerm_container_registry.acr.login_server
}

output "backend_fqdn" {
  value = azurerm_container_app.backend.ingress[0].fqdn
}

output "ml_service_fqdn" {
  value = azurerm_container_app.ml_service.ingress[0].fqdn
}

output "static_web_app_default_host_name" {
  value = azurerm_static_web_app.dashboard.default_host_name
}
