param(
  [string]$ResourceGroupName = "rg-hormuzshield-tfstate",
  [string]$Location = "eastus",
  [string]$StorageAccountName = "sthormuzshieldtfstate",
  [string]$ContainerName = "tfstate"
)

az group create --name $ResourceGroupName --location $Location
az storage account create --name $StorageAccountName --resource-group $ResourceGroupName --location $Location --sku Standard_LRS --min-tls-version TLS1_2
$key = az storage account keys list --resource-group $ResourceGroupName --account-name $StorageAccountName --query "[0].value" -o tsv
az storage container create --name $ContainerName --account-name $StorageAccountName --account-key $key
