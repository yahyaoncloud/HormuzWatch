project     = "hormuzwatch"
environment = "prod"
location    = "eastus"

alert_email         = "ops@hormuzwatch.io"
allowed_public_cidr = "0.0.0.0/0"  # Restrict to known admin IPs in production

# PostgreSQL — production-capable SKU with sufficient storage
postgres_sku        = "GP_Standard_D2s_v3"
postgres_storage_mb = 131072  # 128 GB

# Redis — Standard C1 (1 GB) with replication for HA
redis_sku      = "Standard"
redis_family   = "C"
redis_capacity = 1

frontend_url = "https://hormuzwatch.azurestaticapps.net"

tags = {
  workload    = "geospatial-maritime-intelligence"
  environment = "prod"
  owner       = "platform-engineering"
  cost-center = "production"
  criticality = "high"
}
