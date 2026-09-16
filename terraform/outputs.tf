output "resource_group_name" {
  description = "The name of the main resource group"
  value       = azurerm_resource_group.main.name
}

output "acr_login_server" {
  description = "Azure Container Registry login server"
  value       = module.app.acr_login_server
}

output "backend_api_fqdn" {
  description = "Fully Qualified Domain Name of the backend API Container App"
  value       = module.app.backend_fqdn
}

output "ml_service_fqdn" {
  description = "Fully Qualified Domain Name of the ML service Container App"
  value       = module.app.ml_service_fqdn
}

output "static_web_app_url" {
  description = "Default hostname for the free-tier Static Web App frontend"
  value       = module.app.static_web_app_default_host_name
}

output "log_analytics_workspace_id" {
  description = "Log Analytics Workspace ID"
  value       = module.monitoring.log_analytics_workspace_id
}
