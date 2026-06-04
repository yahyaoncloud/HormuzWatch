locals {
  name_prefix = "${var.project}-${var.environment}"
  tags = merge(var.tags, {
    project     = var.project
    environment = var.environment
  })
}

resource "azurerm_resource_group" "main" {
  name     = "rg-${local.name_prefix}"
  location = var.location
  tags     = local.tags
}

module "networking" {
  source              = "./modules/networking"
  name_prefix         = local.name_prefix
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  allowed_public_cidr = var.allowed_public_cidr
  tags                = local.tags
}

module "monitoring" {
  source              = "./modules/monitoring"
  name_prefix         = local.name_prefix
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  alert_email         = var.alert_email
  tags                = local.tags
}

module "security" {
  source                  = "./modules/security"
  name_prefix             = local.name_prefix
  resource_group_name     = azurerm_resource_group.main.name
  location                = azurerm_resource_group.main.location
  tenant_id               = data.azurerm_client_config.current.tenant_id
  current_principal_id    = data.azurerm_client_config.current.object_id
  private_endpoint_subnet = module.networking.private_endpoint_subnet_id
  private_dns_zone_ids    = module.networking.private_dns_zone_ids
  tags                    = local.tags
}

module "storage" {
  source                     = "./modules/storage"
  name_prefix                = local.name_prefix
  resource_group_name        = azurerm_resource_group.main.name
  location                   = azurerm_resource_group.main.location
  private_endpoint_subnet    = module.networking.private_endpoint_subnet_id
  blob_private_dns_zone_id   = module.networking.private_dns_zone_ids.blob
  log_analytics_workspace_id = module.monitoring.log_analytics_workspace_id
  tags                       = local.tags
}

module "event_hubs" {
  source                       = "./modules/event_hubs"
  name_prefix                  = local.name_prefix
  resource_group_name          = azurerm_resource_group.main.name
  location                     = azurerm_resource_group.main.location
  private_endpoint_subnet      = module.networking.private_endpoint_subnet_id
  eventhub_private_dns_zone_id = module.networking.private_dns_zone_ids.eventhub
  log_analytics_workspace_id   = module.monitoring.log_analytics_workspace_id
  tags                         = local.tags
}

module "app" {
  source                     = "./modules/app"
  name_prefix                = local.name_prefix
  resource_group_name        = azurerm_resource_group.main.name
  location                   = azurerm_resource_group.main.location
  log_analytics_workspace_id = module.monitoring.log_analytics_workspace_id
  tags                       = local.tags
}

module "ai_services" {
  source                     = "./modules/ai-services"
  name_prefix                = local.name_prefix
  resource_group_name        = azurerm_resource_group.main.name
  location                   = azurerm_resource_group.main.location
  key_vault_id               = module.security.key_vault_id
  storage_account_id         = module.storage.ml_storage_account_id
  application_insights_id    = module.monitoring.application_insights_id
  private_endpoint_subnet    = module.networking.private_endpoint_subnet_id
  cognitive_private_dns_zone = module.networking.private_dns_zone_ids.cognitive
  tags                       = local.tags
}

data "azurerm_client_config" "current" {}
