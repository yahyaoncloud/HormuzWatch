output "machine_learning_workspace_id" {
  value = azurerm_machine_learning_workspace.main.id
}

output "vision_endpoint" {
  value = azurerm_cognitive_account.vision.endpoint
}

output "openai_endpoint" {
  value = azurerm_cognitive_account.openai.endpoint
}
