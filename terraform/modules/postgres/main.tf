resource "azurerm_postgresql_flexible_server" "main" {
  name                   = "psql-${var.name_prefix}"
  resource_group_name    = var.resource_group_name
  location               = var.location
  version                = "16"
  administrator_login    = var.administrator_login
  administrator_password = var.administrator_password
  sku_name               = var.sku_name
  storage_mb             = var.storage_mb
  backup_retention_days  = 7

  # Zone-redundancy off for cost; enable for production HA
  high_availability {
    mode = "Disabled"
  }

  # Fully private — no public network access
  private_dns_zone_id = var.postgres_private_dns_zone_id
  delegated_subnet_id = var.private_endpoint_subnet

  tags = var.tags

  lifecycle {
    prevent_destroy = true
    ignore_changes  = [administrator_password, zone]
  }
}

# Default application database
resource "azurerm_postgresql_flexible_server_database" "hormuzwatch" {
  name      = "hormuzwatch"
  server_id = azurerm_postgresql_flexible_server.main.id
  collation = "en_US.utf8"
  charset   = "utf8"
}

# Firewall: deny all public (private-endpoint-only)
resource "azurerm_postgresql_flexible_server_firewall_rule" "deny_all" {
  name             = "deny-all-public"
  server_id        = azurerm_postgresql_flexible_server.main.id
  start_ip_address = "0.0.0.0"
  end_ip_address   = "0.0.0.0"
}

# Allow Azure services (needed for Container Apps in VNet-integrated env)
resource "azurerm_postgresql_flexible_server_firewall_rule" "azure_services" {
  name             = "allow-azure-services"
  server_id        = azurerm_postgresql_flexible_server.main.id
  start_ip_address = "0.0.0.0"
  end_ip_address   = "0.0.0.0"
}

# Diagnostics → Log Analytics
resource "azurerm_monitor_diagnostic_setting" "postgres" {
  name                       = "diag-postgres"
  target_resource_id         = azurerm_postgresql_flexible_server.main.id
  log_analytics_workspace_id = var.log_analytics_workspace_id

  enabled_log { category = "PostgreSQLLogs" }
  metric { category = "AllMetrics" }
}

# Store connection string in Key Vault
resource "azurerm_key_vault_secret" "db_url" {
  name         = "database-url"
  value        = "postgres://${var.administrator_login}:${var.administrator_password}@${azurerm_postgresql_flexible_server.main.fqdn}/hormuzwatch?sslmode=require"
  key_vault_id = var.key_vault_id
  content_type = "connection-string"

  tags = var.tags
}
