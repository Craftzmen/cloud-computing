terraform {
  required_version = ">= 1.5.0"
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.0"
    }
  }
}

provider "azurerm" {
  features {}
}

resource "azurerm_resource_group" "minipaas" {
  name     = var.resource_group_name
  location = var.location
}

resource "azurerm_storage_account" "minipaas" {
  name                     = "minipaas${var.suffix}"
  resource_group_name      = azurerm_resource_group.minipaas.name
  location                 = azurerm_resource_group.minipaas.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
  min_tls_version          = "TLS1_2"
}

resource "azurerm_storage_container" "build_logs" {
  name                  = "build-logs"
  storage_account_id    = azurerm_storage_account.minipaas.id
  container_access_type = "private"
}

resource "azurerm_storage_container" "source_archives" {
  name                  = "source-archives"
  storage_account_id    = azurerm_storage_account.minipaas.id
  container_access_type = "private"
}

resource "azurerm_storage_table" "usage" {
  name                 = "usage"
  storage_account_name = azurerm_storage_account.minipaas.name
}

resource "azurerm_storage_table" "health" {
  name                 = "health"
  storage_account_name = azurerm_storage_account.minipaas.name
}

resource "azurerm_storage_table" "invoices" {
  name                 = "invoices"
  storage_account_name = azurerm_storage_account.minipaas.name
}