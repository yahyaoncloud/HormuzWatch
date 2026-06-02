resource "azurerm_service_plan" "functions" {
  name                = "asp-${var.name_prefix}-func"
  location            = var.location
  resource_group_name = var.resource_group_name
  os_type             = "Linux"
  sku_name            = "Y1"
  tags                = var.tags
}

resource "azurerm_linux_function_app" "api" {
  name                          = "func-${var.name_prefix}-api"
  location                      = var.location
  resource_group_name           = var.resource_group_name
  service_plan_id               = azurerm_service_plan.functions.id
  storage_account_name          = var.storage_account_name
  storage_account_access_key    = var.storage_account_access_key
  https_only                    = true
  public_network_access_enabled = false
  virtual_network_subnet_id     = var.function_subnet_id
  tags                          = var.tags

  identity {
    type = "SystemAssigned"
  }

  site_config {
    application_stack {
      node_version = "20"
    }
    application_insights_connection_string = var.app_insights_connection
    ftps_state                             = "Disabled"
    minimum_tls_version                    = "1.2"
  }

  app_settings = {
    FUNCTIONS_WORKER_RUNTIME = "node"
    WEBSITE_RUN_FROM_PACKAGE = "1"
  }
}

resource "azurerm_static_web_app" "dashboard" {
  name                = "stapp-${var.name_prefix}"
  resource_group_name = var.resource_group_name
  location            = var.location
  sku_tier            = "Free"
  sku_size            = "Free"
  tags                = var.tags
}

resource "azurerm_monitor_diagnostic_setting" "function" {
  name                       = "diag-function"
  target_resource_id         = azurerm_linux_function_app.api.id
  log_analytics_workspace_id = var.log_analytics_workspace_id

  enabled_log {
    category = "FunctionAppLogs"
  }

  enabled_metric {
    category = "AllMetrics"
  }
}
