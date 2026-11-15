output "storage_account_name" {
  value = azurerm_storage_account.minipaas.name
}

output "resource_group_name" {
  value = azurerm_resource_group.minipaas.name
}