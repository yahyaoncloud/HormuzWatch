module "platform" {
  source = "../.."

  project             = "hormuzshield"
  environment         = "test"
  location            = "eastus2"
  alert_email         = var.alert_email
  allowed_public_cidr = var.allowed_public_cidr
}
