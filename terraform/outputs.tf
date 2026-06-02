output "resource_group_name" {
  value = azurerm_resource_group.main.name
}

output "static_web_app_default_host_name" {
  value = module.app.static_web_app_default_host_name
}

output "function_app_name" {
  value = module.app.function_app_name
}

output "event_hub_name" {
  value = module.event_hubs.event_hub_name
}

output "key_vault_uri" {
  value = module.security.key_vault_uri
}
