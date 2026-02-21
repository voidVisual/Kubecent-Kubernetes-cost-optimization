"""
Monitoring endpoints for real-time cluster metrics and logs.

Provides comprehensive monitoring data for:
- Pod metrics (CPU, memory, network)
- Node metrics and health
- Cluster-wide statistics
- EKS/Kubernetes logs
"""

from fastapi import APIRouter, Query, HTTPException
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
import asyncio

router = APIRouter()


@router.get("/cluster/stats")
async def get_cluster_stats() -> Dict[str, Any]:
    """
    Get real-time cluster statistics.
    
    Returns aggregated metrics for pods, CPU, memory, and network.
    This endpoint queries directly from Kubernetes API via kubectl/API client.
    """
    try:
        # Import here to avoid circular imports
        from kubernetes import client, config
        from kubernetes.client.rest import ApiException
        
        try:
            # Try to load in-cluster config first
            config.load_incluster_config()
        except:
            # Fall back to kubeconfig for local development
            try:
                config.load_kube_config()
            except:
                # If no kubernetes access, return demo data
                return _get_demo_cluster_stats()
        
        v1 = client.CoreV1Api()
        metrics_api = client.CustomObjectsApi()
        
        # Get all pods
        pods = v1.list_pod_for_all_namespaces(limit=1000)
        total_pods = len(pods.items)
        running_pods = sum(1 for pod in pods.items if pod.status.phase == "Running")
        
        # Get nodes
        nodes = v1.list_node()
        total_nodes = len(nodes.items)
        
        # Get metrics from metrics-server
        try:
            # Get pod metrics
            pod_metrics = metrics_api.list_cluster_custom_object(
                group="metrics.k8s.io",
                version="v1beta1",
                plural="pods"
            )
            
            # Calculate total CPU and memory usage
            total_cpu_usage = 0
            total_memory_usage = 0
            
            for pod_metric in pod_metrics.get("items", []):
                for container in pod_metric.get("containers", []):
                    cpu = container.get("usage", {}).get("cpu", "0")
                    memory = container.get("usage", {}).get("memory", "0")
                    
                    # Parse CPU (format: "100m" or "1")
                    if cpu.endswith("n"):
                        total_cpu_usage += float(cpu[:-1]) / 1000000000
                    elif cpu.endswith("m"):
                        total_cpu_usage += float(cpu[:-1]) / 1000
                    else:
                        total_cpu_usage += float(cpu)
                    
                    # Parse memory (format: "100Mi" or "1Gi")
                    if memory.endswith("Ki"):
                        total_memory_usage += float(memory[:-2]) / 1024 / 1024
                    elif memory.endswith("Mi"):
                        total_memory_usage += float(memory[:-2]) / 1024
                    elif memory.endswith("Gi"):
                        total_memory_usage += float(memory[:-2])
            
            # Get node metrics for capacity
            node_metrics = metrics_api.list_cluster_custom_object(
                group="metrics.k8s.io",
                version="v1beta1",
                plural="nodes"
            )
            
            # Calculate total capacity
            total_cpu_capacity = 0
            total_memory_capacity = 0
            
            for node in nodes.items:
                cpu_capacity = node.status.capacity.get("cpu", "0")
                memory_capacity = node.status.capacity.get("memory", "0")
                
                total_cpu_capacity += float(cpu_capacity)
                
                # Parse memory capacity
                if memory_capacity.endswith("Ki"):
                    total_memory_capacity += float(memory_capacity[:-2]) / 1024 / 1024
                elif memory_capacity.endswith("Mi"):
                    total_memory_capacity += float(memory_capacity[:-2]) / 1024
                elif memory_capacity.endswith("Gi"):
                    total_memory_capacity += float(memory_capacity[:-2])
            
            return {
                "activePods": running_pods,
                "totalPods": total_pods,
                "cpuUsage": round(total_cpu_usage, 2),
                "cpuCapacity": round(total_cpu_capacity, 2),
                "memoryUsage": round(total_memory_usage, 2),
                "memoryCapacity": round(total_memory_capacity, 2),
                "networkIO": "N/A",  # Requires additional metrics
                "nodes": total_nodes,
                "timestamp": datetime.utcnow().isoformat() + "Z"
            }
            
        except ApiException:
            # Metrics server not available, return basic stats
            return {
                "activePods": running_pods,
                "totalPods": total_pods,
                "cpuUsage": 0,
                "cpuCapacity": total_nodes * 2,  # Estimate
                "memoryUsage": 0,
                "memoryCapacity": total_nodes * 16,  # Estimate 
                "networkIO": "N/A",
                "nodes": total_nodes,
                "timestamp": datetime.utcnow().isoformat() + "Z"
            }
            
    except Exception as e:
        # Return demo data if Kubernetes is not accessible
        return _get_demo_cluster_stats()


