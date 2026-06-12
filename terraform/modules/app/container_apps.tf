# ─── Container Registry ──────────────────────────────────────────────────────
resource "azurerm_container_registry" "acr" {
  name                = replace("acr${var.name_prefix}", "-", "")
  resource_group_name = var.resource_group_name
  location            = var.location
  sku                 = "Standard"
  admin_enabled       = true
  tags                = var.tags
}

# ─── Container Apps Environment (VNet-integrated) ────────────────────────────
resource "azurerm_container_app_environment" "env" {
  name                       = "cae-${var.name_prefix}"
  location                   = var.location
  resource_group_name        = var.resource_group_name
  log_analytics_workspace_id = var.log_analytics_workspace_id

  # VNet integration — gives ACA access to all private resources
  infrastructure_subnet_id       = var.container_apps_subnet_id
  internal_load_balancer_enabled = true

  tags = var.tags
}

# ─── ML Service (FastAPI) ────────────────────────────────────────────────────
resource "azurerm_container_app" "ml_service" {
  name                         = "ca-${var.name_prefix}-ml"
  container_app_environment_id = azurerm_container_app_environment.env.id
  resource_group_name          = var.resource_group_name
  revision_mode                = "Single"
  tags                         = var.tags

  identity {
    type = "SystemAssigned"
  }

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
    external                   = false  # Internal only — accessed by backend via ACA env FQDN
    target_port                = 8090
    traffic_weight {
      percentage      = 100
      latest_revision = true
    }
  }

  template {
    min_replicas = 0  # Scale to zero when idle
    max_replicas = 2

    container {
      name   = "ml-service"
      image  = "${azurerm_container_registry.acr.login_server}/ml-service:latest"
      cpu    = 0.5
      memory = "1.0Gi"

      # Liveness probe
      liveness_probe {
        path      = "/health"
        port      = 8090
        transport = "HTTP"
        initial_delay = 10
        period_seconds = 30
      }
    }
  }

  lifecycle {
    ignore_changes = [template[0].container[0].image]
  }
}

# ─── Go Backend API ───────────────────────────────────────────────────────────
resource "azurerm_container_app" "backend" {
  name                         = "ca-${var.name_prefix}-api"
  container_app_environment_id = azurerm_container_app_environment.env.id
  resource_group_name          = var.resource_group_name
  revision_mode                = "Single"
  tags                         = var.tags

  identity {
    type = "SystemAssigned"
  }

  registry {
    server               = azurerm_container_registry.acr.login_server
    username             = azurerm_container_registry.acr.admin_username
    password_secret_name = "registry-password"
  }

  secret {
    name  = "registry-password"
    value = azurerm_container_registry.acr.admin_password
  }

  # Secrets referencing Key Vault — populated at deploy time by CI/CD
  secret {
    name  = "database-url"
    value = "placeholder"  # Overwritten by GitHub Actions
  }

  secret {
    name  = "redis-url"
    value = "placeholder"  # Overwritten by GitHub Actions
  }

  ingress {
    allow_insecure_connections = false
    external                   = true
    target_port                = 8080
    traffic_weight {
      percentage      = 100
      latest_revision = true
    }
    cors_policy {
      allowed_origins     = ["*"]
      allowed_methods     = ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
      allowed_headers     = ["*"]
      max_age_in_seconds  = 86400
    }
  }

  template {
    min_replicas = 1
    max_replicas = 5

    # CPU-based autoscaling
    custom_scale_rule {
      name             = "cpu-scale"
      custom_rule_type = "cpu"
      metadata = {
        type  = "Utilization"
        value = "70"
      }
    }

    container {
      name   = "backend"
      image  = "${azurerm_container_registry.acr.login_server}/backend:latest"
      cpu    = 1.0
      memory = "2.0Gi"

      env {
        name        = "DATABASE_URL"
        secret_name = "database-url"
      }

      env {
        name        = "REDIS_URL"
        secret_name = "redis-url"
      }

      env {
        name  = "ML_SERVICE_URL"
        value = "https://${azurerm_container_app.ml_service.ingress[0].fqdn}"
      }

      env {
        name  = "PORT"
        value = "8080"
      }

      env {
        name  = "GIN_MODE"
        value = "release"
      }

      liveness_probe {
        path      = "/health"
        port      = 8080
        transport = "HTTP"
        initial_delay = 15
        period_seconds = 30
      }

      readiness_probe {
        path      = "/health"
        port      = 8080
        transport = "HTTP"
      }
    }
  }

  lifecycle {
    ignore_changes = [
      template[0].container[0].image,
      secret,  # Managed by CI/CD with real Key Vault values
    ]
  }
}
