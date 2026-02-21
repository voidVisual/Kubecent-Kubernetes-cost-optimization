# Grafana Monitoring - Quick Reference

## Quick Setup Commands

### Install Monitoring Stack
```bash
# Add Helm repo
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

# Install kube-prometheus-stack
helm install kube-prometheus-stack prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --create-namespace

# Install KubeCent dashboards
git clone https://github.com/voidVisual/KubeCent-Monitoring-dashboard.git
cd KubeCent-Monitoring-dashboard
kubectl apply -k . -n monitoring
```

### Access Grafana
```bash
# Port forward
kubectl port-forward -n monitoring svc/kube-prometheus-stack-grafana 3000:80

# Default credentials
# Username: admin
# Password: prom-operator
```

### Configure KubeCent Backend
```bash
# Set environment variable
export GRAFANA_URL="http://kube-prometheus-stack-grafana.monitoring.svc.cluster.local"

# Or update Helm values
helm upgrade kubecent ./helm/kubecent \
  --set backend.env.GRAFANA_URL="http://kube-prometheus-stack-grafana.monitoring.svc.cluster.local"
```

## Dashboard URLs

Once Grafana is running, access these dashboards:

- **Cluster Overview**: `http://localhost:3000/d/cluster-overview`
- **Pod Metrics**: `http://localhost:3000/d/pod-metrics`
- **Cost Analysis**: `http://localhost:3000/d/cost-analysis`
- **Node Performance**: `http://localhost:3000/d/node-performance`

## API Endpoints

Test Grafana integration:

```bash
# Check health
curl http://localhost:8000/api/v1/grafana/health

# Get dashboards
curl http://localhost:8000/api/v1/grafana/dashboards

# Get links
curl http://localhost:8000/api/v1/grafana/links
```

## Troubleshooting

### Grafana not connecting
```bash
# Check Grafana pod
kubectl get pods -n monitoring | grep grafana

# Check logs
kubectl logs -n monitoring deployment/kube-prometheus-stack-grafana

# Test connectivity from backend
kubectl exec -it -n kubecent deployment/kubecent-backend -- \
  curl http://kube-prometheus-stack-grafana.monitoring.svc.cluster.local/api/health
```

### Dashboards not loading
```bash
# Check ConfigMaps
kubectl get configmap -n monitoring | grep dashboard

# Check sidecar logs
kubectl logs -n monitoring deployment/kube-prometheus-stack-grafana -c grafana-sc-dashboard
```

## Files Reference

### Documentation
- [GRAFANA_SETUP.md](./GRAFANA_SETUP.md) - Complete setup guide
- [GRAFANA_MONITORING_INTEGRATION.md](./GRAFANA_MONITORING_INTEGRATION.md) - Implementation details

### Helm Charts
- `helm/kubecent/values-monitoring.yaml` - Monitoring configuration
- `helm/kubecent/templates/grafana-*.yaml` - Grafana templates

### Backend
- `backend/app/clients/grafana.py` - Grafana client
- `backend/app/api/v1/endpoints/grafana.py` - API endpoints
- `backend/app/core/config.py` - Configuration

### Frontend
- `frontend/src/pages/Monitor.tsx` - Monitoring page with Grafana integration

## External Resources

- **KubeCent Dashboards**: https://github.com/voidVisual/KubeCent-Monitoring-dashboard
- **Grafana Docs**: https://grafana.com/docs/
- **kube-prometheus-stack**: https://github.com/prometheus-community/helm-charts

---

For detailed instructions, see [GRAFANA_SETUP.md](./GRAFANA_SETUP.md)
