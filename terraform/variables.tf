variable "project" {
  description = "Short project name used for resource naming."
  type        = string
  default     = "hormuzwatch"
}

variable "environment" {
  description = "Deployment environment name (dev, prod)."
  type        = string
  default     = "dev"
}

variable "location" {
  description = "Azure region for primary resources."
  type        = string
  default     = "eastus"
}

variable "alert_email" {
  description = "Operations email for Azure Monitor action groups."
  type        = string
}

variable "allowed_public_cidr" {
  description = "Administrative CIDR allowed to reach public management endpoints."
  type        = string
  default     = "0.0.0.0/0"
}

variable "postgres_sku" {
  description = "SKU for PostgreSQL Flexible Server."
  type        = string
  default     = "B_Standard_B1ms"
}

variable "postgres_storage_mb" {
  description = "Storage in MB for PostgreSQL server."
  type        = number
  default     = 32768
}

variable "postgres_admin_password" {
  description = "PostgreSQL administrator password. Set via TF_VAR or CI secret."
  type        = string
  sensitive   = true
}

variable "redis_sku" {
  description = "Redis SKU name (Basic|Standard|Premium)."
  type        = string
  default     = "Basic"
}

variable "redis_family" {
  description = "Redis SKU family (C or P)."
  type        = string
  default     = "C"
}

variable "redis_capacity" {
  description = "Redis cache size. C0=250MB, C1=1GB."
  type        = number
  default     = 1
}

variable "frontend_url" {
  description = "Deployed frontend URL (used for CORS allowed origins)."
  type        = string
  default     = ""
}

variable "tags" {
  description = "Tags applied to all resources."
  type        = map(string)
  default = {
    workload = "geospatial-maritime-intelligence"
    owner    = "platform-engineering"
    repo     = "yahyaoncloud/HormuzWatch"
  }
}
