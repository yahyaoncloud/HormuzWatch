terraform {
  backend "azurerm" {
    resource_group_name  = "rg-hormuzshield-tfstate"
    storage_account_name = "sthormuzshieldtfstate"
    container_name       = "tfstate"
    key                  = "hormuzshield/dev.tfstate"
  }
}
