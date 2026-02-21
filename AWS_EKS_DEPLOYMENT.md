# 🚀 AWS EKS Deployment Guide - KubeCent

**Complete Step-by-Step Guide to Deploy KubeCent on AWS EKS**

Access your application at: `http://<LoadBalancer-URL>:80` (like Jenkins!)

---

## 📋 Prerequisites Checklist

Before starting, ensure you have:

- [ ] AWS Account with EKS cluster running
- [ ] AWS CLI installed and configured (`aws configure`)
- [ ] kubectl installed
- [ ] Helm 3+ installed
- [ ] Docker installed (for building images)
- [ ] Your EKS cluster name and region

### Verify Prerequisites

```bash
# Check AWS CLI
aws --version

# Check kubectl
kubectl version --client

# Check Helm
helm version

# Check Docker
docker --version
```

---

## 🎯 Quick Start (30 Minutes)

### Step 1: Connect to Your EKS Cluster

```bash
# Replace with your actual cluster name and region
export AWS_REGION=us-east-1
export CLUSTER_NAME=your-eks-cluster
export AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# Update kubeconfig
aws eks update-kubeconfig --name $CLUSTER_NAME --region $AWS_REGION

# Verify connection
kubectl get nodes
```

**Expected output:** List of your EKS nodes

---

### Step 2: Install Prerequisites (OpenCost & Prometheus)

KubeCent needs OpenCost and Prometheus to collect cost data from **your cluster**.

#### Install Prometheus (Collects Metrics)

```bash
# Add Helm repo
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

# Install Prometheus
helm install prometheus prometheus-community/prometheus \
  --namespace monitoring \
  --create-namespace \
  --set server.persistentVolume.enabled=false \
  --set alertmanager.persistentVolume.enabled=false \
  --wait

# Verify installation
kubectl -n monitoring get pods
```

**Wait until all pods are Running (1-2 minutes)**

#### Install OpenCost (Collects Cost Data)

```bash
# Add Helm repo
helm repo add opencost https://opencost.github.io/opencost-helm-chart
helm repo update

# Install OpenCost
helm install opencost opencost/opencost \
  --namespace opencost \
  --create-namespace \
  --set opencost.exporter.defaultClusterId=$CLUSTER_NAME \
  --set opencost.prometheus.external.url=http://prometheus-server.monitoring.svc.cluster.local:9090 \
  --wait

# Verify installation
kubectl -n opencost get pods
```

**Wait until OpenCost pod is Running (1-2 minutes)**

#### Verify Prerequisites are Working

```bash
# Test Prometheus
kubectl -n monitoring port-forward svc/prometheus-server 9090:80 &
curl http://localhost:9090/api/v1/status/config
killall kubectl

# Test OpenCost
kubectl -n opencost port-forward svc/opencost 9003:9003 &
curl http://localhost:9003/allocation/compute
killall kubectl
```

---

### Step 3: Build and Push Docker Images to ECR

We'll create Docker images and push them to AWS ECR (Elastic Container Registry).

#### Create ECR Repositories

```bash
# Create repositories
aws ecr create-repository --repository-name kubecent-backend --region $AWS_REGION || echo "Repository already exists"
aws ecr create-repository --repository-name kubecent-frontend --region $AWS_REGION || echo "Repository already exists"

# Login to ECR
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com
```

#### Build and Push Images

```bash
cd /path/to/kubecent  # Navigate to your project directory

# Build Backend
docker build -f docker/Dockerfile.backend \
  -t $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/kubecent-backend:v1.0.0 \
  -t $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/kubecent-backend:latest \
  .

# Push Backend
docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/kubecent-backend:v1.0.0
docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/kubecent-backend:latest

# Build Frontend
docker build -f docker/Dockerfile.frontend \
  -t $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/kubecent-frontend:v1.0.0 \
  -t $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/kubecent-frontend:latest \
  .

# Push Frontend
docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/kubecent-frontend:v1.0.0
docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/kubecent-frontend:latest

echo "✅ Images pushed successfully!"
```

---

### Step 4: Deploy KubeCent to EKS

#### Deploy with Helm

```bash
# Deploy KubeCent
helm install kubecent ./helm/kubecent \
  --namespace kubecent \
  --create-namespace \
  --set image.backend.repository=$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/kubecent-backend \
  --set image.backend.tag=v1.0.0 \
  --set image.frontend.repository=$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/kubecent-frontend \
  --set image.frontend.tag=v1.0.0 \
  --set opencost.url=http://opencost.opencost.svc.cluster.local:9003 \
  --set prometheus.url=http://prometheus-server.monitoring.svc.cluster.local:9090 \
  --set service.type=LoadBalancer \
  --wait

echo "✅ KubeCent deployed successfully!"
```

#### Wait for Deployment (2-3 minutes)

```bash
# Watch pods starting
kubectl -n kubecent get pods -w
```

**Press Ctrl+C when all pods show Running (2/2)**

---

### Step 5: Access Your Application 🎉

#### Get LoadBalancer URL

