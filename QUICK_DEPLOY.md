# ⚡ Quick Deploy to AWS EKS - KubeCent

**Get KubeCent running on your AWS EKS cluster in 15 minutes!**

---

## 🎯 One-Command Deployment

### For Linux/Mac:
```bash
cd /path/to/kubecent
chmod +x scripts/deploy-to-eks.sh
./scripts/deploy-to-eks.sh
```

### For Windows (PowerShell):
```powershell
cd C:\path\to\kubecent
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\scripts\deploy-to-eks.ps1
```

**That's it!** The script will:
1. ✅ Validate prerequisites
2. ✅ Connect to your EKS cluster
3. ✅ Install Prometheus & OpenCost
4. ✅ Build & push Docker images to ECR
5. ✅ Deploy KubeCent
6. ✅ Provide access URL

---

## 📋 What You Need Before Starting

- [ ] AWS EKS cluster running
- [ ] AWS CLI configured (`aws configure`)
- [ ] kubectl installed
- [ ] Helm 3+ installed
- [ ] Docker installed

**Test your setup:**
```bash
aws sts get-caller-identity  # Should show your AWS account
kubectl get nodes            # Should show your EKS nodes
helm version                 # Should show v3.x
docker --version             # Should show version
```

---

## 🚀 Manual Step-by-Step (If Needed)

### 1. Connect to EKS
```bash
export AWS_REGION=us-east-1  # Change to your region
export CLUSTER_NAME=my-eks-cluster  # Change to your cluster name
export AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

aws eks update-kubeconfig --name $CLUSTER_NAME --region $AWS_REGION
kubectl get nodes
```

### 2. Install Prerequisites
```bash
# Install Prometheus
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm install prometheus prometheus-community/prometheus \
  --namespace monitoring \
  --create-namespace \
  --wait

# Install OpenCost
helm repo add opencost https://opencost.github.io/opencost-helm-chart
helm install opencost opencost/opencost \
  --namespace opencost \
  --create-namespace \
  --set opencost.exporter.defaultClusterId=$CLUSTER_NAME \
  --set opencost.prometheus.external.url=http://prometheus-server.monitoring.svc.cluster.local:9090 \
  --wait
```

### 3. Build & Push Images

**Option A: Use Pre-built Images from Docker Hub (Recommended)**

Images are already available on Docker Hub:
- `voidvisual/kubecent-backend:v1.0.0`
- `voidvisual/kubecent-frontend:v1.0.0`

No build needed - skip to Step 4!

**Option B: Build Your Own Images**

```bash
# Create ECR repos
aws ecr create-repository --repository-name kubecent-backend --region $AWS_REGION
aws ecr create-repository --repository-name kubecent-frontend --region $AWS_REGION

# Login to ECR
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com

# Build and push
docker build -f docker/Dockerfile.backend -t $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/kubecent-backend:v1.0.0 .
docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/kubecent-backend:v1.0.0

docker build -f docker/Dockerfile.frontend -t $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/kubecent-frontend:v1.0.0 .
docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/kubecent-frontend:v1.0.0
```

### 4. Deploy KubeCent

**Option A: Using Docker Hub Images (Easiest)**
```bash
helm install kubecent ./helm/kubecent \
  --namespace kubecent \
  --create-namespace \
  --set image.backend.repository=voidvisual/kubecent-backend \
  --set image.backend.tag=v1.0.0 \
  --set image.frontend.repository=voidvisual/kubecent-frontend \
  --set image.frontend.tag=v1.0.0 \
  --set opencost.url=http://opencost.opencost.svc.cluster.local:9003 \
  --set prometheus.url=http://prometheus-server.monitoring.svc.cluster.local:9090 \
  --set service.type=LoadBalancer \
  --wait
```

**Option B: Using Your Own ECR Images**
```bash
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
```

### 5. Get Access URL
```bash
# Wait for LoadBalancer (2-3 minutes)
kubectl -n kubecent get svc kubecent-frontend -w

# Get URL
export URL=$(kubectl -n kubecent get svc kubecent-frontend -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')
echo "Access KubeCent at: http://$URL"
```

---

## ✅ Verify Deployment

Run the verification script:
```bash
chmod +x scripts/verify-deployment.sh
./scripts/verify-deployment.sh
```

Or manually:
```bash
# Check health
curl http://$URL/health

# Test API
curl http://$URL/api/v1/costs/cluster

# Open in browser
echo "Dashboard: http://$URL"
echo "API Docs: http://$URL/api/docs"
```

---

## 🎯 Access Your Application

Once deployed, access KubeCent just like Jenkins:

```
🌐 Dashboard:  http://<LoadBalancer-URL>
📚 API Docs:   http://<LoadBalancer-URL>/api/docs
❤️  Health:     http://<LoadBalancer-URL>/health
```

Example: `http://a1234567890abc.us-east-1.elb.amazonaws.com`

---

## 🔧 Common Issues & Fixes

### Issue: LoadBalancer stays "Pending"
**Fix:** Use NodePort instead
```bash
kubectl patch svc kubecent-frontend -n kubecent -p '{"spec":{"type":"NodePort"}}'
NODE_PORT=$(kubectl -n kubecent get svc kubecent-frontend -o jsonpath='{.spec.ports[0].nodePort}')
echo "Access at: http://<any-node-ip>:$NODE_PORT"
```

### Issue: No cost data showing
**Fix:** Wait 5-10 minutes for OpenCost to collect initial data
```bash
# Check OpenCost is working
kubectl -n opencost logs -l app.kubernetes.io/name=opencost -f
```

### Issue: Pods not starting
**Fix:** Check image pull errors
```bash
kubectl -n kubecent describe pod <pod-name>
# Often means ECR images weren't pushed correctly
```

### Issue: API returns errors
**Fix:** Check backend logs
```bash
kubectl -n kubecent logs -l component=backend -f
```

---

## 📖 Full Documentation

- **[Complete AWS EKS Guide](./AWS_EKS_DEPLOYMENT.md)** - Detailed step-by-step
- **[Deployment Guide](./DEPLOYMENT.md)** - General Kubernetes deployment
- **[Troubleshooting](./AWS_EKS_DEPLOYMENT.md#troubleshooting)** - Common issues

---

## 🗑️ Uninstall

```bash
helm uninstall kubecent --namespace kubecent
kubectl delete namespace kubecent
```

---

**Questions?** Check the [AWS EKS Deployment Guide](./AWS_EKS_DEPLOYMENT.md) for detailed troubleshooting.
