# Outbox replay: list FAILED rows or reset one to PENDING so relay republishes.
# Requires Docker Desktop + container orderflow-postgres.
#
# Usage:
#   .\backend\scripts\outbox-replay.ps1 -Service order -List
#   .\backend\scripts\outbox-replay.ps1 -Service inventory -List
#   .\backend\scripts\outbox-replay.ps1 -Service payment -List
#   .\backend\scripts\outbox-replay.ps1 -Service order -Id <uuid>
#   .\backend\scripts\outbox-replay.ps1 -Service order -Id <uuid> -DryRun
#
# After -Id: keep order/inventory/payment running so outbox relay picks PENDING again.

param(
    [Parameter(Mandatory = $true)]
    [ValidateSet("order", "inventory", "payment")]
    [string]$Service,

    [switch]$List,

    [string]$Id,

    [switch]$DryRun
)

$ErrorActionPreference = "Stop"

$container = "orderflow-postgres"
$user = "orderflow"

$dbMap = @{
    order      = "orderflow_order"
    inventory  = "orderflow_inventory"
    payment    = "orderflow_payment"
}

$db = $dbMap[$Service]

function Invoke-Psql([string]$Sql) {
    $escaped = $Sql -replace '"', '\"'
    docker exec $container psql -U $user -d $db -v ON_ERROR_STOP=1 -c $Sql
    if ($LASTEXITCODE -ne 0) {
        throw "psql failed (exit $LASTEXITCODE). Is Docker up and container '$container' running?"
    }
}

if (-not $List -and -not $Id) {
    Write-Host "Specify -List and/or -Id <uuid>"
    Write-Host "Example: .\backend\scripts\outbox-replay.ps1 -Service order -List"
    exit 1
}

Write-Host "Service=$Service  DB=$db  container=$container"
Write-Host ""

if ($List) {
    Write-Host "=== FAILED outbox_messages ($Service) ==="
    Invoke-Psql @"
SELECT id::text, event_type, topic, retry_count, left(coalesce(last_error, ''), 80) AS last_error, created_at
FROM outbox_messages
WHERE status = 'FAILED'
ORDER BY created_at DESC
LIMIT 50;
"@
}

if ($Id) {
    if ($DryRun) {
        Write-Host "[DryRun] Would reset outbox id=$Id to PENDING (retry_count=0, last_error=NULL)"
        Invoke-Psql "SELECT id::text, status, event_type, topic, retry_count, last_error FROM outbox_messages WHERE id = '$Id';"
        exit 0
    }

    Write-Host "Resetting outbox id=$Id → PENDING ..."
    Invoke-Psql @"
UPDATE outbox_messages
SET status = 'PENDING',
    retry_count = 0,
    last_error = NULL,
    published_at = NULL
WHERE id = '$Id' AND status = 'FAILED';
"@

    Write-Host ""
    Write-Host "Done. Relay in $Service-service will republish on next poll."
    Write-Host "Check Kafka UI http://localhost:8080 and service logs."
}
