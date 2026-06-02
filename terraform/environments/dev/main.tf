module "platform" {
  source = "../.."

  project             = "hormuzshield"
  environment         = "dev"
  location            = "eastus"
  alert_email         = var.alert_email
  allowed_public_cidr = var.allowed_public_cidr
}
