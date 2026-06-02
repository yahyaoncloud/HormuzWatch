output "vnet_id" {
  value = azurerm_virtual_network.main.id
}

output "function_subnet_id" {
  value = azurerm_subnet.functions.id
}

output "private_endpoint_subnet_id" {
  value = azurerm_subnet.private_endpoints.id
}

output "private_dns_zone_ids" {
  value = {
    blob      = azurerm_private_dns_zone.blob.id
    vault     = azurerm_private_dns_zone.vault.id
    eventhub  = azurerm_private_dns_zone.eventhub.id
    cognitive = azurerm_private_dns_zone.cognitive.id
  }
}
