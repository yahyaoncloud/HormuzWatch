resource "azurerm_redis_cache" "main" {
  name                = "redis-${var.name_prefix}"
  location            = var.location
  resource_group_name = var.resource_group_name

  sku_name = var.sku_name
  family   = var.sku_family
  capacity = var.sku_capacity

  # TLS only — no plain-text
  minimum_tls_version          = "1.2"
  non_ssl_port_enabled         = false
  public_network_access_enabled = false

  redis_configuration {
    maxmemory_policy = "volatile-lru"  # Evict keys with TTL first (ideal for telemetry cache)
    maxmemory_reserved   = 50
    maxfragmentationmemory_reserved = 50
  }

  tags = var.tags
}

# Private endpoint so Redis is never exposed to internet
resource "azurerm_private_endpoint" "redis" {
  name                = "pe-redis-${var.name_prefix}"
  location            = var.location
  resource_group_name = var.resource_group_name
  subnet_id           = var.private_endpoint_subnet

  private_service_connection {
    name                           = "psc-redis-${var.name_prefix}"
    private_connection_resource_id = azurerm_redis_cache.main.id
    is_manual_connection           = false
    subresource_names              = ["redisCache"]
  }

  private_dns_zone_group {
    name                 = "redis-dns-zone-group"
    private_dns_zone_ids = [var.redis_private_dns_zone_id]
  }
}

# Diagnostics
resource "azurerm_monitor_diagnostic_setting" "redis" {
  name                       = "diag-redis"
  target_resource_id         = azurerm_redis_cache.main.id
  log_analytics_workspace_id = var.log_analytics_workspace_id

  metric { category = "AllMetrics" }
}

# Store connection string in Key Vault
resource "azurerm_key_vault_secret" "redis_url" {
  name         = "redis-connection-string"
  value        = azurerm_redis_cache.main.primary_connection_string
  key_vault_id = var.key_vault_id
  content_type = "connection-string"
}
