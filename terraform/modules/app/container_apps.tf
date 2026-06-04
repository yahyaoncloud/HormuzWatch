resource "azurerm_container_registry" "acr" {
  name                = replace("acr${var.name_prefix}", "-", "")
  resource_group_name = var.resource_group_name
  location            = var.location
  sku                 = "Standard"
  admin_enabled       = true
  tags                = var.tags
}

resource "azurerm_container_app_environment" "env" {
  name                       = "cae-${var.name_prefix}"
  location                   = var.location
  resource_group_name        = var.resource_group_name
  log_analytics_workspace_id = var.log_analytics_workspace_id
  tags                       = var.tags
}

resource "azurerm_container_app" "ml_service" {
  name                         = "ca-${var.name_prefix}-ml"
  container_app_environment_id = azurerm_container_app_environment.env.id
  resource_group_name          = var.resource_group_name
  revision_mode                = "Single"
  tags                         = var.tags

  registry {
    server               = azurerm_container_registry.acr.login_server
    username             = azurerm_container_registry.acr.admin_username
    password_secret_name = "registry-password"
  }

  secret {
    name  = "registry-password"
    value = azurerm_container_registry.acr.admin_password
  }

  ingress {
    allow_insecure_connections = false
    external                   = false
    target_port                = 8090
    traffic_weight {
      percentage      = 100
      latest_revision = true
    }
  }

  template {
    container {
      name   = "ml-service"
      image  = "${azurerm_container_registry.acr.login_server}/ml-service:latest"
      cpu    = 1.0
      memory = "2.0Gi"
    }
  }

  # Ignore changes to the image tag in terraform because it is managed by github actions
  lifecycle {
    ignore_changes = [
      template[0].container[0].image
    ]
  }
}

resource "azurerm_container_app" "backend" {
  name                         = "ca-${var.name_prefix}-api"
  container_app_environment_id = azurerm_container_app_environment.env.id
  resource_group_name          = var.resource_group_name
  revision_mode                = "Single"
  tags                         = var.tags

  registry {
    server               = azurerm_container_registry.acr.login_server
    username             = azurerm_container_registry.acr.admin_username
    password_secret_name = "registry-password"
  }

  secret {
    name  = "registry-password"
    value = azurerm_container_registry.acr.admin_password
  }

  ingress {
    allow_insecure_connections = false
    external                   = true
    target_port                = 8080
    traffic_weight {
      percentage      = 100
      latest_revision = true
    }
    cors {
      allowed_origins = ["*"]
      allowed_methods = ["*"]
      allowed_headers = ["*"]
    }
  }

  template {
    container {
      name   = "backend"
      image  = "${azurerm_container_registry.acr.login_server}/backend:latest"
      cpu    = 1.0
      memory = "2.0Gi"
      env {
        name  = "ML_SERVICE_URL"
        value = "http://${azurerm_container_app.ml_service.ingress[0].fqdn}"
      }
    }
  }

  lifecycle {
    ignore_changes = [
      template[0].container[0].image
    ]
  }
}
