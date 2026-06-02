resource "azurerm_log_analytics_workspace" "main" {
  name                = "log-${var.name_prefix}"
  location            = var.location
  resource_group_name = var.resource_group_name
  sku                 = "PerGB2018"
  retention_in_days   = 30
  tags                = var.tags
}

resource "azurerm_application_insights" "main" {
  name                = "appi-${var.name_prefix}"
  location            = var.location
  resource_group_name = var.resource_group_name
  workspace_id        = azurerm_log_analytics_workspace.main.id
  application_type    = "web"
  tags                = var.tags
}

resource "azurerm_monitor_action_group" "ops" {
  name                = "ag-${var.name_prefix}-ops"
  resource_group_name = var.resource_group_name
  short_name          = "hsops"
  tags                = var.tags

  email_receiver {
    name                    = "cloud-ops"
    email_address           = var.alert_email
    use_common_alert_schema = true
  }
}
