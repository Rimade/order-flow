$ErrorActionPreference = "Stop"
$BackendRoot = Split-Path -Parent $PSScriptRoot
Push-Location (Join-Path $BackendRoot "infra\compose")
try {
    docker compose ps
} finally {
    Pop-Location
}
