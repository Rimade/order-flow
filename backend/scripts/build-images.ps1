# Build all OrderFlow backend images (context = backend/).
# Usage (PowerShell, from repo root):
#   .\backend\scripts\build-images.ps1
#   kind load docker-image orderflow/api-gateway:local ...

$ErrorActionPreference = 'Stop'
$BackendRoot = Resolve-Path (Join-Path $PSScriptRoot '..')

$images = @(
  @{ Name = 'api-gateway'; File = 'services/api-gateway/Dockerfile' },
  @{ Name = 'auth-service'; File = 'services/auth-service/Dockerfile' },
  @{ Name = 'order-service'; File = 'services/order-service/Dockerfile' },
  @{ Name = 'catalog-service'; File = 'services/catalog-service/Dockerfile' },
  @{ Name = 'inventory-service'; File = 'services/inventory-service/Dockerfile' },
  @{ Name = 'payment-service'; File = 'services/payment-service/Dockerfile' },
  @{ Name = 'notification-service'; File = 'services/notification-service/Dockerfile' },
  @{ Name = 'analytics-service'; File = 'services/analytics-service/Dockerfile' }
)

Push-Location $BackendRoot
try {
  foreach ($img in $images) {
    $tag = "orderflow/$($img.Name):local"
    Write-Host "==> Building $tag"
    docker build -f $img.File -t $tag .
  }
  Write-Host 'Done. Load into kind, e.g.:'
  Write-Host '  kind load docker-image orderflow/api-gateway:local orderflow/auth-service:local ...'
}
finally {
  Pop-Location
}
