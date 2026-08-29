# 01 — Product Overview

> **HormuzWatch** — Gulf Maritime Threat Intelligence Platform

---

## 1. What Is HormuzWatch?

HormuzWatch is a real-time intelligence platform that monitors the **Strait of Hormuz** — the world's
most critical oil shipping chokepoint, through which ~21% of global petroleum liquids transit daily.

The platform aggregates multi-source news intelligence and live AIS vessel telemetry, runs an ensemble
machine learning anomaly detection pipeline, and surfaces structured risk signals to operators via a
live dashboard and REST API.

It is built as a **production cloud engineering showcase** on Microsoft Azure, demonstrating:
- Cloud-native Go + Python ML services
- Automated ML lifecycle (training, versioning, drift detection)
- Infrastructure-as-Code with Terraform
- Managed cloud observability and zero-downtime CI/CD

---

## 2. Why the Strait of Hormuz?

| Factor | Data |
|--------|------|
| Daily oil transit | ~21 million barrels/day (~21% of world supply) |
| LNG transit | ~25% of global LNG exports |
| Chokepoint width | 33 km at narrowest |
| Adjacent state actors | Iran, Oman, UAE |
| Historical incidents | USS Vincennes (1988), tanker attacks (2019), drone incidents (2021-present) |

Events in this region — military activity, sanctions, infrastructure attacks — directly move
global energy markets within hours. Early detection of anomalous vessel behavior or news signals
is operationally valuable for maritime security, energy trading, and geopolitical analysis.

---

## 3. Core Capabilities

### 3.1 News Intelligence Pipeline

The platform ingests **16 Gulf regional news sources** (Arabic, Farsi, English) through a 7-step
processing pipeline:

```
Source Fetch → Clean (HTML strip) → Dedup (SimHash) → Language Detect
→ Entity Extract (NER) → Feature Engineering (18 dims) → ML Risk Score
→ Coordinate Extraction (4-phase geo) → Persist → API
```

**Sources include:** WAM (UAE), SPA (Saudi Arabia), KUNA (Kuwait), BNA (Bahrain), ONA (Oman),
QNA (Qatar), IRNA (Iran), INA (Iraq), USNI News, Defence News, Al Jazeera, Reuters, Maritime
Executive, UKMTO, IMO, OPEC.

Each article is scored 0–100 across 6 dimensions:
- Keyword density (military/energy/shipping/cyber terms)
- Entity density (ships, ports, organizations, aircraft)
- Source reliability (per-source calibrated weight)
- Country risk (22 country risk matrix)
- Category match (military, maritime, political, energy)
- Recency (decay over 72 hours)

### 3.2 Vessel Anomaly Detection

Real-time AIS data from AISStream.io feeds a 9-feature kinematic feature vector into the
ML ensemble per vessel observation. The ensemble flags anomalous behavior: unusual course
changes, speed deviations, AIS transponder gaps, proximity to restricted zones, and deviation
from historical track baselines.

### 3.3 ML Ensemble Scoring (6 Domains)

| Domain | Features | Use Case |
|--------|----------|----------|
| `vessel` | 9 kinematic features | AIS anomaly per ship |
| `news` | 18 NLP features | Article threat scoring |
| `transit` | 7 gate-crossing features | Strait transit anomalies |
| `blockade` | 7 aggregate features | Regional blockade severity |
| `heatmap` | 4 spatial features | Geo event density anomaly |
| `aviation` | 9 kinematic features | Aircraft track anomaly |

### 3.4 Live Dashboard

React 19 frontend with:
- Real-time vessel + news map (Leaflet)
- Admin pipeline health panel
- Intelligence event timeline
- Threat board (anomalies + high-risk articles)
- WebSocket live updates

---

## 4. What This Platform Is NOT

The following are explicitly out of scope for the current production release:

| Excluded | Reason |
|----------|--------|
| Desktop Qt application | Not cloud-native; deployment overhead |
| FIRMS fire data | High noise, tangential to maritime focus |
| GDELT global events | Noise outweighs signal for Hormuz-specific focus |
| Aviation tracking (primary) | OpenSky free tier unreliable; adds latency |
| Social media monitoring | No compliant API access |
| Predictive conflict modelling | Insufficient labeled training data |

> These may be reintroduced in future product phases as paid data sources become available.

---

## 5. Product Architecture in One Diagram

```
  [16 Gulf News Sources]        [AISStream.io - WebSocket]
          │                              │
          ▼                              ▼
  ┌───────────────────────────────────────────────────┐
  │              Go Backend (Azure Container Apps)     │
  │                                                   │
  │  News Pipeline    AIS Processor    REST/WS API    │
  │  Worker Pool      Feature Eng.     JWT Auth       │
  │  Scheduler        State Machine    gRPC Client    │
  └────────────────────────┬──────────────────────────┘
                           │ gRPC (structured vectors)
                           ▼
  ┌────────────────────────────────────────────────────┐
  │        Python ML Service (Azure Container Apps)    │
  │                                                    │
  │  Ensemble: IsolationForest + LOF + Isotonic Cal.   │
  │  SHAP Explanations · FastAPI + gRPC · 6 Domains   │
  └────────────────────────┬───────────────────────────┘
                           │
         ┌─────────────────┼─────────────────┐
         ▼                 ▼                 ▼
  Supabase (PostgreSQL)  Azure Blob       Azure Monitor
  Articles, Tracks,      Model Artifacts  OpenTelemetry
  Entities, Events       Training Data    Traces + Alerts
```

---

## 6. Key Metrics (Production Targets)

| Metric | Target |
|--------|--------|
| News pipeline latency | < 30s from publish to scored |
| ML inference time | < 400ms per prediction |
| API p99 response time | < 500ms |
| System uptime | > 99.5% monthly |
| Source availability | > 80% sources healthy at any time |
| Data freshness | News refreshed every 15 min |

---

## 7. Technology Stack Summary

| Layer | Technology | Managed By |
|-------|-----------|------------|
| Cloud Platform | Microsoft Azure | Terraform |
| Go Backend | Go 1.25 · Gin · gRPC · pgx | Docker / ACA |
| Python ML | Python 3.11 · scikit-learn · FastAPI · gRPC | Docker / ACA |
| Database | Supabase (PostgreSQL 15) | Supabase Cloud |
| Frontend | React 19 · Tailwind v4 · Leaflet | Vercel |
| Container Registry | Azure Container Registry | Terraform |
| Observability | Azure Monitor · OpenTelemetry | Terraform |
| CI/CD | GitHub Actions | `.github/workflows/` |
| IaC | Terraform 1.8+ | `terraform/` |
