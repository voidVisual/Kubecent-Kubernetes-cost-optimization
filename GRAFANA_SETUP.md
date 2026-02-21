# Grafana Monitoring Dashboard Setup

This guide will help you set up and integrate Grafana monitoring dashboards with KubeCent for comprehensive Kubernetes cluster monitoring and cost analytics.

## Overview

KubeCent Monitoring Dashboard delivers real-time visibility into Kubernetes cluster performance and cost analytics. It integrates with Prometheus and Grafana to visualize CPU, memory, and storage metrics, detect idle resources, track spending trends, and enable data-driven cost optimization.

## Prerequisites

- Kubernetes cluster (v1.19+)
- Helm 3.x installed
- kubectl configured with cluster access
- KubeCent backend and frontend deployed

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     KubeCent Application                     │
│  ┌───────────────┐              ┌──────────────────────┐    │
│  │   Frontend    │────────────▶ │     Backend API      │    │
│  │  (React/Vite) │              │   (FastAPI/Python)   │    │
│  └───────────────┘              └──────────────────────┘    │
│         │                                   │                │
│         └───────────────┬───────────────────┘                │
└─────────────────────────┼─────────────────────────────────────┘
                          │
                          ▼
        ┌────────────────────────────────────┐
        │         Monitoring Stack           │
        │  ┌──────────────────────────────┐  │
        │  │         Grafana              │  │
        │  │   (Visualization Layer)      │  │
        │  └──────────────────────────────┘  │
        │                │                    │
        │                ▼                    │
        │  ┌──────────────────────────────┐  │
        │  │        Prometheus            │  │
        │  │    (Metrics Collector)       │  │
        │  └──────────────────────────────┘  │
        │         │              │            │
        │         ▼              ▼            │
        │  ┌────────────┐  ┌─────────────┐   │
        │  │ Node       │  │ Kube-State  │   │
        │  │ Exporter   │  │ Metrics     │   │
        │  └────────────┘  └─────────────┘   │
        └────────────────────────────────────┘
                          │
                          ▼
              ┌─────────────────────┐
              │  Kubernetes Cluster │
              └─────────────────────┘
```

## Installation Methods

### Method 1: Using Helm Chart (Recommended)

#### Step 1: Add Prometheus Community Helm Repository

```bash
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update
```

#### Step 2: Install kube-prometheus-stack

Create a values file for customization:

```bash
cat > kube-prometheus-stack-values.yaml <<EOF
# Grafana Configuration
grafana:
  enabled: true
  adminPassword: "admin"  # Change this in production!
  
  # Enable dashboard sidecar for automatic dashboard loading
  sidecar:
    dashboards:
      enabled: true
      defaultFolderName: "KubeCent"
      label: grafana_dashboard
      labelValue: "1"
      folderAnnotation: grafana_folder
      searchNamespace: ALL
      provider:
        foldersFromFilesStructure: true
  
  # Grafana service configuration
  service:
    type: LoadBalancer
    port: 80
  
  # Persistence
  persistence:
    enabled: true
    size: 10Gi

# Prometheus Configuration
prometheus:
  prometheusSpec:
    retention: 30d
    storageSpec:
      volumeClaimTemplate:
        spec:
          accessModes: ["ReadWriteOnce"]
          resources:
            requests:
              storage: 50Gi

# Node Exporter Configuration
prometheus-node-exporter:
  prometheus:
    monitor:
      relabelings:
      - action: replace
        sourceLabels: [__meta_kubernetes_pod_node_name]
        targetLabel: nodename

# Kube State Metrics
kube-state-metrics:
  enabled: true
EOF
```

Install the stack:

```bash
# Create monitoring namespace
kubectl create namespace monitoring

# Install kube-prometheus-stack
helm install kube-prometheus-stack prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --values kube-prometheus-stack-values.yaml
```

#### Step 3: Install KubeCent Monitoring Dashboards

```bash
# Clone the KubeCent monitoring dashboard repository
git clone https://github.com/voidVisual/KubeCent-Monitoring-dashboard.git
cd KubeCent-Monitoring-dashboard

# Deploy dashboards as ConfigMaps
kubectl apply -k . -n monitoring
```

#### Step 4: Verify Installation

```bash
# Check if all pods are running
kubectl get pods -n monitoring

# Get Grafana service details
kubectl get svc -n monitoring kube-prometheus-stack-grafana
```

### Method 2: Using KubeCent Helm Chart (Integrated)

The KubeCent Helm chart now includes Grafana monitoring integration:

```bash
cd helm/kubecent

# Install with monitoring enabled
helm install kubecent . \
  --namespace kubecent \
  --create-namespace \
  --set monitoring.enabled=true \
  --set monitoring.grafana.adminPassword=admin123
```

### Method 3: Using ArgoCD

For GitOps deployments:

```bash
# Clone the monitoring dashboard repository
git clone https://github.com/voidVisual/KubeCent-Monitoring-dashboard.git
cd KubeCent-Monitoring-dashboard

