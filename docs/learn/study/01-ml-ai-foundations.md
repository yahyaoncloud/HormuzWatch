# Study Module 1 — Machine Learning & AI Foundations

> Textbook-style notes for the HormuzWatch ML/AI subsystem. Every formula and component is
> anchored to a file in `ml-service/` or `server/internal/`. This is the study companion to the
> production whitepaper (`client-v2/src/app/routes/learn/*`). Read alongside the source.

## 1.1 What problem does the ML solve?

Maritime and aviation tracks arrive as point telemetry (position, speed, heading, timings). Most
are normal. A small fraction are anomalous (dark periods, route deviation, loitering, rendezvous).
Supervised labels are scarce (only a handful of confirmed incidents), so the system leans on
**unsupervised anomaly detection** for discovery, then **calibration** to turn raw outlier-ness
into an interpretable probability, and **explainability** (SHAP) to justify each verdict.

> Source: `ml-service/app.py`, `ml-service/lib/scoring.py`, `ml-service/lib/ensemble.py`.

## 1.2 Anomaly detection intuition

An "anomaly" is an observation that is unlikely under the learned distribution of normal behavior.
Two complementary unsupervised lenses are used:

- **Global outliers** — points far from the bulk of all training data (Isolation Forest).
- **Local outliers** — points in a sparse neighborhood relative to local density (LOF).

Neither needs labels to train. Both output a score that is *not* a probability until calibrated.

## 1.3 Isolation Forest (IF)

**Idea.** Anomalies are "few and different," so they are isolated after very few random splits.
`IsolationForest` builds many random trees; the **path length** to isolate a point is short for
anomalies.

**Decision function.** For a point $x$,

$$
s_{\text{IF}}(x) = 2^{-\frac{\mathbb{E}[h(x)]}{c(n)}}
$$

where $h(x)$ is the average path length and $c(n)$ is the average path length of a failed search
in a tree of $n$ samples (a normalization constant). Roughly, $s_{\text{IF}} \in (0,1]$ with
values **toward 1 meaning more normal**. `sklearn` instead exposes `decision_function` whose
**negative** values indicate anomalies.

> Source: `ml-service/lib/isolation_forest.py` (`model.py` legacy uses `decision_function` directly);
> `ml-service/api/train.py` fits `IsolationForest(n_estimators=200, contamination=0.05, random_state=42)`.

**Honest limitation.** IF assumes anomalies are globally rare and separable. Novel attack patterns
that resemble normal traffic in feature space will not be isolated. It also has no temporal memory.

## 1.4 Local Outlier Factor (LOF)

**Idea.** Compare the local reachability density (LRD) of a point to that of its $k$ neighbors.
A point in a much sparser region than its neighbors is an outlier.

$$
\text{LOF}_k(x) = \frac{1}{|N_k(x)|}\sum_{o \in N_k(x)} \frac{\text{LRD}_k(o)}{\text{LRD}_k(x)}
$$

$\text{LOF} \approx 1$: similar density to neighbors (normal). $\text{LOF} \gg 1$: sparser than
neighbors (anomaly). `novelty=True` is used so the fitted model can score new points.

> Source: `ml-service/api/train.py` (`LocalOutlierFactor(n_neighbors=20, novelty=True)`);
> `ml-service/lib/lof.py`.

**When LOF beats IF.** LOF catches *local* structure IF misses — e.g., a vessel behaving oddly
only relative to others in the same congested strait.

## 1.5 Blending IF and LOF

Raw outlier scores are normalized to $[0,1]$ via a sigmoid squeeze, then averaged:

$$
\hat p_{\text{iso}} = \sigma\!\left(-\frac{\text{decision\_function}_{\text{IF}}(x)}{s_{\text{iso}}}\right),
\qquad
\hat p_{\text{lof}} = \sigma\!\left(-\frac{\text{LOF}(x)}{s_{\text{lof}}}\right)
$$

$$
\hat p_{\text{ensemble}} = \tfrac12\big(\hat p_{\text{iso}} + \hat p_{\text{lof}}\big)
$$

where $\sigma(z)=1/(1+e^{-z})$ and the scale constants map typical score ranges into $[0,1]$.

> Source: `ml-service/lib/scoring.py` (`score()`), `ml-service/api/train.py` (`norm_if`, `norm_lof`).

## 1.6 Calibration — from score to probability

Raw ensemble scores are **not** calibrated probabilities. An **isotonic regression** monotonic
transform maps them to $[0,1]$:

