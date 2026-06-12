variable "name_prefix" {
  type = string
}

variable "resource_group_name" {
  type = string
}

variable "location" {
  type = string
}

variable "sku_name" {
  description = "Redis SKU. Basic=dev, Standard=prod."
  type        = string
  default     = "Basic"
}

variable "sku_family" {
  type    = string
  default = "C"
}

variable "sku_capacity" {
  description = "Cache size. C0=250MB, C1=1GB."
  type        = number
  default     = 1
}

variable "private_endpoint_subnet" {
  type = string
}

variable "redis_private_dns_zone_id" {
  type = string
}

variable "key_vault_id" {
  type = string
}

variable "log_analytics_workspace_id" {
  type = string
}

variable "tags" {
  type    = map(string)
  default = {}
}
