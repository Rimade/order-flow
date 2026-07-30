# OrderFlow Kubernetes manifests

Учебный слой (kind + Kustomize). Runbook: [../../docs/kubernetes.md](../../docs/kubernetes.md).

```powershell
# full stack
kubectl apply -k .

# smoke (gateway + auth) — from repo:
#   .\backend\scripts\k8s-apply-smoke.ps1
```