$$
\tilde p = C\big(\hat p_{\text{ensemble}}\big), \qquad C = \text{IsotonicRegression}
$$

- **With labels:** fit $C$ on `(ensemble_score, label)` pairs. This yields *statistically
  calibrated* probabilities (AUC-ROC reported via `sklearn.metrics`).
- **Without labels (default):** a **sigmoid fallback** calibrator fits isotonic on a pseudo-label
  derived from the score itself. It is monotone but **NOT calibrated** — the code warns loudly
  about this. Treat such outputs as rank scores, not probabilities.

> Source: `ml-service/lib/calibration.py`, `ml-service/api/train.py` (`_sigmoid_calibrator`,
> `_evaluate`). This matches the documented composite in `docs/new/08-ml-review.md`.

**Final ML score (0–100):**

$$
\text{MLScore} = \mathrm{round}\big(100 \cdot (\,0.6\,\tilde p_{\text{iso}} + 0.4\,\tilde p_{\text{lof}}\,\big)\big)
$$

> Source: `ml-service/lib/ensemble.py` (`composite = iso_calibrated*0.6 + lof_calibrated*0.4`).

## 1.7 Explainability with SHAP

For the legacy Isolation Forest, `shap.TreeExplainer` attributes the prediction to features:

$$
\phi_j = \text{SHAP}_j(x), \qquad \sum_j \phi_j \approx \hat p_{\text{iso}} - \mathbb{E}[\hat p_{\text{iso}}]
$$

Features are ranked by $|\phi_j|$; negative $\phi_j$ push toward "anomalous", positive toward
"normal". The top features are returned as the human-readable explanation.

> Source: `ml-service/model.py` (`predict(explain=True)`), `ml-service/lib/shap_explainer.py`.

**Scope limitation (state this honestly in the publication):** SHAP is computed **only for the
Isolation Forest** model. The LOF contributor and the ensemble weights are not individually
explained. The composite score is a weighted blend, not a single interpretable model.

## 1.8 Feature engineering (the contract with the backend)

The backend must send exactly these keys per domain. Mismatch ⇒ silent scoring failure.

| Domain | Features (from `ml-service/lib/features.py`) |
|--------|----------------------------------------------|
| vessel | `speed, ais_age_minutes, course_delta, hot_zone_distance_nm, restricted_zone, historical_attack_proximity, speed_outlier, near_ports, dark` (9) |
| aviation | `altitude, speed, heading_change, course_deviation, signal_loss, restricted_zone, proximity_to_vessel_activity, unusual_pattern, ground_risk` (9) |
| heatmap | `intensity, density, proximity_to_conflict, trend` (4) |

> Note: the **legacy** `model.py` uses a different 8-feature schema
> (`course_delta, heading_delta, speed_delta, average_speed, speed_variance, ais_gap_minutes,
> dist_restricted_zone, dist_historical_site`). Reconciling these two schemas is an open task
> (see `TODO.md` → ML m2).

## 1.9 Training & lifecycle

- `python api/train.py --domain vessel --input data/vessel_tracks.csv [--labels data/vessel_labels.csv]`
  produces `models/{domain}_ensemble.joblib`.
- `FeatureStore` accumulates features in memory; **lost on restart** unless persisted (TODO m1/m9).
- Models are versioned; the Go backend calls whichever `/api/predict` is configured — the model
  artifact can be swapped without a backend redeploy.

> Source: `ml-service/api/train.py`, `ml-service/app.py` (`/train`, `/retrain`, `/rebuild`).

## 1.10 Study questions

1. Why is unsupervised detection preferred over supervised here? What is the cost?
2. Show that $\hat p_{\text{iso}}$ increases as `decision_function` becomes more negative.
3. Why is the sigmoid-fallback calibrator *not* a probability? When would you trust it?
4. If SHAP explains only the IF component, what can you NOT explain about the final score?
5. Design a feature that would help LOF catch a "rendezvous" pattern (two vessels station-keeping).

## 1.11 Source map

| Concept | File |
|---------|------|
| IF model + SHAP | `ml-service/model.py`, `ml-service/lib/isolation_forest.py`, `ml-service/lib/shap_explainer.py` |
| LOF | `ml-service/lib/lof.py` |
| Ensemble + calibration | `ml-service/lib/ensemble.py`, `ml-service/lib/calibration.py`, `ml-service/lib/scoring.py` |
| Features | `ml-service/lib/features.py` |
| Training | `ml-service/api/train.py` |
| API | `ml-service/app.py` |