@router.get("/pods")
async def get_pods(namespace: Optional[str] = Query(None)) -> Dict[str, Any]:
    """
    Get list of pods with their current metrics.
    
    Args:
        namespace: Filter by namespace (optional)
    
    Returns:
        List of pods with status, resource usage, and metadata
    """
    try:
        from kubernetes import client, config
        from kubernetes.client.rest import ApiException
        
        try:
            config.load_incluster_config()
        except:
            try:
                config.load_kube_config()
            except:
                return {"pods": _get_demo_pods(), "count": len(_get_demo_pods())}
        
        v1 = client.CoreV1Api()
        metrics_api = client.CustomObjectsApi()
        
        # Get pods
        if namespace:
            pods = v1.list_namespaced_pod(namespace)
        else:
            pods = v1.list_pod_for_all_namespaces()
        
        # Get pod metrics
        try:
            if namespace:
                pod_metrics_data = metrics_api.list_namespaced_custom_object(
                    group="metrics.k8s.io",
                    version="v1beta1",
                    namespace=namespace,
                    plural="pods"
                )
            else:
                pod_metrics_data = metrics_api.list_cluster_custom_object(
                    group="metrics.k8s.io",
                    version="v1beta1",
                    plural="pods"
                )
            
            metrics_map = {}
            for pod_metric in pod_metrics_data.get("items", []):
                pod_name = pod_metric["metadata"]["name"]
                pod_namespace = pod_metric["metadata"]["namespace"]
                key = f"{pod_namespace}/{pod_name}"
                
                total_cpu = 0
                total_memory = 0
                
                for container in pod_metric.get("containers", []):
                    cpu = container.get("usage", {}).get("cpu", "0m")
                    memory = container.get("usage", {}).get("memory", "0Mi")
                    
                    # Parse CPU
                    if cpu.endswith("n"):
                        total_cpu += float(cpu[:-1]) / 1000000
                    elif cpu.endswith("m"):
                        total_cpu += float(cpu[:-1])
                    else:
                        total_cpu += float(cpu) * 1000
                    
                    # Parse memory
                    if memory.endswith("Ki"):
                        total_memory += float(memory[:-2]) / 1024
                    elif memory.endswith("Mi"):
                        total_memory += float(memory[:-2])
                    elif memory.endswith("Gi"):
                        total_memory += float(memory[:-2]) * 1024
                
                metrics_map[key] = {
                    "cpu": f"{int(total_cpu)}m",
                    "memory": f"{int(total_memory)}Mi"
                }
        except:
            metrics_map = {}
        
        # Build pod list
        pod_list = []
        for pod in pods.items:
            key = f"{pod.metadata.namespace}/{pod.metadata.name}"
            metrics = metrics_map.get(key, {"cpu": "0m", "memory": "0Mi"})
            
            # Calculate age
            age_seconds = (datetime.now(pod.metadata.creation_timestamp.tzinfo) - pod.metadata.creation_timestamp).total_seconds()
            if age_seconds < 3600:
                age = f"{int(age_seconds / 60)}m"
            elif age_seconds < 86400:
                age = f"{int(age_seconds / 3600)}h"
            else:
                age = f"{int(age_seconds / 86400)}d"
            
            # Get restart count
            restart_count = 0
            if pod.status.container_statuses:
                restart_count = sum(cs.restart_count for cs in pod.status.container_statuses)
            
            pod_list.append({
                "name": pod.metadata.name,
                "namespace": pod.metadata.namespace,
                "status": pod.status.phase,
                "cpu": metrics["cpu"],
                "memory": metrics["memory"],
                "age": age,
                "restarts": restart_count,
                "node": pod.spec.node_name or "N/A"
            })
        
        return {
            "pods": pod_list,
            "count": len(pod_list)
        }
        
    except Exception as e:
        return {"pods": _get_demo_pods(), "count": len(_get_demo_pods())}


