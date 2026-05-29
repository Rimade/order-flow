# Stop Docker stack (keeps volumes / DB data)
$ErrorActionPreference = "Stop"
$BackendRoot = Split-Path -Parent $PSScriptRoot
$ComposeDir = Join-Path $BackendRoot "infra\compose"

Push-Location $ComposeDir
try {
    docker compose down
    Write-Host "Stopped. Data volumes preserved. Avoid 'docker compose down -v' unless you want a full DB reset."
} finally {
    Pop-Location
}
