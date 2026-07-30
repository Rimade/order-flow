# Apply smoke slice (gateway + auth). Needs LoadRestrictionsNone for ../ paths.
$ErrorActionPreference = 'Stop'
$Root = Resolve-Path (Join-Path $PSScriptRoot '..\infra\k8s\overlays\smoke')
kubectl kustomize --load-restrictor LoadRestrictionsNone $Root | kubectl apply -f -
