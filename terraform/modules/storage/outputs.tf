output "ml_storage_account_id" {
  value = azurerm_storage_account.data.id
}

output "function_storage_account_name" {
  value = azurerm_storage_account.functions.name
}

output "function_storage_account_key" {
  value     = azurerm_storage_account.functions.primary_access_key
  sensitive = true
}
