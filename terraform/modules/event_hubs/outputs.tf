output "event_hub_name" {
  value = azurerm_eventhub.ais.name
}

output "event_hub_namespace_name" {
  value = azurerm_eventhub_namespace.main.name
}
