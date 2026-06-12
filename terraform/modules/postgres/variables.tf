variable "name_prefix" {
  description = "Resource naming prefix."
  type        = string
}

variable "resource_group_name" {
  type = string
}

variable "location" {
  type = string
}

variable "private_endpoint_subnet" {
  description = "Subnet ID for private endpoint."
  type        = string
}

variable "postgres_private_dns_zone_id" {
  description = "Private DNS zone ID for PostgreSQL."
  type        = string
}

variable "administrator_login" {
  description = "Admin username for PostgreSQL."
  type        = string
  default     = "hormuzadmin"
}

variable "administrator_password" {
  description = "Admin password for PostgreSQL — injected from Key Vault."
  type        = string
  sensitive   = true
}

variable "sku_name" {
  description = "SKU for the Flexible Server."
  type        = string
  default     = "B_Standard_B1ms"  # 1 vCore, 2 GB — cheapest production-capable SKU
}

variable "storage_mb" {
  description = "Storage size in MB."
  type        = number
  default     = 32768  # 32 GB
}

variable "key_vault_id" {
  description = "Key Vault to store the connection string secret."
  type        = string
}

variable "log_analytics_workspace_id" {
  type = string
}

variable "tags" {
  type    = map(string)
  default = {}
}
