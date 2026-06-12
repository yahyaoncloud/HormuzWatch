output "private_endpoint_subnet_id" {
  description = "Subnet ID for private endpoints."
  value       = azurerm_subnet.private_endpoints.id
}

output "container_apps_subnet_id" {
  description = "Subnet ID for Container Apps environment."
  value       = azurerm_subnet.container_apps.id
}

output "postgres_subnet_id" {
  description = "Delegated subnet ID for PostgreSQL Flexible Server."
  value       = azurerm_subnet.postgres.id
}

output "appgw_public_ip" {
  description = "Public IP address of the Application Gateway."
  value       = azurerm_public_ip.appgw.ip_address
}

output "application_gateway_id" {
  value = azurerm_application_gateway.main.id
}

output "private_dns_zone_ids" {
  description = "Map of private DNS zone IDs keyed by service shortname."
  value = {
    blob      = azurerm_private_dns_zone.zones["blob"].id
    vault     = azurerm_private_dns_zone.zones["vault"].id
    eventhub  = azurerm_private_dns_zone.zones["eventhub"].id
    cognitive = azurerm_private_dns_zone.zones["cognitive"].id
    redis     = azurerm_private_dns_zone.zones["redis"].id
    postgres  = azurerm_private_dns_zone.zones["postgres"].id
  }
}
