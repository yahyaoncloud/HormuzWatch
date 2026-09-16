variable "location" {
  description = "The Azure Region to deploy resources into (Mumbai = centralindia)"
  type        = string
  default     = "centralindia"
}

variable "environment" {
  description = "The environment name (e.g. dev, prod)"
  type        = string
  default     = "dev"
}

variable "project" {
  description = "The name of the project"
  type        = string
  default     = "hormuzwatch"
}

variable "project_name" {
  description = "The name of the project (alias for project)"
  type        = string
  default     = "hormuzwatch"
}

variable "alert_email" {
  description = "Notification email address for monitoring and health alerts"
  type        = string
  default     = "ops@hormuzwatch.io"
}

variable "allowed_public_cidr" {
  description = "CIDR allowed for public HTTPS traffic"
  type        = string
  default     = "0.0.0.0/0"
}

variable "admin_allowed_cidr" {
  description = "Allowed CIDR block for administrative access"
  type        = string
  default     = "127.0.0.1/32"
}

variable "vm_size" {
  description = "Optional Virtual Machine size for legacy VM configurations"
  type        = string
  default     = "Standard_B2s"
}

variable "admin_username" {
  description = "Admin username"
  type        = string
  default     = "azureuser"
}

variable "ssh_public_key" {
  description = "Public SSH key for VM authentication"
  type        = string
  default     = ""
  sensitive   = true
}
