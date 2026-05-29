# Build shell + remotes for nginx subpath deploy (same origin)
$ErrorActionPreference = "Stop"
$ClientRoot = Split-Path -Parent $PSScriptRoot
Push-Location $ClientRoot
try {
    if (-not (Test-Path "node_modules")) {
        pnpm install
    }

    $env:VITE_API_URL = if ($env:VITE_API_URL) { $env:VITE_API_URL } else { "http://localhost:3000" }

    $env:VITE_BASE_PATH = "/mfe-auth/"
    pnpm --filter @orderflow/mfe-auth exec vite build

    $env:VITE_BASE_PATH = "/mfe-orders/"
    pnpm --filter @orderflow/mfe-orders exec vite build

    Remove-Item Env:VITE_BASE_PATH -ErrorAction SilentlyContinue
    $env:VITE_MFE_AUTH_URL = "/mfe-auth/assets/remoteEntry.js"
    $env:VITE_MFE_ORDERS_URL = "/mfe-orders/assets/remoteEntry.js"
    pnpm --filter @orderflow/shell exec vite build

    Write-Host "Built: apps/shell/dist, apps/mfe-auth/dist, apps/mfe-orders/dist"
    Write-Host "Serve with client/infra/nginx/nginx.conf (see client/infra/README.md)"
} finally {
    Pop-Location
}