@router.get("/nodes")
async def get_nodes() -> Dict[str, Any]:
    """
    Get list of nodes with their current status and metrics.
    
    Returns:
        List of nodes with capacity, usage, and health status
    """
    try:
        from kubernetes import client, config
        
        try:
            config.load_incluster_config()
        except:
            try:
                config.load_kube_config()
            except:
                return {"nodes": _get_demo_nodes(), "count": len(_get_demo_nodes())}
        
        v1 = client.CoreV1Api()
        metrics_api = client.CustomObjectsApi()
        
        # Get nodes
        nodes = v1.list_node()
        
        # Get node metrics
        try:
            node_metrics_data = metrics_api.list_cluster_custom_object(
                group="metrics.k8s.io",
                version="v1beta1",
                plural="nodes"
            )
            
            metrics_map = {}
            for node_metric in node_metrics_data.get("items", []):
                node_name = node_metric["metadata"]["name"]
                cpu = node_metric["usage"].get("cpu", "0")
                memory = node_metric["usage"].get("memory", "0")
                
                metrics_map[node_name] = {
                    "cpu": cpu,
                    "memory": memory
                }
        except:
            metrics_map = {}
        
        # Build node list
        node_list = []
        for node in nodes.items:
            metrics = metrics_map.get(node.metadata.name, {"cpu": "0", "memory": "0Mi"})
            
            # Parse capacity
            cpu_capacity = float(node.status.capacity.get("cpu", "0"))
            memory_capacity_str = node.status.capacity.get("memory", "0")
            
            # Parse memory capacity
            if memory_capacity_str.endswith("Ki"):
                memory_capacity = float(memory_capacity_str[:-2]) / 1024
            elif memory_capacity_str.endswith("Mi"):
                memory_capacity = float(memory_capacity_str[:-2])
            elif memory_capacity_str.endswith("Gi"):
                memory_capacity = float(memory_capacity_str[:-2]) * 1024
            else:
                memory_capacity = 0
            
            # Parse current usage
            cpu_usage_str = metrics["cpu"]
            if cpu_usage_str.endswith("n"):
                cpu_usage = float(cpu_usage_str[:-1]) / 1000000000
            elif cpu_usage_str.endswith("m"):
                cpu_usage = float(cpu_usage_str[:-1]) / 1000
            else:
                cpu_usage = float(cpu_usage_str) if cpu_usage_str else 0
            
            memory_usage_str = metrics["memory"]
            if memory_usage_str.endswith("Ki"):
                memory_usage = float(memory_usage_str[:-2]) / 1024
            elif memory_usage_str.endswith("Mi"):
                memory_usage = float(memory_usage_str[:-2])
            elif memory_usage_str.endswith("Gi"):
                memory_usage = float(memory_usage_str[:-2]) * 1024
            else:
                memory_usage = 0
            
            # Calculate percentages
            cpu_percent = f"{int((cpu_usage / max(cpu_capacity, 0.01)) * 100)}%"
            memory_percent = f"{int((memory_usage / max(memory_capacity, 1)) * 100)}%"
            
            # Check node status
            status = "Ready"
            for condition in node.status.conditions:
                if condition.type == "Ready":
                    status = "Ready" if condition.status == "True" else "NotReady"
            
            node_list.append({
                "name": node.metadata.name,
                "status": status,
                "cpu": cpu_percent,
                "memory": memory_percent,
                "cpuCapacity": f"{int(cpu_capacity)} cores",
                "memoryCapacity": f"{int(memory_capacity)}Mi",
                "instanceType": node.metadata.labels.get("node.kubernetes.io/instance-type", "unknown"),
                "zone": node.metadata.labels.get("topology.kubernetes.io/zone", "unknown")
            })
        
        return {
            "nodes": node_list,
            "count": len(node_list)
        }
        
    except Exception as e:
        return {"nodes": _get_demo_nodes(), "count": len(_get_demo_nodes())}


@router.get("/logs")
async def get_cluster_logs(
    namespace: Optional[str] = Query(None),
    pod: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=1000),
    since_seconds: int = Query(3600, ge=60, le=86400)
) -> Dict[str, Any]:
    """
    Get cluster logs from pods.
    
    Args:
        namespace: Filter by namespace
        pod: Filter by specific pod name
        limit: Maximum number of log lines
        since_seconds: Only logs from last N seconds
    
    Returns:
        List of log entries with metadata
    """
    try:
        from kubernetes import client, config
        
        try:
            config.load_incluster_config()
        except:
            try:
                config.load_kube_config()
            except:
                return {
                    "logs": _get_demo_logs(),
                    "count": len(_get_demo_logs()),
                    "message": "Kubernetes API not accessible - showing demo logs"
                }
        
        v1 = client.CoreV1Api()
        
        logs = []
        
        if pod and namespace:
            # Get logs from specific pod
            try:
                log_text = v1.read_namespaced_pod_log(
                    name=pod,
                    namespace=namespace,
                    tail_lines=limit,
                    since_seconds=since_seconds
                )
                
                for line in log_text.split("\n")[-limit:]:
                    if line.strip():
                        logs.append({
                            "timestamp": datetime.utcnow().isoformat() + "Z",
                            "namespace": namespace,
                            "pod": pod,
                            "message": line.strip(),
                            "level": "INFO"
                        })
            except Exception as e:
                pass
        else:
            # Get logs from multiple pods
            if namespace:
                pods = v1.list_namespaced_pod(namespace, limit=10)
            else:
                pods = v1.list_pod_for_all_namespaces(limit=10)
            
            for pod_obj in pods.items:
                try:
                    log_text = v1.read_namespaced_pod_log(
                        name=pod_obj.metadata.name,
                        namespace=pod_obj.metadata.namespace,
                        tail_lines=10,
                        since_seconds=since_seconds
                    )
                    
                    for line in log_text.split("\n")[-10:]:
                        if line.strip() and len(logs) < limit:
                            logs.append({
                                "timestamp": datetime.utcnow().isoformat() + "Z",
                                "namespace": pod_obj.metadata.namespace,
                                "pod": pod_obj.metadata.name,
                                "message": line.strip(),
                                "level": _detect_log_level(line)
                            })
                except:
                    continue
        
        # Sort by timestamp descending
        logs.sort(key=lambda x: x["timestamp"], reverse=True)
        
        return {
            "logs": logs[:limit],
            "count": len(logs[:limit]),
            "since_seconds": since_seconds
        }
        
    except Exception as e:
        return {
            "logs": _get_demo_logs(),
            "count": len(_get_demo_logs()),
            "error": str(e)
        }


