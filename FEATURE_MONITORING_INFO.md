# Monitoring Feature Branch

This branch contains all monitoring and observability configurations for Kubecent - Kubernetes cost optimization and monitoring platform.

## Contents
- Grafana dashboard configurations
- Prometheus monitoring setup
- OpenCost integration
- Helm charts for deployment
- Kubernetes manifests
- Docker configurations

## Key Files
- `grafana-dashboards/` - Pre-configured Grafana dashboards
  - `cluster-overview.json` - Cluster metrics overview
  - `cost-analysis.json` - Cost analysis dashboard
  - `node-performance.json` - Node performance metrics
  - `pod-metrics.json` - Pod-level metrics
- `helm/kubecent/` - Helm chart for Kubernetes deployment
- `opencost-values.yaml` - OpenCost configuration
- `docker/prometheus.yml` - Prometheus configuration
- `k8s-deployment.yaml` - Kubernetes deployment manifest

## Monitoring Stack
- **OpenCost**: Kubernetes cost monitoring
- **Grafana**: Metrics visualization
- **Prometheus**: Metrics collection (optional)

## Deployment
```bash
# Deploy with Helm
helm install kubecent ./helm/kubecent

# Or use kubectl
kubectl apply -f k8s-deployment.yaml
```

## Grafana Dashboards
Import the dashboards from `grafana-dashboards/` directory into your Grafana instance.
