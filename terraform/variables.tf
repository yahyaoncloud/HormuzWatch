variable "project" {
  description = "Short project name used for resource naming."
  type        = string
  default     = "hormuzshield"
}

variable "environment" {
  description = "Deployment environment name."
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

variable "tags" {
  description = "Tags applied to all resources."
  type        = map(string)
  default = {
    workload = "Geospatial-analytics"
    owner    = "platform-engineering"
  }
}
