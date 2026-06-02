resource "azurerm_eventhub_namespace" "main" {
  name                          = "evhns-${var.name_prefix}"
  location                      = var.location
  resource_group_name           = var.resource_group_name
  sku                           = "Standard"
  capacity                      = 1
  public_network_access_enabled = false
  tags                          = var.tags
}

resource "azurerm_eventhub" "ais" {
  name              = "ais-telemetry"
  namespace_id      = azurerm_eventhub_namespace.main.id
  partition_count   = 2
  message_retention = 1
}

resource "azurerm_eventhub_consumer_group" "analytics" {
  name                = "stream-analytics"
  namespace_name      = azurerm_eventhub_namespace.main.name
  eventhub_name       = azurerm_eventhub.ais.name
  resource_group_name = var.resource_group_name
}

resource "azurerm_private_endpoint" "eventhub" {
  name                = "pe-${var.name_prefix}-eventhub"
  location            = var.location
  resource_group_name = var.resource_group_name
  subnet_id           = var.private_endpoint_subnet
  tags                = var.tags

  private_service_connection {
    name                           = "psc-eventhub"
    private_connection_resource_id = azurerm_eventhub_namespace.main.id
    is_manual_connection           = false
    subresource_names              = ["namespace"]
  }

  private_dns_zone_group {
    name                 = "default"
    private_dns_zone_ids = [var.eventhub_private_dns_zone_id]
  }
}

resource "azurerm_monitor_diagnostic_setting" "eventhub" {
  name                       = "diag-eventhub"
  target_resource_id         = azurerm_eventhub_namespace.main.id
  log_analytics_workspace_id = var.log_analytics_workspace_id

  enabled_log {
    category = "OperationalLogs"
  }

  enabled_metric {
    category = "AllMetrics"
  }
}
