variable "name_prefix" {
  type = string
}

variable "resource_group_name" {
  type = string
}

variable "location" {
  type = string
}

variable "log_analytics_workspace_id" {
  type = string
}

variable "container_apps_subnet_id" {
  description = "VNet-integrated subnet for Container Apps environment."
  type        = string
}

variable "key_vault_id" {
  description = "Key Vault ID to read DATABASE_URL and REDIS_URL secrets."
  type        = string
}

variable "tags" {
  type    = map(string)
  default = {}
}
