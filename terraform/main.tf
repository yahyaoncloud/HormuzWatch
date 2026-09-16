locals {
  project_clean = var.project != "hormuzwatch" ? var.project : var.project_name
  prefix        = "${local.project_clean}-${var.environment}"
  tags = {
    Environment = var.environment
    Project     = local.project_clean
    ManagedBy   = "Terraform"
  }
}

data "azurerm_client_config" "current" {}

# Central Resource Group
resource "azurerm_resource_group" "main" {
  name     = "rg-${local.prefix}"
  location = var.location
  tags     = local.tags
}

# 1. Networking Module (VNet, Subnets, NSGs, Private DNS Zones)
module "networking" {
  source              = "./modules/networking"
  name_prefix         = local.prefix
  location            = var.location
  resource_group_name = azurerm_resource_group.main.name
  allowed_public_cidr = var.allowed_public_cidr
  tags                = local.tags
}

# 2. Monitoring Module (Log Analytics Workspace, Application Insights, Action Group)
module "monitoring" {
  source              = "./modules/monitoring"
  name_prefix         = local.prefix
  location            = var.location
  resource_group_name = azurerm_resource_group.main.name
  alert_email         = var.alert_email
  tags                = local.tags
}

# 3. Security Module (Key Vault, Private Endpoint, RBAC Role Assignment)
module "security" {
  source                  = "./modules/security"
  name_prefix             = local.prefix
  location                = var.location
  resource_group_name     = azurerm_resource_group.main.name
  tenant_id               = data.azurerm_client_config.current.tenant_id
  current_principal_id    = data.azurerm_client_config.current.object_id
  private_endpoint_subnet = module.networking.private_endpoint_subnet_id
  private_dns_zone_ids    = module.networking.private_dns_zone_ids
  tags                    = local.tags
}

# 4. Storage Module (LRS Storage Account, Private Endpoint, Blob Containers)
module "storage" {
  source                     = "./modules/storage"
  name_prefix                = local.prefix
  location                   = var.location
  resource_group_name        = azurerm_resource_group.main.name
  private_endpoint_subnet    = module.networking.private_endpoint_subnet_id
  blob_private_dns_zone_id   = module.networking.private_dns_zone_ids.blob
  log_analytics_workspace_id = module.monitoring.log_analytics_workspace_id
  tags                       = local.tags
}

# 5. Event Hubs Module (Telemetry Ingest & Analytics Event Hubs, Private Endpoint)
module "event_hubs" {
  source                         = "./modules/event_hubs"
  name_prefix                    = local.prefix
  location                       = var.location
  resource_group_name            = azurerm_resource_group.main.name
  private_endpoint_subnet        = module.networking.private_endpoint_subnet_id
  eventhub_private_dns_zone_id   = module.networking.private_dns_zone_ids.eventhub
  log_analytics_workspace_id     = module.monitoring.log_analytics_workspace_id
  tags                           = local.tags
}

# 6. Application Module (Serverless Container Apps, Free-Tier Static Web App, ACR)
module "app" {
  source                     = "./modules/app"
  name_prefix                = local.prefix
  location                   = var.location
  resource_group_name        = azurerm_resource_group.main.name
  log_analytics_workspace_id = module.monitoring.log_analytics_workspace_id
  tags                       = local.tags
}
