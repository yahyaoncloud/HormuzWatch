# HormuzWatch Readiness & Phases

This document evaluates the current readiness of the HormuzWatch infrastructure, outlines the upcoming phases required for completion, and sets a vision for future iterations of the project.

## 1. Project Readiness Score: 85%

HormuzWatch is currently in late-stage development and is highly functional. Below is the breakdown of the current readiness score across the architecture:

### Frontend (React/TypeScript): 90%
- **Strengths:** Fully functional WebGL geospatial globe, real-time telemetry rendering via WebSockets, and seamless integration with authentication.
- **Pending:** Final optimization of the React render cycle for thousands of concurrent data points (e.g., using `requestAnimationFrame` more aggressively).

### Backend (Golang): 85%
- **Strengths:** Highly concurrent WebSocket hub, Gin-based REST APIs, integrated open-source data fetching (AIS, GDELT, OpenSky), and exposed Prometheus metrics.
- **Pending:** Rigorous load testing on the WebSocket connections and connection drop handling during cloud redeployments.

### Infrastructure & Observability (Azure/Docker): 80%
- **Strengths:** Fully containerized stack, Docker Compose definitions ready, and a complete observability layer (Prometheus, Loki, Promtail, Grafana) built out.
- **Pending:** Final live testing of the click-to-deploy Ansible and Terraform workflows on the target Azure Virtual Machine (AVM).

### Android Automation App (Kotlin/Jetpack Compose): 95%
- **Strengths:** Direct integration with GitHub Actions, Firebase SSO authentication, and real-time Loki log streaming.
- **Pending:** UI polish and ensuring graceful error handling if Azure provisioning times out.

---

## 2. New Phases for Completion

To move HormuzWatch from 85% to 100% production-ready, the following phases must be executed:

### Phase 1: Local Flow & Load Testing (MVP Branch)
1. **API Optimization:** Stress test the Golang `/analyze` and `/heatmap` endpoints using tools like `k6`.
2. **WebSocket Stability:** Spin up 1,000 mock clients to test the memory consumption of the Go WebSocket Hub.
3. **Postgres Tuning:** Evaluate query performance for spatial data. Ensure indexes are properly utilized on heavy read/writes.

### Phase 2: Cloud Deployment Testing (Azure-Dep Branch)
1. **Azure Quick Deploy/Destroy Strategy:** Perform a full end-to-end "destroy and deploy" using the Android application.
2. **Idempotency Checks:** Ensure running the Ansible playbook twice does not break the system.
3. **ML Service Deployment:** Deploy the ML inference service directly onto the AVM (Azure Virtual Machine) rather than a PaaS Azure ML endpoint to aggressively cut costs.

### Phase 3: Documentation and Handoff
1. Compile the interview prep guides.
2. Freeze the architecture, ensuring both `mvp` and `azure-dep` branches are perfectly synced.

---

## 3. Future Scoping (v2.0)

For future iterations or discussion during interviews, the following features outline the project's growth trajectory:

1. **Multi-Region High Availability:** Deploying the Go backend to multiple Azure regions (e.g., US East and EU West) and placing Azure Front Door in front of them to route traffic based on latency.
2. **Advanced NLP for Threat Intelligence:** Currently, GDELT provides generic news feeds. In v2.0, we would use a lightweight LLM (like LLaMA 3 via Ollama on the AVM) to perform real-time sentiment analysis and entity extraction on the news to predict geopolitical spikes in the Strait of Hormuz.
3. **Kubernetes Migration:** Transitioning the raw Docker Compose/Ansible deployment into a managed Azure Kubernetes Service (AKS) cluster for automated scaling and self-healing.
4. **Offline Mode for Android App:** Allowing administrative control and cached log viewing even when the device momentarily loses connectivity.
