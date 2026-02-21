"""
Deployment guide for Kubecent
"""

# Kubernetes Deployment Guide

## Prerequisites

- Kubernetes 1.20+ cluster
- kubectl configured to access cluster
- Helm 3+
- OpenCost installed (can be installed via Helm)
- Prometheus running in the cluster

### Install OpenCost (Optional - if not already installed)

```bash
helm repo add kubecost https://kubecost.github.io/cost-analyzer/
helm install kubecost kubecost/cost-analyzer \
  --namespace kubecost --create-namespace \
  --set prometheus.server.global.external_labels.cluster_id="my-cluster"
```

## Deploying Kubecent

### Step 1: Create Namespace

```bash
kubectl create namespace kubecent
```

### Step 2: Deploy with Helm

```bash
helm install kubecent ./helm/kubecent \
  --namespace kubecent \
  --values helm/kubecent/values.yaml
```

Or use custom values:

```bash
helm install kubecent ./helm/kubecent \
  --namespace kubecent \
  -f values-prod.yaml
```

### Step 3: Verify Deployment

```bash
# Check pods
kubectl -n kubecent get pods

# Check services
kubectl -n kubecent get svc

# View logs
kubectl -n kubecent logs -f deployment/kubecent-backend

# Check RBAC
kubectl -n kubecent get sa,roles,rolebindings
```

### Step 4: Access the UI

#### Option 1: NodePort (Default)
```bash
# Find node port
kubectl -n kubecent get svc kubecent-frontend

# Access via: http://<node-ip>:<node-port>
```

#### Option 2: Port Forward
```bash
kubectl -n kubecent port-forward svc/kubecent-frontend 3000:80
# Access via: http://localhost:3000
```

#### Option 3: Ingress
Enable in values.yaml:
```yaml
ingress:
  enabled: true
  className: nginx
  hosts:
    - host: kubecent.example.com
      paths:
        - path: /
          pathType: Prefix
  tls:
    - secretName: kubecent-tls
      hosts:
        - kubecent.example.com
```

Then install:
```bash
helm install kubecent ./helm/kubecent \
  --namespace kubecent \
  -f helm/kubecent/values.yaml
```

## Configuration

### Custom Values Example

Create `values-custom.yaml`:

```yaml
replicaCount: 3

image:
  backend:
    repository: myregistry/kubecent-backend
    tag: v0.1.0
  frontend:
    repository: myregistry/kubecent-frontend
    tag: v0.1.0

opencost:
  url: "http://kubecost-cost-analyzer:9003"

prometheus:
  url: "http://prometheus-server:9090"

resources:
  limits:
    cpu: 1000m
    memory: 1Gi
  requests:
    cpu: 500m
    memory: 512Mi

autoscaling:
  enabled: true
  minReplicas: 3
  maxReplicas: 10
  targetCPUUtilizationPercentage: 70

ingress:
  enabled: true
  className: nginx
  hosts:
    - host: cost.mycompany.com
```

Deploy with custom values:
```bash
helm install kubecent ./helm/kubecent \
  --namespace kubecent \
  -f values-custom.yaml
```

## Upgrades

```bash
# Update Helm dependencies
helm dependency update ./helm/kubecent

# Upgrade
helm upgrade kubecent ./helm/kubecent \
  --namespace kubecent \
  -f helm/kubecent/values.yaml

# Check status
helm status kubecent -n kubecent
```

## Uninstallation

```bash
helm uninstall kubecent -n kubecent
kubectl delete namespace kubecent
```

## Troubleshooting

### Backend not connecting to OpenCost

```bash
# Check if OpenCost is accessible
kubectl -n kubecent exec deployment/kubecent-backend -- \
  curl http://opencost:9003/health

# If not accessible, check your values.yaml opencost.url
```

### Backend pod won't start

```bash
# Check logs
kubectl -n kubecent logs deployment/kubecent-backend

# Check events
kubectl -n kubecent describe deployment kubecent-backend

# Check resource availability
kubectl describe nodes
```

### Frontend can't reach backend

```bash
# Verify service DNS
kubectl -n kubecent exec deployment/kubecent-frontend -- \
  nslookup kubecent-backend

# Check nginx logs
kubectl -n kubecent logs deployment/kubecent-frontend
```

### RBAC authentication failing

```bash
# Check service account
kubectl -n kubecent get sa kubecent

# Check cluster role
kubectl get clusterrole kubecent

# Check token
kubectl -n kubecent get secrets
```

## Production Checklist

- [ ] Use private image registry
- [ ] Set resource limits appropriately
- [ ] Enable autoscaling
- [ ] Use Ingress with TLS
- [ ] Configure network policies
- [ ] Set up monitoring alerts
- [ ] Configure persistent logging
- [ ] Regular backups of configuration
- [ ] Security scanning of images
- [ ] Enable pod security standards

## Monitoring

### Prometheus Targets

Add to your Prometheus scrape config:

```yaml
scrape_configs:
  - job_name: 'kubecent'
    kubernetes_sd_configs:
      - role: pod
        namespaces:
          names:
            - kubecent
    relabel_configs:
      - source_labels: [__meta_kubernetes_pod_label_app]
        action: keep
        regex: kubecent
```

### Useful Metrics

- `kubecent_api_requests_total` - Total API requests
- `kubecent_api_request_duration_seconds` - Request latency
- `kubecent_cache_hits_total` - Cache hit count
- `kubecent_opencost_api_errors_total` - OpenCost API errors

## Backup & Disaster Recovery

Kubecent is stateless - no persistent data to backup. Configuration is stored in:
- ConfigMaps
- Secrets
- Helm values

Backup your Helm values:
```bash
helm get values kubecent -n kubecent > kubecent-values-backup.yaml
```

## Multi-Environment Deployment

### Development
```bash
helm install kubecent-dev ./helm/kubecent \
  --namespace kubecent-dev \
  -f values-dev.yaml
```

### Staging
```bash
helm install kubecent-staging ./helm/kubecent \
  --namespace kubecent-staging \
  -f values-staging.yaml
```

### Production
```bash
helm install kubecent-prod ./helm/kubecent \
  --namespace kubecent-prod \
  -f values-prod.yaml
```
