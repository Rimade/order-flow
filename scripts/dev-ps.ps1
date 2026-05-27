$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
Push-Location (Join-Path $Root "infra\compose")
try {
    docker compose ps
} finally {
    Pop-Location
}
