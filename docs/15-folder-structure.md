# Repository Directory Structure

A comprehensive breakdown of the HormuzWatch monorepo layout.

```text
hormuzwatch/
│
├── client/                     # Frontend Application (React/Vite)
│   ├── public/                 # Static assets (favicon, raw HTML)
│   ├── src/                    # React Source Code
│   │   ├── assets/             # Images, SVGs
│   │   ├── components/         # Reusable UI components (HormuzMap, ErrorBoundary)
│   │   ├── context/            # Global state (AuthContext, WebSocketContext)
│   │   ├── hooks/              # Custom React hooks
│   │   ├── layouts/            # Page wrappers (RootLayout, PublicLayout)
│   │   ├── pages/              # Route-level components
│   │   ├── routes/             # React Router definitions (index.tsx)
│   │   ├── services/           # HTTP API wrappers (api.ts)
│   │   ├── types/              # TypeScript interfaces
│   │   ├── App.tsx             # Root component
│   │   ├── index.css           # Global CSS, design system variables
│   │   └── main.tsx            # DOM mounting entrypoint
│   ├── .env.example            # Sample frontend environment vars
│   ├── index.html              # Vite HTML template
│   ├── package.json            # NPM dependencies
│   ├── tsconfig.json           # TypeScript configuration
│   └── vite.config.ts          # Vite build and proxy config
│
├── server/                     # Backend API (Go/Gin)
│   ├── cmd/                    # Application entry points
│   │   └── main.go             # Main server binary
│   ├── data/                   # Static application data
│   │   └── history-attacks.json# Historical incident markers
│   ├── internal/               # Private application logic (vertical slices)
│   │   ├── anomaly/            # Rule engine scoring logic
│   │   ├── api/                # HTTP handlers and middleware
│   │   ├── auth/               # JWT, user, and session management
│   │   ├── config/             # Config loader
│   │   ├── db/                 # SQLite/Postgres connection and schema
│   │   ├── geo/                # Geospatial math (Haversine)
│   │   ├── heatmap/            # In-memory spatial aggregation
│   │   ├── integrations/       # External API clients (AIS, OpenSky, RSS)
│   │   ├── intelligence/       # Track state, ML client, composite scoring
│   │   └── websocket/          # Real-time pub/sub hub
│   ├── .env                    # Local environment variables
│   ├── Dockerfile              # Containerization definition
│   ├── go.mod                  # Go module dependencies
│   └── go.sum                  # Go dependency checksums
│
├── ml-inference/               # Machine Learning Service (Python/FastAPI)
│   ├── api/                    # API route handlers
│   │   └── predict.py          # Inference endpoint logic
│   ├── models/                 # Serialized model artifacts
│   │   ├── .gitkeep            # Ensures directory exists
│   │   └── isolation_forest.joblib # Saved scikit-learn model
│   ├── app.py                  # FastAPI server entry point
│   ├── requirements.txt        # Python dependencies
│   └── Dockerfile              # Containerization definition (deprecated, using render)
│
├── terraform/                  # Infrastructure as Code
│   ├── modules/                # Reusable Azure component modules
│   │   ├── ai-services/        
│   │   ├── app/                # Container Apps
│   │   ├── event_hubs/         
│   │   ├── monitoring/         # Log Analytics, App Insights
│   │   ├── networking/         # VNet, Subnets
│   │   ├── security/           # Key Vault, RBAC
│   │   └── storage/            # Blob storage
│   ├── main.tf                 # Root module orchestration
│   ├── variables.tf            # Input variables
│   └── outputs.tf              # Output variables
│
├── docs/                       # Project Documentation (You are here)
│   ├── *.md                    # Markdown guides
│
├── .github/                    # GitHub configuration
│   └── workflows/              # CI/CD pipelines (Actions)
│       ├── deploy-backend.yml  # Azure Container Apps deployment
│       ├── deploy-frontend.yml # Azure Static Web Apps deployment
│       ├── security-scan.yml   # CodeQL security scanning
│       └── web-ci.yml          # Frontend build verification
│
├── docker-compose.yml          # Local multi-container development environment
├── render.yaml                 # Blueprint for deploying ML service to Render.com
├── .gitignore                  # Git untracked files
└── README.md                   # Repository root landing page
```
