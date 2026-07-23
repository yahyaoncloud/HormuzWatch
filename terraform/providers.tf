terraform {
  required_version = ">= 1.5.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.80.0"
    }
  }

  # Uncomment and configure this block if you want to use Azure Storage for remote state
  # backend "azurerm" {
  #   resource_group_name  = "rg-terraform-state"
  #   storage_account_name = "stterraformstatehw"
  #   container_name       = "tfstate"
  #   key                  = "hormuzwatch.tfstate"
  # }
}

provider "azurerm" {
  features {}
}
