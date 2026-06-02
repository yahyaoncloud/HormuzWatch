resource "azurerm_cognitive_account" "vision" {
  name                          = "cog-${var.name_prefix}-vision"
  location                      = var.location
  resource_group_name           = var.resource_group_name
  kind                          = "ComputerVision"
  sku_name                      = "S1"
  custom_subdomain_name         = "cv-${var.name_prefix}"
  public_network_access_enabled = false
  tags                          = var.tags
}

resource "azurerm_cognitive_account" "openai" {
  name                          = "cog-${var.name_prefix}-openai"
  location                      = var.location
  resource_group_name           = var.resource_group_name
  kind                          = "OpenAI"
  sku_name                      = "S0"
  custom_subdomain_name         = "aoai-${var.name_prefix}"
  public_network_access_enabled = false
  tags                          = var.tags
}

resource "azurerm_machine_learning_workspace" "main" {
  name                    = "mlw-${var.name_prefix}"
  location                = var.location
  resource_group_name     = var.resource_group_name
  application_insights_id = var.application_insights_id
  key_vault_id            = var.key_vault_id
  storage_account_id      = var.storage_account_id
  tags                    = var.tags

  identity {
    type = "SystemAssigned"
  }
}

resource "azurerm_private_endpoint" "vision" {
  name                = "pe-${var.name_prefix}-vision"
  location            = var.location
  resource_group_name = var.resource_group_name
  subnet_id           = var.private_endpoint_subnet
  tags                = var.tags

  private_service_connection {
    name                           = "psc-vision"
    private_connection_resource_id = azurerm_cognitive_account.vision.id
    is_manual_connection           = false
    subresource_names              = ["account"]
  }

  private_dns_zone_group {
    name                 = "default"
    private_dns_zone_ids = [var.cognitive_private_dns_zone]
  }
}

resource "azurerm_private_endpoint" "openai" {
  name                = "pe-${var.name_prefix}-openai"
  location            = var.location
  resource_group_name = var.resource_group_name
  subnet_id           = var.private_endpoint_subnet
  tags                = var.tags

  private_service_connection {
    name                           = "psc-openai"
    private_connection_resource_id = azurerm_cognitive_account.openai.id
    is_manual_connection           = false
    subresource_names              = ["account"]
  }

  private_dns_zone_group {
    name                 = "default"
    private_dns_zone_ids = [var.cognitive_private_dns_zone]
  }
}
