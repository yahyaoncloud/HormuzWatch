output "function_app_name" {
  value = azurerm_linux_function_app.api.name
}

output "function_app_identity_principal_id" {
  value = azurerm_linux_function_app.api.identity[0].principal_id
}

output "static_web_app_default_host_name" {
  value = azurerm_static_web_app.dashboard.default_host_name
}
