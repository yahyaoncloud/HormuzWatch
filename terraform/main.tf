locals {
  name_prefix = "${var.project}-${var.environment}"
  tags = merge(var.tags, {
    project     = var.project
    environment = var.environment
  })
}

data "azurerm_client_config" "current" {}

# ─── Resource Group ───────────────────────────────────────────────────────────
resource "azurerm_resource_group" "main" {
  name     = "rg-${local.name_prefix}"
  location = var.location
  tags     = local.tags
}

# ─── Networking ───────────────────────────────────────────────────────────────
module "networking" {
  source              = "./modules/networking"
  name_prefix         = local.name_prefix
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  allowed_public_cidr = var.allowed_public_cidr
  tags                = local.tags
}

# ─── Monitoring ───────────────────────────────────────────────────────────────
module "monitoring" {
  source              = "./modules/monitoring"
  name_prefix         = local.name_prefix
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  alert_email         = var.alert_email
  tags                = local.tags
}

# ─── Security (Key Vault) ────────────────────────────────────────────────────
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

# ─── Storage ──────────────────────────────────────────────────────────────────
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

# ─── Event Hubs ───────────────────────────────────────────────────────────────
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

# ─── PostgreSQL Flexible Server ───────────────────────────────────────────────
module "postgres" {
  source                       = "./modules/postgres"
  name_prefix                  = local.name_prefix
  resource_group_name          = azurerm_resource_group.main.name
  location                     = azurerm_resource_group.main.location
  administrator_password       = var.postgres_admin_password
  sku_name                     = var.postgres_sku
  storage_mb                   = var.postgres_storage_mb
  private_endpoint_subnet      = module.networking.postgres_subnet_id
  postgres_private_dns_zone_id = module.networking.private_dns_zone_ids.postgres
  key_vault_id                 = module.security.key_vault_id
  log_analytics_workspace_id   = module.monitoring.log_analytics_workspace_id
  tags                         = local.tags
}

# ─── Redis Cache ──────────────────────────────────────────────────────────────
module "redis" {
  source                     = "./modules/redis"
  name_prefix                = local.name_prefix
  resource_group_name        = azurerm_resource_group.main.name
  location                   = azurerm_resource_group.main.location
  sku_name                   = var.redis_sku
  sku_family                 = var.redis_family
  sku_capacity               = var.redis_capacity
  private_endpoint_subnet    = module.networking.private_endpoint_subnet_id
  redis_private_dns_zone_id  = module.networking.private_dns_zone_ids.redis
  key_vault_id               = module.security.key_vault_id
  log_analytics_workspace_id = module.monitoring.log_analytics_workspace_id
  tags                       = local.tags
}

# ─── Container Apps (API + ML) ───────────────────────────────────────────────
module "app" {
  source                     = "./modules/app"
  name_prefix                = local.name_prefix
  resource_group_name        = azurerm_resource_group.main.name
  location                   = azurerm_resource_group.main.location
  log_analytics_workspace_id = module.monitoring.log_analytics_workspace_id
  container_apps_subnet_id   = module.networking.container_apps_subnet_id
  key_vault_id               = module.security.key_vault_id
  tags                       = local.tags
}

# ─── AI Services ──────────────────────────────────────────────────────────────
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

# ─── Grant backend identity access to Key Vault ──────────────────────────────
resource "azurerm_key_vault_access_policy" "backend" {
  key_vault_id = module.security.key_vault_id
  tenant_id    = data.azurerm_client_config.current.tenant_id
  object_id    = module.app.backend_identity_principal_id

  secret_permissions = ["Get", "List"]
}

resource "azurerm_key_vault_access_policy" "ml" {
  key_vault_id = module.security.key_vault_id
  tenant_id    = data.azurerm_client_config.current.tenant_id
  object_id    = module.app.ml_identity_principal_id

  secret_permissions = ["Get", "List"]
}
