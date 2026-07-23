# Study Notes — Index

> Textbook-style study material for the HormuzWatch ML/AI and backend subsystems, plus the curated
> website content. Written to be read **alongside the source code** — every claim links to a file.
> These notes support the MVP editorial publication and the contributor onboarding path.

## How to use
1. Start with the module matching your task.
2. Open the cited source file and read it next to the notes.
3. Answer the "Study questions" at the end of each module to check understanding.

## Modules

| # | Module | What it covers | Primary sources |
|---|--------|----------------|-----------------|
| [01](./01-ml-ai-foundations.md) | ML/AI Foundations | Anomaly detection, Isolation Forest, LOF, ensemble, isotonic calibration, SHAP, feature engineering, training lifecycle | `ml-service/lib/*`, `ml-service/model.py`, `ml-service/api/train.py` |
| [02](./02-backend-pipeline.md) | Backend & Intelligence Pipeline | Per-track pipeline, `anomaly.Score` formula, `ComputeComposite` (0.4/0.4/0.2), features, geofence, workers, API surface, storage | `server/internal/anomaly/*`, `server/internal/intelligence/*`, `server/internal/integrations/*`, `server/cmd/main.go` |
| [03](./03-data-sources-geospatial.md) | Data Sources & Geospatial | Six feeds, AIS/ADSB deep dive, heatmaps, Haversine, geofence, regions, satellite/thermal | `server/internal/integrations/*`, `server/internal/heatmap/*`, `server/internal/geo/*`, `client-v2/src/app/routes/learn/*` |

## Companion documents
- [Website Content — Copy Bible](../website-content.md) — canonical editorial prose for Home/About/Learn + region profiles + disclaimer.
- Production whitepaper: `client-v2/src/app/routes/learn/*` (the published pages).
- Architecture analysis: `docs/new/00`–`12` (repo analysis, Tailwind diagnosis, ML/backend reviews, implementation plan, TODO).

## Cross-cutting themes (recurring across modules)
1. **Three feature schemas exist** and must be reconciled: legacy `model.py` (8-feat), `lib/features.py`
   domains (vessel/aviation/heatmap), and `intelligence.FeatureVector` (14-feat). See TODO m2.
2. **Scoring is fused server-side**: `Final = 0.4·Rule + 0.4·ML + 0.2·Geo`. The ML probability is one
   of three inputs, not the whole story.
3. **Explainability is partial**: SHAP covers the Isolation Forest only. State this honestly.
4. **Calibration needs labels**: without labelled incidents, the calibrator is a monotone rank
   transform, not a probability.
5. **Public API mismatch**: `client-v2` calls `/public/{history/attacks,zones/restricted,news,heatmap}`
   but the server registers them only under the auth group. Fix before relying on public pages (TODO m4/P8).

## Suggested reading order
- New to the project → Module 02 (backend pipeline) then Module 03 (data) then Module 01 (ML).
- ML contributor → Module 01 then Module 02 §2.4–2.5 (how ML plugs into the composite).
- Frontend contributor → `website-content.md` then Module 03 (regions/feeds) then `docs/new/13-frontend-coverage.md`.
