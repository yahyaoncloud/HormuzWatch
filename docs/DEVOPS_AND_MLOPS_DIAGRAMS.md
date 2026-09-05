# DevOps and MLOps Architecture & Lifecycle Diagrams

This document outlines the lifecycles, pipelines, and architectural differences between traditional **DevOps** and **MLOps** using Mermaid diagrams.

---

## 1. DevOps Lifecycle (The CI/CD Loop)

DevOps focuses on continuous software delivery through iterative code changes, automated testing, building, deployment, and operational monitoring.

```mermaid
flowchart LR
    %% DevOps Loop
    subgraph Development ["Development & CI"]
        PLAN["Plan & Backlog"] --> CODE["Code & Version Control (Git)"]
        CODE --> BUILD["Build & Containerize (Docker)"]
        BUILD --> TEST["Automated Tests (Unit/Integration)"]
    end

    subgraph Operations ["Delivery & CD"]
        RELEASE["Release / Registry"] --> DEPLOY["Deploy (K8s / Cloud)"]
        DEPLOY --> OPERATE["Operate & Orchestrate"]
        OPERATE --> MONITOR["Monitor & Logging (APM)"]
    end

    TEST --> RELEASE
    MONITOR -->|Bug reports & Feature feedback| PLAN

    classDef dev fill:#1e293b,stroke:#38bdf8,stroke-width:2px,color:#fff;
    classDef ops fill:#1e293b,stroke:#4ade80,stroke-width:2px,color:#fff;
    class PLAN,CODE,BUILD,TEST dev;
    class RELEASE,DEPLOY,OPERATE,MONITOR ops;
```

---

## 2. MLOps Lifecycle (Continuous Training & Model Operations)

MLOps extends DevOps by managing the lifecycle of **Code**, **Data**, and **Machine Learning Models**. It introduces Continuous Training (CT) alongside continuous deployment and drift detection.

```mermaid
flowchart TD
    %% MLOps Pipeline
    subgraph DataPipeline ["1. Data Engineering"]
        RAW["Raw Data Ingestion"] --> VAL_DATA["Data Validation & Cleaning"]
        VAL_DATA --> FEAT["Feature Store / Transformations"]
    end

    subgraph ModelPipeline ["2. Model Engineering"]
        FEAT --> EXP["Experimentation & Notebooks"]
        EXP --> TRAIN["Distributed Training"]
        TRAIN --> EVAL["Model Evaluation & Benchmarking"]
        EVAL --> REGISTRY["Model Registry (Artifacts, Metadata, Lineage)"]
    end

    subgraph ServingPipeline ["3. Deployment & Inference"]
        REGISTRY --> PACK["Packaging (Docker / ONNX / TorchServe)"]
        PACK --> DEPLOY["Inference Service (Real-time API / Batch)"]
        DEPLOY --> PREDICTIONS["Predictions & Downstream Systems"]
    end

    subgraph Observability ["4. Monitoring & Feedback Loop"]
        PREDICTIONS -.-> LOG["Inference Logs & Telemetry"]
        LOG --> DRIFT["Drift Detection (Data & Concept Drift)"]
        LOG --> PERF["Model Performance Degradation"]
        DRIFT -->|"Trigger Retraining (CT)"| TRAIN
        PERF -->|"Trigger Data Labeling"| RAW
    end

    classDef data fill:#1e293b,stroke:#fbbf24,stroke-width:2px,color:#fff;
    classDef model fill:#1e293b,stroke:#a855f7,stroke-width:2px,color:#fff;
    classDef serve fill:#1e293b,stroke:#38bdf8,stroke-width:2px,color:#fff;
    classDef obs fill:#1e293b,stroke:#f87171,stroke-width:2px,color:#fff;

    class RAW,VAL_DATA,FEAT data;
    class EXP,TRAIN,EVAL,REGISTRY model;
    class PACK,DEPLOY,PREDICTIONS serve;
    class LOG,DRIFT,PERF obs;
```

---

## 3. Integrated Architecture: DevOps & MLOps Convergence

This diagram illustrates how traditional **DevOps** (application code and infrastructure) and **MLOps** (data, experiments, and model pipelines) converge within a production ecosystem.

```mermaid
flowchart TD
    subgraph DevOps ["DevOps Stream (Code & Infra)"]
        SRC["Application & Pipeline Source Code"] --> CI_CODE["CI: Lint, Unit Test, Build Images"]
        CI_CODE --> CD_INFRA["CD: Infrastructure as Code (Terraform / Helm)"]
    end

    subgraph MLOps ["MLOps Stream (Data & Model)"]
        DATA["Raw Data Sources"] --> DATA_PIPE["Data Pipeline & Features"]
        DATA_PIPE --> CT["CT: Continuous Model Training & HPO"]
        CT --> EVAL_GATE{"Model Quality Gate Passed?"}
        EVAL_GATE -->|No| CT
        EVAL_GATE -->|Yes| REG["Versioned Model Registry"]
    end

    CD_INFRA --> CLUSTER["Kubernetes / Production Serving Cluster"]
    REG --> CLUSTER

    subgraph ProdSystem ["Production & Observability"]
        CLUSTER --> MON_INFRA["System Health (CPU, RAM, Latency)"]
        CLUSTER --> MON_ML["ML Health (Concept Drift, Accuracy Drop)"]
    end

    MON_INFRA -->|Feedback / Fixes| SRC
    MON_ML -->|Trigger Automated Retraining| CT

    classDef devops fill:#0f172a,stroke:#38bdf8,stroke-width:2px,color:#fff;
    classDef mlops fill:#0f172a,stroke:#c084fc,stroke-width:2px,color:#fff;
    classDef prod fill:#0f172a,stroke:#34d399,stroke-width:2px,color:#fff;

    class SRC,CI_CODE,CD_INFRA devops;
    class DATA,DATA_PIPE,CT,EVAL_GATE,REG mlops;
    class CLUSTER,MON_INFRA,MON_ML prod;
```

---

## 4. Key Comparative Summary

| Dimension | DevOps | MLOps |
|---|---|---|
| **Core Artifact** | Code, Binaries, Container Images | Code + Data + Machine Learning Models |
| **Pipeline Types** | CI (Continuous Integration), CD (Continuous Deployment) | CI, CD, and **CT (Continuous Training)** |
| **Versioning** | Git commits, SemVer tags | Code commits + Data snapshots + Model weights & hyperparameters |
| **Testing** | Unit tests, Integration tests, Regression tests | Data validation, Model validation, Fairness/bias tests, Code tests |
| **Primary Monitoring Focus** | Latency, throughput, errors, CPU/memory | Data drift, concept drift, feature skew, model performance decay |