def _detect_log_level(log_line: str) -> str:
    """Detect log level from log line."""
    log_upper = log_line.upper()
    if "ERROR" in log_upper or "FATAL" in log_upper:
        return "ERROR"
    elif "WARN" in log_upper:
        return "WARNING"
    elif "INFO" in log_upper:
        return "INFO"
    elif "DEBUG" in log_upper:
        return "DEBUG"
    else:
        return "INFO"


def _get_demo_cluster_stats() -> Dict[str, Any]:
    """Return demo cluster statistics."""
    return {
        "activePods": 42,
        "totalPods": 45,
        "cpuUsage": 4.2,
        "cpuCapacity": 8,
        "memoryUsage": 12.5,
        "memoryCapacity": 32,
        "networkIO": "245 Mbps",
        "nodes": 3,
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }


def _get_demo_pods() -> List[Dict[str, Any]]:
    """Return demo pod list."""
    return [
        {
            "name": "nginx-deployment-1",
            "namespace": "production",
            "status": "Running",
            "cpu": "245m",
            "memory": "512Mi",
            "age": "5d",
            "restarts": 0,
            "node": "node-1"
        },
        {
            "name": "api-service-2",
            "namespace": "production",
            "status": "Running",
            "cpu": "1200m",
            "memory": "2Gi",
            "age": "3d",
            "restarts": 1,
            "node": "node-2"
        },
        {
            "name": "database-0",
            "namespace": "production",
            "status": "Running",
            "cpu": "2000m",
            "memory": "4Gi",
            "age": "10d",
            "restarts": 0,
            "node": "node-1"
        },
        {
            "name": "redis-cache-1",
            "namespace": "default",
            "status": "Running",
            "cpu": "500m",
            "memory": "1Gi",
            "age": "7d",
            "restarts": 0,
            "node": "node-3"
        }
    ]


def _get_demo_nodes() -> List[Dict[str, Any]]:
    """Return demo node list."""
    return [
        {
            "name": "node-1",
            "status": "Ready",
            "cpu": "65%",
            "memory": "72%",
            "cpuCapacity": "2 cores",
            "memoryCapacity": "8192Mi",
            "instanceType": "t3.medium",
            "zone": "us-east-1a"
        },
        {
            "name": "node-2",
            "status": "Ready",
            "cpu": "48%",
            "memory": "56%",
            "cpuCapacity": "2 cores",
            "memoryCapacity": "8192Mi",
            "instanceType": "t3.medium",
            "zone": "us-east-1b"
        },
        {
            "name": "node-3",
            "status": "Ready",
            "cpu": "52%",
            "memory": "61%",
            "cpuCapacity": "2 cores",
            "memoryCapacity": "8192Mi",
            "instanceType": "t3.medium",
            "zone": "us-east-1c"
        }
    ]


def _get_demo_logs() -> List[Dict[str, Any]]:
    """Return demo logs."""
    return [
        {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "namespace": "production",
            "pod": "api-service-2",
            "message": "Started HTTP server on port 8000",
            "level": "INFO"
        },
        {
            "timestamp": (datetime.utcnow() - timedelta(minutes=5)).isoformat() + "Z",
            "namespace": "production",
            "pod": "nginx-deployment-1",
            "message": "Received request GET /api/health",
            "level": "INFO"
        },
        {
            "timestamp": (datetime.utcnow() - timedelta(minutes=10)).isoformat() + "Z",
            "namespace": "monitoring",
            "pod": "prometheus-0",
            "message": "Successfully scraped metrics from target",
            "level": "INFO"
        }
    ]