# Apply ArgoCD application
kubectl apply -f argocd-app.yml
```

## Accessing Grafana

### Port Forward (Development)

```bash
kubectl port-forward -n monitoring svc/kube-prometheus-stack-grafana 3000:80
```

Access Grafana at: http://localhost:3000
- Username: `admin`
- Password: `admin` (or your custom password)

### LoadBalancer (Production)

Get the external IP:

```bash
kubectl get svc -n monitoring kube-prometheus-stack-grafana
```

Access Grafana at: http://<EXTERNAL-IP>

## Available Dashboards

The KubeCent monitoring setup includes the following dashboards:

1. **Cluster Overview**
   - Overall cluster health metrics
   - Resource utilization summary
   - Node status and availability
   - Pod distribution

2. **Pod Metrics**
   - CPU usage per pod
   - Memory consumption
   - Network I/O statistics
   - Restart counts and health

3. **Cost Analysis**
   - Resource cost breakdown
   - Spending trends over time
   - Cost per namespace/workload
   - Optimization opportunities

4. **Node Performance**
   - Node-level CPU/memory usage
   - Disk I/O performance
   - Network throughput
   - System load averages

## Connecting KubeCent to Grafana

### Backend Configuration

Update your backend configuration to connect to Grafana:

1. Edit `backend/app/core/config.py` or set environment variables:

```bash
export GRAFANA_URL="http://kube-prometheus-stack-grafana.monitoring.svc.cluster.local"
export GRAFANA_API_KEY="your-api-key-here"  # Optional for API access
```

2. The backend will automatically check Grafana connectivity and expose the status via the health endpoint.

### Frontend Integration

The KubeCent frontend automatically:
- Displays Grafana connection status in the Monitor page
- Provides direct links to Grafana dashboards
- Shows setup instructions if Grafana is not connected

## Creating Grafana API Key (Optional)

For programmatic access to Grafana:

1. Log in to Grafana
2. Go to **Configuration** → **API Keys**
3. Click **New API Key**
4. Set name: "KubeCent Backend"
5. Set role: "Viewer" or "Editor"
6. Copy the generated key and add it to your backend configuration

## Troubleshooting

### Grafana Pod Not Starting

```bash
# Check pod status
kubectl describe pod -n monitoring <grafana-pod-name>

# Check logs
kubectl logs -n monitoring <grafana-pod-name>
```

### Dashboards Not Loading

Ensure the dashboard sidecar is enabled:

```bash
kubectl get configmap -n monitoring | grep grafana-dashboard
```

### Prometheus Not Scraping Metrics

Check ServiceMonitor configuration:

```bash
kubectl get servicemonitor -n monitoring
```

### Connection Issues from KubeCent

Verify network connectivity:

```bash
# From KubeCent backend pod
kubectl exec -it -n kubecent <backend-pod> -- curl http://kube-prometheus-stack-grafana.monitoring.svc.cluster.local
```

## Customization

### Adding Custom Dashboards

1. Create a ConfigMap with your dashboard JSON:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: custom-dashboard
  namespace: monitoring
  labels:
    grafana_dashboard: "1"
data:
  custom-dashboard.json: |
    {
      "dashboard": { ... }
    }
```

2. Apply the ConfigMap:

```bash
kubectl apply -f custom-dashboard.yaml
```

### Modifying Alert Rules

Edit the Prometheus rules:

```bash
kubectl edit prometheusrule -n monitoring
```

## Security Best Practices

1. **Change Default Passwords**: Always change the default Grafana admin password
2. **Use API Keys**: Create API keys with minimal permissions
3. **Enable Authentication**: Configure OAuth or LDAP for user management
4. **Network Policies**: Restrict access to monitoring namespace
5. **TLS/SSL**: Enable HTTPS for Grafana access

## Monitoring Stack Maintenance

### Backup Grafana Dashboards

```bash
# Export all dashboards
kubectl get configmap -n monitoring -l grafana_dashboard=1 -o yaml > grafana-dashboards-backup.yaml
```

### Update Monitoring Stack

```bash
# Update Helm repository
helm repo update

# Upgrade installation
helm upgrade kube-prometheus-stack prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --values kube-prometheus-stack-values.yaml
```

### Clean Up

```bash
# Uninstall kube-prometheus-stack
helm uninstall kube-prometheus-stack -n monitoring

# Remove dashboards
kubectl delete -k . -n monitoring

# Delete namespace
kubectl delete namespace monitoring
```

## Performance Tuning

### Prometheus Retention

Adjust retention period based on your needs:

```yaml
prometheus:
  prometheusSpec:
    retention: 30d  # Adjust as needed
```

### Grafana Performance

For large clusters, optimize Grafana queries:

```yaml
grafana:
  grafana.ini:
    dataproxy:
      timeout: 300
      keep_alive_seconds: 300
```

## Integration with OpenCost

KubeCent integrates Grafana with OpenCost for cost metrics:

```bash
# Ensure OpenCost is deployed
kubectl get deployment -n opencost opencost

# Verify Prometheus is scraping OpenCost
kubectl get servicemonitor -n opencost
```

## Support and Resources

- [KubeCent Documentation](./README.md)
- [Grafana Documentation](https://grafana.com/docs/)
- [Prometheus Documentation](https://prometheus.io/docs/)
- [kube-prometheus-stack Chart](https://github.com/prometheus-community/helm-charts/tree/main/charts/kube-prometheus-stack)
- [KubeCent Monitoring Dashboards](https://github.com/voidVisual/KubeCent-Monitoring-dashboard)

## Next Steps

1. ✅ Install Grafana and Prometheus
2. ✅ Deploy KubeCent monitoring dashboards
3. ✅ Configure KubeCent backend to connect to Grafana
4. 📊 Access dashboards via KubeCent Monitor page
5. 🔧 Customize dashboards for your needs
6. 🚀 Set up alerts and notifications

---

For additional help, refer to the [QUICKSTART.md](./QUICKSTART.md) or open an issue on GitHub.
