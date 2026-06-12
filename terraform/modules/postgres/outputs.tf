output "server_fqdn" {
  description = "Fully-qualified domain name of the PostgreSQL server."
  value       = azurerm_postgresql_flexible_server.main.fqdn
}

output "database_name" {
  description = "Name of the application database."
  value       = azurerm_postgresql_flexible_server_database.hormuzwatch.name
}

output "server_id" {
  description = "Resource ID of the PostgreSQL Flexible Server."
  value       = azurerm_postgresql_flexible_server.main.id
}

output "db_url_secret_id" {
  description = "Key Vault secret ID for the database connection string."
  value       = azurerm_key_vault_secret.db_url.id
  sensitive   = true
}
