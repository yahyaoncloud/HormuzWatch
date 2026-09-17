# Module 17: Production-Grade GitOps with ArgoCD, K3s Kubernetes, and Open-Source Cloud-Native Ecosystem

## 1. Executive Summary & GitOps Philosophy

**GitOps** is an operational framework that takes DevOps best practices used for application development—such as version control, collaboration, compliance, and CI/CD—and applies them to infrastructure automation and application lifecycle management.

In the **HormuzWatch** production environment, Git is the **single source of truth** for both infrastructure configuration and deployment manifests. **ArgoCD** continuously monitors the Git repository (`https://github.com/yahyaoncloud/HormuzWatch.git`) and automatically synchronizes the live state of the **K3s Kubernetes cluster** with the desired state declared in Git.

```mermaid
flowchart TD
    subgraph GitOps Source of Truth [GitHub Cloud]
        Repo[Git Repository: yahyaoncloud/HormuzWatch]
        Branch[Branch: production-ready]
        K8sManifests[k8s/prod & k8s/argocd Manifests]
        Repo --> Branch --> K8sManifests
    end

    subgraph CI Controller [Node: TP24]
        CodeCommit[Code Push] --> Jenkins[Jenkins Pipeline]
        Jenkins -->|Unit Tests, SAST & Security Scan| TestPass{Tests Pass?}
        TestPass -->|Yes| ImageBuild[Build Container Images]
        ImageBuild -->|Publish| GHCR[(GitHub Container Registry - GHCR)]
        TestPass -->|No| FailHalt[Halt Build & Alert]
    end

    subgraph CD & GitOps Engine [Namespace: argocd]
        ArgoAppController[argocd-application-controller]
        ArgoServer[argocd-server UI :30088]
        ArgoRepoServer[argocd-repo-server]
        
        ArgoRepoServer -->|Poll Git Every 3m / Webhook| K8sManifests
        ArgoAppController -->|Detect State Drift| DriftEngine{In Sync?}
        DriftEngine -->|OutOfSync| SyncEngine[Automated Self-Heal & Apply]
    end

    subgraph K3s Multi-Node Cluster [Control Plane: tunkstun | Worker: late5530]
        SyncEngine --> ProdNS[Namespace: hormuzwatch-prod]
        
        subgraph Production Workloads
            PGPod[PostgreSQL 16 StatefulSet + PVC]
            MLPod[Python ML Engine Deployment]
            ServerPod[Go Backend API Deployment]
            ClientPod[React Vite SPA Deployment]
            Ingress[Kubernetes Ingress & TLS]
            HPA[Horizontal Pod Autoscalers]
        end

        ProdNS --> PGPod
        ProdNS --> MLPod
        ProdNS --> ServerPod
        ProdNS --> ClientPod
        ProdNS --> Ingress
        ProdNS --> HPA
    end
```

---

## 2. Open-Source Cloud-Native Tool Ecosystem

To build an enterprise-grade, resilient DevOps and GitOps system without proprietary cloud lock-in, HormuzWatch leverages standard CNCF (Cloud Native Computing Foundation) open-source software:

| Open-Source Tool | CNCF Status | Layer / Category | Role in HormuzWatch Architecture |
| :--- | :--- | :--- | :--- |
| **K3s** | CNCF Sandbox | Lightweight Kubernetes Distribution | Multi-node cluster orchestration (`tunkstun` master + `late5530` worker) |
| **ArgoCD** | CNCF Graduated | Declarative GitOps Continuous Delivery | Automated pull-based reconciliation, self-healing, and rollback engine |
| **Kustomize** | Kubernetes SIG | Declarative Configuration Management | Base/Overlay environment customization (dev vs prod overlays) |
| **Jenkins LTS** | Continuous Delivery Foundation | Continuous Integration & Testing | Pre-flight test suites, secret scanning, and image artifact generation |
| **Aqua Trivy** | Open Source | Container Security & CVE Scanning | Layer-by-layer vulnerability analysis before image deployment |
| **Gitleaks** | Open Source | Secret & Credential Detection | Prevents leaked tokens, certificates, and database secrets |
| **Prometheus & Metrics-Server** | CNCF Graduated | Cluster Metrics & Telemetry | Resource usage tracking for Horizontal Pod Autoscaling (HPA) |
| **Cloudflare Tunnel (`cloudflared`)** | Open Source Edge Client | Zero Trust Edge Ingress | Public SSL termination without exposing public IPv4 addresses |

---

## 3. K3s Multi-Node Cluster Topology

