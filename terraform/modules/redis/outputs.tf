output "hostname" {
  value = azurerm_redis_cache.main.hostname
}

output "port" {
  value = azurerm_redis_cache.main.ssl_port
}

output "redis_cache_id" {
  value = azurerm_redis_cache.main.id
}

output "redis_url_secret_id" {
  value     = azurerm_key_vault_secret.redis_url.id
  sensitive = true
}
