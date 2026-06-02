variable "alert_email" {
  type = string
}

variable "allowed_public_cidr" {
  type    = string
  default = "0.0.0.0/0"
}
