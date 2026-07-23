output "vm_public_ip" {
  description = "The public IP address of the Virtual Machine"
  value       = azurerm_public_ip.main.ip_address
}

output "vm_ssh_command" {
  description = "Command to SSH into the Virtual Machine"
  value       = "ssh ${var.admin_username}@${azurerm_public_ip.main.ip_address}"
}

output "client_url" {
  description = "The URL to access the React Client"
  value       = "http://${azurerm_public_ip.main.ip_address}:3000"
}

output "server_url" {
  description = "The URL to access the Go Server Health Check"
  value       = "http://${azurerm_public_ip.main.ip_address}:8081/health"
}
