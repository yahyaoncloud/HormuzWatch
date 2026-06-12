# Interview Preparation Guide: HormuzWatch

This document distills the HormuzWatch project into key talking points, architectural decisions, and challenges overcome. Use this to prepare for system design and software engineering interviews.

## 1. The "Elevator Pitch" (60 Seconds)

> "I built HormuzWatch, a full-stack geospatial intelligence platform that tracks maritime anomalies in the Strait of Hormuz in real-time. The core system is a Golang backend that ingests thousands of live ship coordinates via WebSockets, processes them against historical anomaly data, and streams the results to a React WebGL frontend.
> 
> To manage costs, I engineered a dual-environment pipeline: a free, always-on Open Source MVP using Vercel and Supabase, and a scalable Production Azure environment deployed via Terraform and Ansible. To orchestrate this, I built a custom Android app in Kotlin that allows me to single-click deploy and destroy the Azure infrastructure on demand, complete with a live observability dashboard powered by Prometheus and Loki."

## 2. Key Architectural Decisions (The "Why")

Interviewers love asking *why* you chose a specific technology. Here is your defense:

**Why Golang for the Backend?**
*Answer:* Concurrency and memory efficiency. Handling thousands of inbound AIS ship coordinates per second and broadcasting them to dozens of connected WebSocket clients would choke Node.js (single-threaded). Go's lightweight goroutines and channels made real-time stream aggregation highly performant.

**Why PostGIS (Postgres) over MongoDB?**
*Answer:* Maritime tracking is inherently spatial. We needed to perform rapid boundary-box queries (e.g., "Find all ships currently inside this specific polygon of the Strait of Hormuz"). PostGIS offers deeply optimized `GIST` indexing for spatial data which NoSQL databases struggle to match efficiently.

**Why the Android App for Deployment?**
*Answer:* Cost control and accessibility. Azure VMs and Gateways cost money by the hour. I wanted a way to tear down the entire cloud architecture when I wasn't actively testing it. Binding Terraform `apply` and `destroy` scripts to GitHub Actions, and triggering those actions via a secured Android app, allowed me to manage cloud costs from my pocket.

## 3. Challenges & Roadblocks Overcome

**Challenge: Gradle Memory Exhaustion (Android Build)**
*Situation:* The Android app kept failing to build in CI/CD and locally with "GC Overhead Limit Exceeded."
*Solution:* Diagnosed the JVM garbage collector thrashing. Adjusted the `gradle.properties` to increase the Max Heap Size (`-Xmx2048m`) which immediately stabilized the build pipeline.

**Challenge: Safely Toggling the Login Screen**
*Situation:* During intense testing phases, logging in repeatedly through Firebase SSO slowed down development velocity.
*Solution:* Engineered an architectural bypass in the Kotlin `MainActivity` that forced the authentication state to `true` locally without committing the change to the production branch, preserving security while maximizing dev speed.

**Challenge: Managing Secrets Across Cloud and MVP**
*Situation:* We had two separate pipelines (MVP and Azure) needing different levels of secret security.
*Solution:* Implemented a tiered strategy. MVP used zero-cost Vercel/Render injected environment variables. Production utilized GitHub Actions Secrets which securely passed variables into the Azure Virtual Machine at boot time, keeping sensitive keys out of the source code.

## 4. Closing Thoughts for the Interview
When discussing HormuzWatch, focus on **Scale, Cost-Engineering, and Automation**. You didn't just build a web app; you built an *entire automated cloud ecosystem* with real-time data ingestion. Emphasize that you treated infrastructure as code (IaC) and observability as first-class citizens.
