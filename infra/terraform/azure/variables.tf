variable "suffix" {
  description = "Unique suffix for resource names (e.g. 28338)"
  type        = string
}

variable "location" {
  description = "Azure region"
  type        = string
  default     = "eastus"
}

variable "resource_group_name" {
  description = "Existing or new resource group name"
  type        = string
  default     = "minipaas-rg"
}