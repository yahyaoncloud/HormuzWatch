import time
import numpy as np
from fastapi.testclient import TestClient

from app import app
from lib.drift import (
    calculate_psi,
    calculate_ks_statistic,
    DriftMonitor,
    DomainDriftReport,
    FeatureDriftReport,
    global_drift_monitor,
)

client = TestClient(app)


def test_calculate_psi_identical():
    """Identical distributions should have near-zero PSI."""
    rng = np.random.default_rng(42)
    baseline = rng.normal(10.0, 2.0, size=1000)
    actual = rng.normal(10.0, 2.0, size=1000)
    psi = calculate_psi(baseline, actual)
    assert psi < 0.10, f"Expected low PSI for identical distributions, got {psi}"


def test_calculate_psi_shifted():
    """Shifted distributions should produce PSI >= 0.20."""
    rng = np.random.default_rng(42)
    baseline = rng.normal(10.0, 2.0, size=1000)
    actual = rng.normal(18.0, 3.0, size=1000)
    psi = calculate_psi(baseline, actual)
    assert psi >= 0.20, f"Expected PSI >= 0.20 for drifted distributions, got {psi}"


def test_calculate_ks_statistic():
    """KS statistic and p-value calculation."""
    rng = np.random.default_rng(42)
    base = rng.normal(0, 1, 500)
    act = rng.normal(5, 1, 500)
    stat, p_val = calculate_ks_statistic(base, act)
    assert stat > 0.5, f"Expected high KS statistic, got {stat}"
    assert p_val < 0.01, f"Expected low p-value for shifted distributions, got {p_val}"


def test_drift_monitor_event_driven_remediation():
    """Verify DriftMonitor records, detects drift, and triggers remediation with cooldown."""
    monitor = DriftMonitor(window_size=500, baseline_size=100, remediation_cooldown_seconds=10)
    
    rng = np.random.default_rng(42)
    baseline_matrix = rng.normal(10.0, 1.0, size=(200, 3))
    monitor.set_baseline("vessel", baseline_matrix)

    callbacks_received = []

    def _drift_cb(domain, payload):
        callbacks_received.append((domain, payload))

    monitor.register_remediation_callback(_drift_cb)

    # Feed drifted data
    drifted_samples = rng.normal(25.0, 5.0, size=(150, 3))
    for row in drifted_samples:
        monitor.record_observation("vessel", row)

    feature_names = ["feat1", "feat2", "feat3"]
    report: DomainDriftReport = monitor.evaluate_domain("vessel", feature_names)

    assert report.overall_status == "DRIFT_DETECTED"
    assert report.max_psi >= 0.20
    assert report.remediation_triggered is True

    # Check that callback received the alert
    time.sleep(0.1)
    assert len(callbacks_received) == 1
    assert callbacks_received[0][0] == "vessel"
    assert callbacks_received[0][1]["status"] == "DRIFT_DETECTED"

    # Immediate second evaluation should be throttled by cooldown
    report2: DomainDriftReport = monitor.evaluate_domain("vessel", feature_names)
    assert report2.remediation_triggered is False
    assert len(callbacks_received) == 1


def test_fastapi_drift_endpoints():
    """Verify FastAPI GET /drift/status, GET /drift/evaluate, and POST /drift/remediate."""
    # 1. GET /drift/status
    res = client.get("/drift/status")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ok"
    assert "vessel" in data["domains"]

    # 2. GET /drift/evaluate/vessel
    res_eval = client.get("/drift/evaluate/vessel")
    assert res_eval.status_code == 200
    eval_data = res_eval.json()
    assert "overall_status" in eval_data

    # 3. POST /drift/remediate/vessel
    res_rem = client.post("/drift/remediate/vessel")
    assert res_rem.status_code == 200
    rem_data = res_rem.json()
    assert rem_data["status"] == "REMEDIATION_ACCEPTED"
    assert rem_data["domain"] == "vessel"


if __name__ == "__main__":
    print("Running test_calculate_psi_identical...")
    test_calculate_psi_identical()
    print("Running test_calculate_psi_shifted...")
    test_calculate_psi_shifted()
    print("Running test_calculate_ks_statistic...")
    test_calculate_ks_statistic()
    print("Running test_drift_monitor_event_driven_remediation...")
    test_drift_monitor_event_driven_remediation()
    print("Running test_fastapi_drift_endpoints...")
    test_fastapi_drift_endpoints()
    print("All 5 drift tests passed successfully!")

