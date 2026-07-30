# Load locally built images into kind cluster "orderflow".
$ErrorActionPreference = 'Stop'

$images = @(
  'orderflow/api-gateway:local',
  'orderflow/auth-service:local',
  'orderflow/order-service:local',
  'orderflow/catalog-service:local',
  'orderflow/inventory-service:local',
  'orderflow/payment-service:local',
  'orderflow/notification-service:local',
  'orderflow/analytics-service:local'
)

foreach ($img in $images) {
  Write-Host "==> kind load $img"
  kind load docker-image $img --name orderflow
}

Write-Host 'Done.'
