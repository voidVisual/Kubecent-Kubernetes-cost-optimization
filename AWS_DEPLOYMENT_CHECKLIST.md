# ✅ AWS EKS Deployment Checklist

Use this checklist to ensure successful deployment of KubeCent to AWS EKS.

---

## 📋 Pre-Deployment Checklist

### Prerequisites Installed
- [ ] AWS CLI installed (`aws --version`)
- [ ] AWS credentials configured (`aws sts get-caller-identity`)
- [ ] kubectl installed (`kubectl version --client`)
- [ ] Helm 3+ installed (`helm version`)
- [ ] Docker installed and running (`docker --version`)

### AWS EKS Cluster
- [ ] EKS cluster is running
- [ ] You have cluster name and region
- [ ] kubectl can connect to cluster (`kubectl get nodes`)
- [ ] You have admin access to the cluster

### Required Information
- [ ] AWS Account ID: ________________
- [ ] AWS Region: ________________
- [ ] EKS Cluster Name: ________________

---

## 🚀 Deployment Steps

### 1. Connect to EKS Cluster
```bash
aws eks update-kubeconfig --name YOUR_CLUSTER_NAME --region YOUR_REGION
kubectl get nodes
```
- [ ] Successfully connected to EKS
- [ ] Can see cluster nodes

### 2. Install Prerequisites
```bash
# Install Prometheus
helm install prometheus prometheus-community/prometheus \
  --namespace monitoring --create-namespace --wait
```
- [ ] Prometheus installed
- [ ] Prometheus pods running (`kubectl -n monitoring get pods`)

```bash
# Install OpenCost
helm install opencost opencost/opencost \
  --namespace opencost --create-namespace --wait
```
- [ ] OpenCost installed
- [ ] OpenCost pod running (`kubectl -n opencost get pods`)

### 3. Build and Push Docker Images
```bash
# Create ECR repositories
aws ecr create-repository --repository-name kubecent-backend
aws ecr create-repository --repository-name kubecent-frontend
```
- [ ] ECR repositories created
- [ ] Logged into ECR

```bash
# Build images
docker build -f docker/Dockerfile.backend -t YOUR_ACCOUNT.dkr.ecr.YOUR_REGION.amazonaws.com/kubecent-backend:v1.0.0 .
docker build -f docker/Dockerfile.frontend -t YOUR_ACCOUNT.dkr.ecr.YOUR_REGION.amazonaws.com/kubecent-frontend:v1.0.0 .
```
- [ ] Backend image built successfully
- [ ] Frontend image built successfully

```bash
# Push images
docker push YOUR_ACCOUNT.dkr.ecr.YOUR_REGION.amazonaws.com/kubecent-backend:v1.0.0
docker push YOUR_ACCOUNT.dkr.ecr.YOUR_REGION.amazonaws.com/kubecent-frontend:v1.0.0
```
- [ ] Backend image pushed to ECR
- [ ] Frontend image pushed to ECR

### 4. Deploy KubeCent
```bash
helm install kubecent ./helm/kubecent \
  --namespace kubecent --create-namespace \
  --set image.backend.repository=YOUR_ACCOUNT.dkr.ecr.YOUR_REGION.amazonaws.com/kubecent-backend \
  --set image.backend.tag=v1.0.0 \
  --set image.frontend.repository=YOUR_ACCOUNT.dkr.ecr.YOUR_REGION.amazonaws.com/kubecent-frontend \
  --set image.frontend.tag=v1.0.0 \
  --set service.type=LoadBalancer \
  --wait
```
- [ ] Helm install completed without errors
- [ ] KubeCent namespace created

### 5. Verify Deployment
```bash
kubectl -n kubecent get pods
```
- [ ] Backend pods are Running (2/2)
- [ ] Frontend pods are Running (1/1)
- [ ] No pods in Error or CrashLoopBackOff state

```bash
kubectl -n kubecent get svc
```
- [ ] kubecent-backend service exists
- [ ] kubecent-frontend service exists
- [ ] LoadBalancer has EXTERNAL-IP assigned (may take 2-3 minutes)

---

## ✅ Post-Deployment Verification

### Access Application
```bash
export URL=$(kubectl -n kubecent get svc kubecent-frontend -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')
echo $URL
```
Your KubeCent URL: ________________________________

- [ ] Can open dashboard in browser: `http://<URL>`
- [ ] Dashboard loads without errors
- [ ] Can see UI elements (header, sidebar, cards)

### Test API Endpoints
```bash
# Health check
curl http://<URL>/health
```
- [ ] Health check returns status "healthy" (HTTP 200)

