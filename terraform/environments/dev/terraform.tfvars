project     = "hormuzwatch"
environment = "dev"
location    = "eastus"

alert_email         = "ops-dev@hormuzwatch.io"
allowed_public_cidr = "0.0.0.0/0"

# PostgreSQL — smallest dev SKU
postgres_sku        = "B_Standard_B1ms"
postgres_storage_mb = 32768

# Redis — Basic C0 (250 MB) sufficient for dev
redis_sku      = "Basic"
redis_family   = "C"
redis_capacity = 0

frontend_url = "http://localhost:5173"

tags = {
  workload    = "geospatial-maritime-intelligence"
  environment = "dev"
  owner       = "platform-engineering"
  cost-center = "dev-sandbox"
}
