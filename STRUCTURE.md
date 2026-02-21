kubecent/
│
├── 📄 README.md                         # Project overview and quick start
├── 📄 PROJECT_SUMMARY.md               # Detailed completion summary
├── 📄 BACKEND.md                       # Backend development guide
├── 📄 FRONTEND.md                      # Frontend development guide
├── 📄 DEPLOYMENT.md                    # Kubernetes deployment guide
├── 📄 Makefile                         # Development task automation
├── 📄 .env.example                     # Backend environment template
├── 📄 .gitignore                       # Git ignore rules
│
├── 📁 backend/                         # FastAPI Backend (Python)
│   ├── 📄 requirements.txt              # Python dependencies
│   ├── 📄 conftest.py                  # Pytest configuration
│   │
│   ├── 📁 app/                         # Main application
│   │   ├── 📄 __init__.py
│   │   ├── 📄 main.py                  # FastAPI app factory & entry point
│   │   │
│   │   ├── 📁 core/                    # Application core
│   │   │   ├── 📄 __init__.py
│   │   │   ├── 📄 config.py            # Settings with Pydantic
│   │   │   ├── 📄 logging.py           # Structured logging setup
│   │   │   └── 📄 exceptions.py        # Domain-specific exceptions
│   │   │
│   │   ├── 📁 middleware/              # HTTP middleware
│   │   │   ├── 📄 __init__.py
│   │   │   ├── 📄 auth.py              # Kubernetes RBAC authentication
│   │   │   └── 📄 logging.py           # Request/response logging
│   │   │
│   │   ├── 📁 models/                  # Data models
│   │   │   ├── 📄 __init__.py
│   │   │   └── 📄 schemas.py           # Pydantic models for API
│   │   │
│   │   ├── 📁 services/                # Business logic layer
│   │   │   ├── 📄 __init__.py
│   │   │   ├── 📄 cost_service.py      # OpenCost client & cost aggregation
│   │   │   └── 📄 optimization_service.py  # Recommendation engine
│   │   │
│   │   └── 📁 api/                     # HTTP API endpoints
│   │       ├── 📄 __init__.py
│   │       ├── 📄 health.py            # Health check endpoint
│   │       │
│   │       └── 📁 v1/                  # API v1
│   │           ├── 📄 __init__.py
│   │           ├── 📄 router.py        # Router aggregation
│   │           │
│   │           └── 📁 endpoints/       # Endpoint implementations
│   │               ├── 📄 __init__.py
│   │               ├── 📄 costs.py     # Cost query endpoints
│   │               └── 📄 optimizations.py  # Optimization endpoints
│   │
│   └── 📁 tests/                       # Test suite
│       └── 📄 test_models.py           # Model tests
│
├── 📁 frontend/                        # React + Vite Frontend (TypeScript)
│   ├── 📄 package.json                 # npm dependencies & scripts
│   ├── 📄 tsconfig.json                # TypeScript configuration
│   ├── 📄 tsconfig.node.json           # TS config for build tools
│   ├── 📄 vite.config.ts               # Vite bundler configuration
│   ├── 📄 tailwind.config.js           # Tailwind CSS configuration
│   ├── 📄 postcss.config.js            # PostCSS/Autoprefixer config
│   ├── 📄 index.html                   # HTML entry point
│   ├── 📄 .env.example                 # Environment template
│   │
│   └── 📁 src/                         # Source code
│       ├── 📄 index.css                # Global & Tailwind styles
│       ├── 📄 main.tsx                 # React app entry point
│       ├── 📄 App.tsx                  # Main app component & routing
│       │
│       ├── 📁 components/              # React components
│       │   ├── 📄 Header.tsx           # Navigation header
│       │   ├── 📄 Overview.tsx         # Dashboard main view
│       │   ├── 📄 Namespaces.tsx       # Namespace cost table
│       │   └── 📄 Optimization.tsx     # Recommendations display
│       │
│       ├── 📁 hooks/                   # Custom React hooks
│       │   └── 📄 useApi.ts            # Data fetching hooks
│       │
│       ├── 📁 services/                # API communication
│       │   └── 📄 apiClient.ts         # Axios HTTP client
│       │
│       ├── 📁 types/                   # TypeScript types
│       │   └── 📄 index.ts             # API response types
│       │
│       └── 📁 utils/                   # Utility functions
│           └── 📄 format.ts            # Formatting utilities
│
├── 📁 docker/                          # Docker configurations
│   ├── 📄 Dockerfile.backend           # Backend container definition
│   ├── 📄 Dockerfile.frontend          # Frontend container definition
│   ├── 📄 nginx.conf                   # Nginx configuration for frontend
│   ├── 📄 docker-compose.yml           # Local development compose
│   └── 📄 prometheus.yml               # Prometheus scrape config
│
├── 📁 helm/                            # Kubernetes Helm chart
│   └── 📁 kubecent/
│       ├── 📄 Chart.yaml               # Helm chart metadata
│       ├── 📄 values.yaml              # Default chart values
│       │
│       └── 📁 templates/               # Kubernetes resource templates
│           ├── 📄 _helpers.tpl         # Helm template helpers
│           ├── 📄 serviceaccount.yaml  # K8s service account
│           ├── 📄 clusterrole.yaml     # K8s cluster role (RBAC)
│           ├── 📄 clusterrolebinding.yaml  # Role binding
│           ├── 📄 configmap.yaml       # Configuration map
│           ├── 📄 deployment.yaml      # Backend & frontend deployments
│           └── 📄 service.yaml         # Service definitions
│
├── 📁 .github/
│   └── 📁 workflows/
│       └── 📄 build.yml                # CI/CD pipeline (build, test, push)
│
└── 📁 [Deployment Resources]
    ├── Configured OpenCost (external)
    ├── Prometheus instance (external)
    └── Kubernetes cluster (target)