```bash
# Get the LoadBalancer URL (wait 2-3 minutes for AWS to provision)
kubectl -n kubecent get svc kubecent-frontend

# Get just the URL
export KUBECENT_URL=$(kubectl -n kubecent get svc kubecent-frontend -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')
echo "🌐 Access KubeCent at: http://$KUBECENT_URL"
```

**Copy the URL and open in your browser!**

Example: `http://a1234567890.us-east-1.elb.amazonaws.com`

#### Alternative: Use NodePort (If LoadBalancer Pending)

```bash
# If LoadBalancer is pending, use NodePort instead
kubectl patch svc kubecent-frontend -n kubecent -p '{"spec":{"type":"NodePort"}}'

# Get NodePort
export NODE_PORT=$(kubectl -n kubecent get svc kubecent-frontend -o jsonpath='{.spec.ports[0].nodePort}')
export NODE_IP=$(kubectl get nodes -o jsonpath='{.items[0].status.addresses[?(@.type=="ExternalIP")].address}')

echo "🌐 Access KubeCent at: http://$NODE_IP:$NODE_PORT"
```

---

### Step 6: Verify Everything Works ✅

#### Health Check

```bash
# Check backend health
curl http://$KUBECENT_URL/health

# Expected output: {"status":"healthy"}
```

#### Test API Endpoints

```bash
# Test cluster costs
curl http://$KUBECENT_URL/api/v1/costs/cluster

# Test namespace costs
curl http://$KUBECENT_URL/api/v1/costs/namespaces

# Test optimization report
curl http://$KUBECENT_URL/api/v1/optimizations/report
```

#### Access Swagger UI

Open in browser:
```
http://$KUBECENT_URL/api/docs
```

You'll see interactive API documentation!

---

## 🔧 Configuration Options

### Custom Domain (Optional)

To use a custom domain like `kubecent.mycompany.com`:

1. **Create Route53 Record**:
```bash
# Get LoadBalancer DNS
LB_DNS=$(kubectl -n kubecent get svc kubecent-frontend -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')

# Create A record in Route53 pointing to LoadBalancer
# Or use CNAME: kubecent.mycompany.com -> $LB_DNS
```

2. **Enable HTTPS (Recommended)**:
```bash
# Install cert-manager
helm repo add jetstack https://charts.jetstack.io
helm install cert-manager jetstack/cert-manager \
  --namespace cert-manager \
  --create-namespace \
  --set installCRDs=true

# Update deployment with ingress
helm upgrade kubecent ./helm/kubecent \
  --namespace kubecent \
  --reuse-values \
  --set ingress.enabled=true \
  --set ingress.hosts[0].host=kubecent.mycompany.com
```

### Scaling Configuration

```bash
# Enable autoscaling
helm upgrade kubecent ./helm/kubecent \
  --namespace kubecent \
  --reuse-values \
  --set autoscaling.enabled=true \
  --set autoscaling.minReplicas=2 \
  --set autoscaling.maxReplicas=10 \
  --set autoscaling.targetCPUUtilizationPercentage=70
```

### Resource Limits

```bash
# Adjust resources for production
helm upgrade kubecent ./helm/kubecent \
  --namespace kubecent \
  --reuse-values \
  --set resources.requests.cpu=500m \
  --set resources.requests.memory=512Mi \
  --set resources.limits.cpu=2000m \
  --set resources.limits.memory=2Gi
```

---

## 🔍 Troubleshooting

### Pods Not Starting

```bash
# Check pod status
kubectl -n kubecent get pods

# View pod logs
kubectl -n kubecent logs -l app=kubecent --all-containers=true

# Describe pod for events
kubectl -n kubecent describe pod <pod-name>
```

### Cannot Pull Images

```bash
# Verify ECR permissions
aws ecr get-login-password --region $AWS_REGION

# Check if images exist
aws ecr describe-images --repository-name kubecent-backend --region $AWS_REGION
aws ecr describe-images --repository-name kubecent-frontend --region $AWS_REGION

# Add image pull secret if needed (usually not needed with EKS + ECR in same account)
```

### LoadBalancer Stuck in Pending

```bash
# Check service
kubectl -n kubecent describe svc kubecent-frontend

# Common issues:
# 1. No available subnets (check EKS subnet tags)
# 2. Security group issues
# 3. AWS quota limits

# Workaround: Use NodePort
kubectl patch svc kubecent-frontend -n kubecent -p '{"spec":{"type":"NodePort"}}'
```

### API Returns Errors

```bash
# Check backend logs
kubectl -n kubecent logs -l component=backend -f

# Verify OpenCost is accessible from kubecent namespace
kubectl run test --rm -it --image=curlimages/curl -- \
  curl http://opencost.opencost.svc.cluster.local:9003/allocation/compute

# Verify Prometheus is accessible
kubectl run test --rm -it --image=curlimages/curl -- \
  curl http://prometheus-server.monitoring.svc.cluster.local:9090/api/v1/status/config
```

### No Cost Data Showing

