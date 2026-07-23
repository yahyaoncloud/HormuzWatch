# ML execution and refinement plan

## Implemented execution baseline

- The Go backend now targets the gRPC listener through `ML_SERVICE_ADDR`.
  `ML_SERVICE_URL` remains only as a backwards-compatible HTTP diagnostic
  address.
- The ML container serves gRPC on port `8090` and FastAPI internally on port
  `8000`. The Docker health check validates the gRPC listener.
- Automatic in-process training is disabled by default. The present Train RPC
  acknowledges requests but does not fit or publish a model, so treating that
  response as a successful training run is unsafe.
- New ensemble artifacts persist robust per-model score bounds and basic
  training metadata. Old artifacts remain loadable with the legacy bounds.

## Next delivery sequence

### 1. Durable data and labels

Create a versioned feature table containing the raw source, feature-schema
version, track/MMSI, timestamp, region, model version, and analyst outcome.
Use immutable training snapshots. Do not train from the in-memory active-track
state.

Capture labels separately from model scores:

- confirmed incident / escalation;
- analyst dismissal or benign activity;
- delayed outcome and label timestamp.

### 2. Honest evaluation and promotion

Use time-forward, group-aware splits by track/MMSI and incident, never random
row splits. Calibrate on a distinct validation period and keep a final unseen
test period for promotion.

Promotion requires, at minimum:

- precision-recall AUC and recall at the available alert-review budget;
- false alerts per vessel-hour;
- Brier score / expected calibration error;
- detection lead time for confirmed events;
- no material regression against the production model in shadow mode.

Artifacts should contain a content hash, source snapshot ID, feature schema,
metrics, calibration status, and parent model version. Promote atomically and
support rollback.

### 3. Model roadmap

Start with stronger interpretable baselines before neural sequence models:

1. Per-vessel and route-segment rolling baselines, AIS-gap patterns, loitering,
   route deviation, speed-heading consistency, and source-quality features.
2. Change-point detectors (CUSUM/EWMA) combined with the existing IF/LOF
   ensemble.
3. A supervised XGBoost classifier after enough analyst feedback is available;
   retain the unsupervised ensemble as a novel-behaviour signal.
4. For conflict forecasting, train labels such as “region escalates in the next
   6/12/24 hours.” Current severity must not be used as a future-escalation
   target.
5. Add temporal CNN/GRU/Transformer trajectory models only after the dataset
   contains reliable, sufficiently long sequences.

### 4. Parallelism and operations

Feature-snapshot creation runs once. Independent vessel, aviation, heatmap,
and conflict training jobs may then run in parallel with explicit CPU and
memory limits. Do not run several `n_jobs=-1` estimators simultaneously;
assign a core budget per job and cap BLAS/XGBoost threads.

Online inference stays lightweight. Run SHAP only for selected alerts or
asynchronously. Monitor input drift (PSI/KS), score drift, latency, error rate,
labelled precision, and calibration. Use shadow evaluation before canary
promotion.
