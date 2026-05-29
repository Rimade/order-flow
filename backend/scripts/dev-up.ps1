# Start local infrastructure (Postgres, Redis, Kafka, RabbitMQ, Kafka UI)
$ErrorActionPreference = "Stop"
$BackendRoot = Split-Path -Parent $PSScriptRoot
$ComposeDir = Join-Path $BackendRoot "infra\compose"

Push-Location $ComposeDir
try {
    if (-not (Test-Path ".env")) {
        Copy-Item ".env.example" ".env"
        Write-Host "Created backend/infra/compose/.env from .env.example"
    }
    docker compose up -d
    docker compose ps
} finally {
    Pop-Location
}