```bash
# Wait 5-10 minutes for OpenCost to collect initial data
# Check OpenCost logs
kubectl -n opencost logs -l app.kubernetes.io/name=opencost -f

# Verify Prometheus has metrics
kubectl -n monitoring port-forward svc/prometheus-server 9090:80
# Open http://localhost:9090 and search for "container_cpu_usage_seconds_total"
```

---

## 🗑️ Uninstall

```bash
# Remove KubeCent
helm uninstall kubecent --namespace kubecent
kubectl delete namespace kubecent

# Optionally remove prerequisites
helm uninstall opencost --namespace opencost
helm uninstall prometheus --namespace monitoring
kubectl delete namespace opencost monitoring
```

---

## 📊 Monitoring & Maintenance

### View Logs

```bash
# Backend logs
kubectl -n kubecent logs -l component=backend -f

# Frontend logs
kubectl -n kubecent logs -l component=frontend -f

# All logs
kubectl -n kubecent logs -l app=kubecent --all-containers=true -f
```

### Check Resource Usage

```bash
# Pod resource usage
kubectl top pods -n kubecent

# Node resource usage
kubectl top nodes
```

### Update Application

```bash
# Build new images with version tag
docker build -f docker/Dockerfile.backend -t $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/kubecent-backend:v1.1.0 .
docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/kubecent-backend:v1.1.0

# Update deployment
helm upgrade kubecent ./helm/kubecent \
  --namespace kubecent \
  --reuse-values \
  --set image.backend.tag=v1.1.0
```

---

## 🎓 What Gets Deployed

### Architecture in Your EKS Cluster

```
┌─────────────────────────────────────────────────────┐
│                    AWS EKS Cluster                  │
│                                                     │
│  ┌──────────────┐  ┌──────────────┐                │
│  │  Namespace:  │  │  Namespace:  │                │
│  │  monitoring  │  │   opencost   │                │
│  │              │  │              │                │
│  │ ┌──────────┐ │  │ ┌──────────┐ │                │
│  │ │Prometheus│ │  │ │ OpenCost │ │                │
│  │ │  :9090   │ │  │ │  :9003   │ │                │
│  │ └──────────┘ │  │ └──────────┘ │                │
│  └──────────────┘  └──────────────┘                │
│         ▲                  ▲                        │
│         │                  │                        │
│         │  ┌───────────────┘                        │
│         │  │                                        │
│  ┌──────┴──┴───────────────────────────┐           │
│  │      Namespace: kubecent             │           │
│  │                                      │           │
│  │  ┌────────────┐    ┌──────────────┐ │           │
│  │  │  Backend   │    │   Frontend   │ │           │
│  │  │  FastAPI   │◄───│  React + Nx  │ │           │
│  │  │   :8000    │    │    :80       │ │           │
│  │  └────────────┘    └──────────────┘ │           │
│  │                           │          │           │
│  └───────────────────────────┼──────────┘           │
│                              │                      │
│                    ┌─────────▼────────┐             │
│                    │  AWS LoadBalancer│             │
│                    │   (ELB/ALB)      │             │
│                    └─────────┬────────┘             │
└──────────────────────────────┼──────────────────────┘
                               │
                        ┌──────▼───────┐
                        │   Internet   │
                        │    Users     │
                        └──────────────┘
```

### Components:

1. **Backend (FastAPI)**: REST API serving cost data
2. **Frontend (React)**: Web dashboard UI
3. **OpenCost**: Collects cost data from your cluster
4. **Prometheus**: Collects resource metrics
5. **LoadBalancer**: AWS ELB exposing the application

All components run **inside your EKS cluster** - no external SaaS dependencies!

---

## 🎯 Success Criteria

After deployment, you should be able to:

✅ Access the dashboard at `http://<LoadBalancer-URL>`  
✅ See your namespaces and their costs  
✅ View pod-level cost breakdown  
✅ Get optimization recommendations  
✅ Access API docs at `http://<LoadBalancer-URL>/api/docs`  
✅ All data comes from **your actual cluster** (not mock data)  

---

## 🆘 Need Help?

### Quick Checks

```bash
# 1. Are all pods running?
kubectl -n kubecent get pods

# 2. Is LoadBalancer ready?
kubectl -n kubecent get svc

# 3. Are prerequisites working?
kubectl -n opencost get pods
kubectl -n monitoring get pods

# 4. View recent logs
kubectl -n kubecent logs -l app=kubecent --tail=50
```

### Common Issues

| Issue | Solution |
|-------|----------|
| LoadBalancer pending | Wait 2-3 min or use NodePort |
| No cost data | Wait 5-10 min for OpenCost to collect |
| Can't pull images | Check ECR login and image tags |
| 502 Bad Gateway | Backend not ready, check logs |
| API returns 500 | OpenCost/Prometheus not reachable |

---

## 📞 Support

- Check logs: `kubectl -n kubecent logs -l app=kubecent -f`
- API docs: `http://<your-url>/api/docs`
- Health check: `http://<your-url>/health`

**Your KubeCent dashboard is now running on AWS EKS!** 🎉
