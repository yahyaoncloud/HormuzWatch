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

variable "project_name" {
  description = "The name of the project"
  type        = string
  default     = "hormuzwatch"
}

variable "vm_size" {
  description = "The size of the Virtual Machine"
  type        = string
  default     = "Standard_B2s" # 2 vCPU, 4GB RAM (good for Docker Compose)
}

variable "admin_username" {
  description = "Admin username for the VM"
  type        = string
  default     = "azureuser"
}

variable "ssh_public_key" {
  description = "Public SSH key for VM authentication (cat ~/.ssh/id_rsa.pub)"
  type        = string
  sensitive   = true
}