KEY FILES BY PURPOSE:

🎯 Getting Started
├── README.md                 ← START HERE
├── .env.example              ← Configuration
├── Makefile                  ← Quick commands
└── docker-compose.yml        ← Local development

🏗️ Architecture
├── backend/app/main.py       ← Backend entry
├── frontend/src/App.tsx      ← Frontend entry
└── BACKEND.md, FRONTEND.md   ← Design docs

🔐 Security & Auth
├── backend/app/middleware/auth.py  ← RBAC
├── helm/kubecent/templates/clusterrole.yaml
└── helm/kubecent/templates/clusterrolebinding.yaml

📦 Deployment
├── docker/Dockerfile.*       ← Container images
├── helm/kubecent/            ← K8s charts
├── DEPLOYMENT.md             ← Deploy guide
└── .github/workflows/build.yml  ← CI/CD

🧪 Testing & Quality
├── backend/tests/            ← Unit tests
├── backend/conftest.py       ← Pytest config
└── frontend/package.json     ← Test scripts

📊 Services & Logic
├── backend/app/services/cost_service.py       ← Cost aggregation
├── backend/app/services/optimization_service.py ← Recommendations
└── frontend/src/services/apiClient.ts         ← API client

📡 API & Data
├── backend/app/api/v1/endpoints/costs.py          ← Cost endpoints
├── backend/app/api/v1/endpoints/optimizations.py ← Optimization endpoints
└── backend/app/models/schemas.py                ← Data schemas


DEPLOYMENT WORKFLOW:

1. Local Development
   └─ docker-compose up

2. Container Build
   └─ docker build & push

3. Kubernetes Deploy
   └─ helm install kubecent

4. Access
   ├─ NodePort: node-ip:30081
   ├─ Port-forward: localhost:3000
   └─ Ingress: cost.example.com


TECHNOLOGY STACK:

Backend:
  ✅ FastAPI 0.104.1
  ✅ Pydantic 2.5
  ✅ httpx (async HTTP)
  ✅ structlog (logging)
  ✅ prometheus-client
  ✅ kubernetes (k8s API)

Frontend:
  ✅ React 18
  ✅ TypeScript 5.3
  ✅ Vite 5.0
  ✅ Tailwind CSS 3.3
  ✅ Recharts 2.10
  ✅ Axios

Infrastructure:
  ✅ Docker (containerization)
  ✅ Helm 3 (K8s deployment)
  ✅ Kubernetes 1.20+
  ✅ OpenCost (cost data)
  ✅ Prometheus (metrics)


FEATURES:

Backend Features:
  ✅ Kubernetes RBAC authentication
  ✅ OpenCost API integration
  ✅ Cost data aggregation & caching
  ✅ Optimization recommendation engine
  ✅ Structured JSON logging
  ✅ Prometheus metrics export
  ✅ Health checks
  ✅ Comprehensive error handling

Frontend Features:
  ✅ Real-time cost dashboard
  ✅ Namespace cost breakdown
  ✅ Optimization recommendations
  ✅ Interactive visualizations
  ✅ Responsive dark theme
  ✅ Loading & error states
  ✅ Auto-refresh (60s)

Operational Features:
  ✅ In-cluster only (no SaaS)
  ✅ Clean architecture
  ✅ Full type safety (Python + TS)
  ✅ Production logging
  ✅ Helm deployment
  ✅ RBAC integration
  ✅ Security hardening
  ✅ CI/CD pipeline
  ✅ Comprehensive documentation


All components are production-ready, fully documented, and follow enterprise best practices.
