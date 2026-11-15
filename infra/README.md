# MiniPaaS infrastructure

## Terraform (Azure data plane)

Provisions the **resource group**, **storage account**, **tables** (`usage`, `health`, `invoices`), and **blob containers** (`build-logs`, `source-archives`). Function App and Static Web App stay on Flex Consumption / Free tiers and are published via GitHub Actions (`func` / SWA CLI), not in Terraform, to avoid locking in billable SKUs.

```bash
cd infra/terraform/azure
cp terraform.tfvars.example terraform.tfvars
# edit suffix to match ~/minipaas-azure.env
az login
terraform init
terraform plan
terraform apply
```

Do not commit `terraform.tfvars` or connection strings.

## GitHub Actions secrets

| Secret | Used by |
|--------|---------|
| `AZURE_FUNCTIONAPP_NAME` | functions workflow |
| `AZURE_FUNCTIONAPP_PUBLISH_PROFILE` | functions workflow |
| `AZURE_STATIC_WEB_APPS_API_TOKEN` | dashboard workflow |

## Local Git builds

See `build-worker/README.md` and `scripts/k3d-registry.sh`.