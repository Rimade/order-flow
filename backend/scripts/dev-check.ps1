# Quick HTTP health checks (auth + gateway must be running)
$ErrorActionPreference = "Continue"

function Test-Health($Name, $Url) {
    try {
        $r = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 5
        Write-Host "[OK] $Name -> $($r.StatusCode) $Url"
    } catch {
        Write-Host "[FAIL] $Name -> $Url ($($_.Exception.Message))"
    }
}

Test-Health "auth-service" "http://localhost:3001/health"
Test-Health "api-gateway" "http://localhost:3000/health"
Test-Health "order-service" "http://localhost:3002/health"

Write-Host ""
Write-Host "Kafka UI: http://localhost:8080"
Write-Host "RabbitMQ UI: http://localhost:15672 (orderflow / orderflow)"