```bash
# Cluster costs
curl http://<URL>/api/v1/costs/cluster
```
- [ ] Returns cost data (HTTP 200)
- [ ] Shows total_cost value

```bash
# Namespace costs
curl http://<URL>/api/v1/costs/namespaces
```
- [ ] Returns list of namespaces (HTTP 200)
- [ ] Shows at least monitoring, opencost, kubecent namespaces

```bash
# Optimization report
curl http://<URL>/api/v1/optimizations/report
```
- [ ] Returns optimization recommendations (HTTP 200)

```bash
# API Documentation
curl http://<URL>/api/docs
```
- [ ] Swagger UI loads (HTTP 200)
- [ ] Can see API endpoints listed

### Check Logs
```bash
kubectl -n kubecent logs -l component=backend --tail=50
```
- [ ] No ERROR level messages in recent logs
- [ ] Backend successfully connects to OpenCost
- [ ] Backend successfully connects to Prometheus

```bash
kubectl -n kubecent logs -l component=frontend --tail=50
```
- [ ] No error messages in nginx logs
- [ ] HTTP requests returning 200 status

### Verify Data Collection
Wait 5-10 minutes after deployment, then:
- [ ] Dashboard shows cost data (not all zeros)
- [ ] Namespace table populated with actual data
- [ ] Optimization recommendations appear
- [ ] Charts display cost trends

---

## 🔍 Troubleshooting Checklist

### If LoadBalancer URL Not Available
- [ ] Waited at least 3 minutes for AWS to provision
- [ ] Check AWS console for ELB creation
- [ ] Try NodePort as alternative (`kubectl patch svc kubecent-frontend -n kubecent -p '{"spec":{"type":"NodePort"}}'`)

### If Pods Not Running
- [ ] Check pod status: `kubectl -n kubecent describe pod <pod-name>`
- [ ] Check for image pull errors
- [ ] Verify ECR images exist: `aws ecr describe-images --repository-name kubecent-backend`
- [ ] Check resource constraints: `kubectl top nodes`

### If API Returns Errors
- [ ] Verify OpenCost is accessible: `kubectl -n opencost get pods`
- [ ] Verify Prometheus is accessible: `kubectl -n monitoring get pods`
- [ ] Check backend logs: `kubectl -n kubecent logs -l component=backend -f`
- [ ] Test connectivity: `kubectl run test --rm -it --image=curlimages/curl -- curl http://opencost.opencost.svc.cluster.local:9003/healthz`

### If No Cost Data
- [ ] Wait 10 minutes for OpenCost to collect initial data
- [ ] Check OpenCost logs: `kubectl -n opencost logs -l app.kubernetes.io/name=opencost -f`
- [ ] Verify Prometheus has metrics: `kubectl -n monitoring port-forward svc/prometheus-server 9090:80` then visit http://localhost:9090

---

## 📊 Success Criteria

Your deployment is successful when:

✅ All pods are Running (2/2 or 1/1)  
✅ LoadBalancer URL is accessible  
✅ Dashboard loads in browser  
✅ Health endpoint returns {"status":"healthy"}  
✅ API endpoints return actual data (not errors)  
✅ Swagger UI accessible at /api/docs  
✅ Cost data appears within 10 minutes  
✅ No ERROR messages in backend logs  

---

## 📞 Quick Commands Reference

```bash
# Get dashboard URL
kubectl -n kubecent get svc kubecent-frontend

# Check pod status
kubectl -n kubecent get pods

# View backend logs
kubectl -n kubecent logs -l component=backend -f

# View frontend logs
kubectl -n kubecent logs -l component=frontend -f

# Check health
curl http://$(kubectl -n kubecent get svc kubecent-frontend -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')/health

# Port forward (if LoadBalancer unavailable)
kubectl -n kubecent port-forward svc/kubecent-frontend 8080:80

# Restart deployment
kubectl -n kubecent rollout restart deployment/kubecent-backend
kubectl -n kubecent rollout restart deployment/kubecent-frontend

# Uninstall
helm uninstall kubecent --namespace kubecent
kubectl delete namespace kubecent
```

---

## 🎯 Next Steps

After successful deployment:

1. **Bookmark your dashboard URL** for easy access
2. **Set up custom domain** (optional) - see [AWS_EKS_DEPLOYMENT.md](./AWS_EKS_DEPLOYMENT.md#custom-domain-optional)
3. **Enable HTTPS** with ACM certificate (optional)
4. **Configure alerts** for cost thresholds
5. **Share access** with your team
6. **Monitor regularly** for optimization opportunities

---

**Congratulations!** Your KubeCent dashboard is now running on AWS EKS! 🎉

Access it like any other application (Jenkins, Grafana, etc.) via your LoadBalancer URL.
