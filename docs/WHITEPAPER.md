# HormuzWatch: Strategic Intelligence Platform
**Whitepaper**
*Date: June 2026*

---

## 1. Executive Summary

HormuzWatch is a multi-domain intelligence and geospatial surveillance platform designed to provide real-time asset tracking, anomaly detection, and situational awareness across strategic maritime and geographic regions. As maritime chokepoints and global trade routes face increasing risks, HormuzWatch delivers an automated, high-performance solution for detecting deviations, identifying potential threats, and visualizing intelligence data in real time. 

Built on a robust, containerized architecture utilizing a high-concurrency Go backend and a modern React Router v7 frontend, the platform integrates continuous telemetry ingestion with a multi-factor anomaly scoring engine. This whitepaper outlines the architecture, core capabilities, technological foundations, and future roadmap of the HormuzWatch platform.

---

## 2. Introduction & Problem Statement

In an increasingly volatile geopolitical landscape, the monitoring of strategic chokepoints (such as the Strait of Hormuz) is critical for global supply chain stability and security operations. Traditional surveillance methods often suffer from fragmented data sources, high latency, and manual threat analysis, which can delay critical decision-making.

**The Challenge:**
- Inability to quickly synthesize massive amounts of high-frequency telemetry data.
- High latency between data ingestion and threat visualization.
- Manual evaluation of anomalous asset behaviors (e.g., course deviation, sudden speed drops).
- Lack of scalable architecture to integrate intelligence from multiple distinct domains (maritime, aviation, geopolitical).

**The Solution:**
HormuzWatch addresses these challenges by offering a low-latency, containerized intelligence platform that automatically ingests telemetry data, calculates risk scores using a multi-factor anomaly detection engine, and broadcasts intelligence to analysts via an interactive, real-time heatmap and dashboard.

---

## 3. Core Features & Capabilities

HormuzWatch is designed to empower analysts and operations teams with immediate insights:

- **Real-Time Asset Tracking:** High-frequency data ingestion and WebSocket broadcasting ensure that the frontend client updates every 2 seconds.
- **Multi-Factor Anomaly Detection:** An automated scoring engine evaluates behavior against established baselines, identifying:
  - Route and course deviations.
  - Stale telemetry (sensor spoofing or failure).
  - Unexplained speed drops.
  - Proximity to high-risk zones.
- **Dynamic Threat Heatmap:** A real-time grid visualization overlays aggregated anomaly hotspots directly onto an OpenStreetMap interface, enabling operators to instantly identify high-threat sectors.
- **Interactive Geospatial Dashboard:** Utilizing Leaflet, marker clustering, and severity-based color coding, the dashboard provides a seamless user experience, further enhanced by React Router v7 for persistent state management and deep-linking.
- **Dark Mode Support:** Built-in theme toggles optimize the interface for command-center environments.

---

## 4. System Architecture

The HormuzWatch architecture emphasizes separation of concerns, scalability, and real-time responsiveness. It is currently in Phase 2 of its deployment lifecycle (Containerized MVP).

### 4.1. Backend: High-Concurrency Go API
- **Framework:** Go 1.23 utilizing the Gin HTTP web framework.
- **Responsibilities:** 
  - REST API for telemetry ingestion and historical analysis.
  - A robust WebSocket hub to manage persistent, bidirectional communication with client applications.
  - Processing telemetry through the Anomaly Scoring Engine.
  - Aggregating data for the Heatmap generation.

### 4.2. Frontend: React 19 Client
- **Framework:** React 19, integrated with Vite and TypeScript.
- **Routing:** React Router v7 handles client-side routing across 7 distinct views (Dashboard, Analytics, Alerts, Health, Audit, Insights, Docs).
- **Responsibilities:**
  - Consuming the WebSocket stream to update the UI with minimal latency.
  - Rendering the `HormuzMap` component with geospatial data and interactive layers.
  - Managing URL-based state to ensure the platform remains robust during refreshes or direct link sharing.

### 4.3. Orchestration
- **Docker Compose:** Both backend and frontend are containerized using multi-stage Docker builds to ensure minimal footprint (Alpine-based) and environmental parity across development, testing, and production.
- **Network Isolation:** Services communicate over a dedicated local bridge network, ensuring secure, isolated execution.

---

## 5. Anomaly Detection Engine

At the core of HormuzWatch's intelligence capability is its Anomaly Scoring Engine. As telemetry data arrives via the REST API or WebSocket, the engine evaluates the data payload against several risk heuristics:

1. **Course Deviation:** Compares the asset's current heading against expected navigational corridors.
2. **Kinematic Anomalies:** Detects sudden deceleration or acceleration indicative of distress, boarding, or evasion.
3. **Signal Integrity:** Flags stale telemetry which may indicate AIS spoofing, jamming, or equipment failure.
4. **Geospatial Proximity:** Increases threat scores when assets enter known high-risk or exclusion zones.

Calculated scores (e.g., 0-100) are mapped to severity tiers (Low, Medium, High, Critical) and instantly broadcast to the frontend, updating the asset's badge and influencing the regional heatmap intensity.

---

## 6. Security & Compliance

Security is embedded into the HormuzWatch architecture, laying the groundwork for stringent enterprise and government deployments:

- **Authentication:** JWT middleware is implemented, structured for upcoming Azure Active Directory (Azure AD) JWKS integration.
- **Traffic Control:** Rate limiting (e.g., 120 requests/60 seconds per IP) protects APIs from abuse or DoS attacks.
- **Data Validation:** Strict Zod schema validations ensure data integrity and prevent injection vectors.
- **Cross-Origin Resource Sharing (CORS):** Enforced at the middleware level to restrict unauthorized domain access.

---

## 7. Roadmap & Future Vision

HormuzWatch is executing against a structured, 6-phase roadmap. Having successfully completed Phase 1 (Foundation) and Phase 2 (Containerization), the platform is preparing for enterprise-scale integration.

### Phase 3: Production Infrastructure
- Migration to Azure via Terraform.
- Integration of real-world data feeds: AISStream (Maritime), OpenSky (Aviation), and NASA FIRMS (Thermal).
- Ingestion pipeline utilizing Azure Event Hubs and Azure Functions for massive scale.

### Phase 4: Advanced Intelligence
- Geopolitical intelligence enrichment via the GDELT database.
- Integration with Azure OpenAI for natural language querying of anomaly reports and predictive insights.

### Phase 5: Predictive Analytics
- Machine learning models for historical route analysis and predictive deviation detection.
- Generation of automated daily risk index reports for strategic regions.

### Phase 6: Enterprise Polish
- Comprehensive Security Audits.
- FinOps validation for cost-optimized cloud scaling.
- Extensive test coverage and Architectural Decision Records (ADR).

---

## 8. Conclusion

HormuzWatch represents a next-generation approach to strategic maritime and geospatial surveillance. By combining a highly concurrent Go backend, a responsive modern React frontend, and a scalable containerized architecture, it transforms raw telemetry into actionable, real-time intelligence. As the platform evolves toward cloud-native integration and advanced AI-driven analytics, it stands poised to become an essential tool for operations centers tasked with monitoring global strategic chokepoints.
