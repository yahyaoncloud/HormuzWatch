variable "name_prefix" { type = string }
variable "resource_group_name" { type = string }
variable "location" { type = string }
variable "allowed_public_cidr" { type = string }
variable "tags" { type = map(string) }
