variable "name_prefix" { type = string }
variable "resource_group_name" { type = string }
variable "location" { type = string }
variable "private_endpoint_subnet" { type = string }
variable "eventhub_private_dns_zone_id" { type = string }
variable "log_analytics_workspace_id" { type = string }
variable "tags" { type = map(string) }
