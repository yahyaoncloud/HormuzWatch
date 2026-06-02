variable "name_prefix" { type = string }
variable "resource_group_name" { type = string }
variable "location" { type = string }
variable "function_subnet_id" { type = string }
variable "storage_account_name" { type = string }
variable "storage_account_access_key" {
  type      = string
  sensitive = true
}
variable "app_insights_connection" {
  type      = string
  sensitive = true
}
variable "log_analytics_workspace_id" { type = string }
variable "tags" { type = map(string) }