The HormuzWatch Kubernetes cluster spans physical nodes interconnected over a high-speed local network:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          K3s Cluster Architecture                           │
├──────────────────────────────────────┬──────────────────────────────────────┤
│ Control Plane (Master Node)          │ Worker / Production Node             │
│ Node Name: tunkstun (192.168.1.46)   │ Node Name: late5530 (192.168.1.40)   │
│ OS: Ubuntu 24.04 LTS (x86_64)        │ OS: Rocky Linux 9.8 (x86_64)         │
│ Role: control-plane, etcd/sqlite,    │ Role: worker, production workloads,  │
│       API Server, CoreDNS, Scheduler │       ArgoCD Pods, Database PVC      │
└──────────────────────────────────────┴──────────────────────────────────────┘
```

### Cluster Health Verification:
```bash
$ kubectl get nodes -o wide
NAME       STATUS   ROLES               AGE    VERSION        INTERNAL-IP    OS-IMAGE
late5530   Ready    production,worker   5d8h   v1.36.4+k3s1   192.168.1.40   Rocky Linux 9.8
tunkstun   Ready    control-plane       5d8h   v1.36.4+k3s1   192.168.1.46   Ubuntu 24.04.4 LTS
```

---

## 4. ArgoCD Installation, Configuration & Security

### 1. Installation
ArgoCD is installed in the dedicated `argocd` namespace using server-side apply:
```bash
kubectl create namespace argocd
kubectl apply --server-side --force-conflicts -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
```

### 2. Controller & Service Parameters
To allow seamless local and reverse-proxy access without double-TLS termination conflicts:
```bash
# Enable insecure mode behind Nginx / Cloudflare Tunnel
kubectl -n argocd patch cm argocd-cmd-params-cm -p '{"data": {"server.insecure": "true"}}'

# Expose ArgoCD Server UI via NodePort :30088
kubectl patch svc argocd-server -n argocd -p '{"spec": {"type": "NodePort", "ports": [{"name": "http", "port": 80, "targetPort": 8080, "nodePort": 30088}]}}'
```

### 3. ArgoCD UI Access Credentials
- **URL**: `http://192.168.1.40:30088` (or `http://192.168.1.46:30088`)
- **Username**: `admin`
- **Password Query**:
  ```bash
  kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath='{.data.password}' | base64 -d
  ```

---

## 5. Declarative ArgoCD Application Manifests

### 1. Production Application (`k8s/argocd/application-prod.yaml`)
```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: hormuzwatch-prod
  namespace: argocd
  finalizers:
    - resources-finalizer.argocd.argoproj.io
spec:
  project: default
  source:
    repoURL: https://github.com/yahyaoncloud/HormuzWatch.git
    targetRevision: production-ready
    path: k8s/prod
  destination:
    server: https://kubernetes.default.svc
    namespace: hormuzwatch-prod
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
      - ApplyOutOfSyncOnly=true
    retry:
      limit: 5
      backoff:
        duration: 5s
        factor: 2
        maxDuration: 1m
```

### 2. App-of-Apps Pattern (`k8s/argocd/root-app-of-apps.yaml`)
The **App-of-Apps** pattern allows managing all individual environments (`prod`, `dev`, `monitoring`) through a single root ArgoCD Application that points to the `k8s/argocd/` directory.

---

## 6. Self-Healing, Drift Detection & Rolling Updates

### Automatic Self-Healing
If an operator manually modifies or deletes a production resource (e.g. `kubectl delete pod` or manual scaling), ArgoCD detects the drift within seconds and automatically restores the cluster state to match the Git manifest.

### Zero-Downtime Rolling Update Strategy
In `k8s/prod/03-server.yaml`, the Go backend specifies:
```yaml
spec:
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
```
- A new pod is spawned and subjected to `readinessProbe` HTTP probes (`/health`).
- Only when the new pod passes health checks does Kubernetes redirect service traffic to it and gracefully terminate the old pod.

### Horizontal Pod Autoscaling (HPA)
Defined in `k8s/prod/06-hpa.yaml`, the Server and ML tiers scale between 1 and 4 replicas automatically when CPU utilization exceeds 75% or memory utilization exceeds 80%.

---

## 7. GitOps Operational Runbook

### Applying ArgoCD Applications
```bash
# Register production application in ArgoCD:
kubectl apply -f k8s/argocd/application-prod.yaml

# Check synchronization status:
kubectl get applications -n argocd
```

### Manual Trigger & Status Check via ArgoCD CLI
```bash
# Sync application immediately:
argocd app sync hormuzwatch-prod

# Check real-time health and sync status:
argocd app get hormuzwatch-prod
```
