#!/usr/bin/env bash
# Sets GitHub Actions secrets using Azure CLI + gh. Requires: az login, gh auth login.
set -euo pipefail
source ~/minipaas-azure.env

if ! gh auth status >/dev/null 2>&1; then
  echo "Run once: gh auth login --git-protocol ssh --web"
  exit 1
fi

FUNC_NAME="${FUNCAPP:-minipaas-fn-28338}"
SWA_NAME="${SWA:-minipaas-dash-28338}"
RG="${AZURE_RESOURCE_GROUP:-minipaas-rg}"

SWA_TOKEN="$(az staticwebapp secrets list -n "$SWA_NAME" -g "$RG" --query properties.apiKey -o tsv)"
gh secret set AZURE_STATIC_WEB_APPS_API_TOKEN -b"$SWA_TOKEN"
gh secret set AZURE_FUNCTIONAPP_NAME -b"$FUNC_NAME"

# Flex Consumption: publish profile XML is not supported; use RBAC for func publish in CI.
if az functionapp deployment list-publishing-profiles -g "$RG" -n "$FUNC_NAME" --xml >/tmp/minipaas-fn-profile.xml 2>/dev/null; then
  gh secret set AZURE_FUNCTIONAPP_PUBLISH_PROFILE < /tmp/minipaas-fn-profile.xml
  rm -f /tmp/minipaas-fn-profile.xml
else
  echo "Skipping publish profile (Flex plan). Use AZURE_CREDENTIALS + func publish in the workflow."
fi

echo "GitHub secrets updated."