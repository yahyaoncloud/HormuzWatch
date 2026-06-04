resource "azurerm_static_web_app" "dashboard" {
  name                = "stapp-${var.name_prefix}"
  resource_group_name = var.resource_group_name
  location            = var.location
  sku_tier            = "Free"
  sku_size            = "Free"
  tags                = var.tags
}
