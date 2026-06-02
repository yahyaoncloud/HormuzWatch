variable "name_prefix" { type = string }
variable "resource_group_name" { type = string }
variable "location" { type = string }
variable "tenant_id" { type = string }
variable "current_principal_id" { type = string }
variable "private_endpoint_subnet" { type = string }
variable "private_dns_zone_ids" { type = map(string) }
variable "tags" { type = map(string) }
