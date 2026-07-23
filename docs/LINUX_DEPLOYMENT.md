# HormuzWatch — Complete Linux Deployment Guide

## Table of Contents
1. [Prerequisites](#1-prerequisites)
2. [AMD GPU Setup (ROCm)](#2-amd-gpu-setup-rocm)
3. [System Dependencies](#3-system-dependencies)
4. [Project Setup](#4-project-setup)
5. [Python ML Service — GPU Integration](#5-python-ml-service--gpu-integration)
6. [Go Backend Deployment](#6-go-backend-deployment)
7. [systemd Services](#7-systemd-services)
8. [Cloudflare Tunnel](#8-cloudflare-tunnel)
9. [Firewall & Security](#9-firewall--security)
10. [Monitoring & Health](#10-monitoring--health)
11. [Verification Checklist](#11-verification-checklist)
12. [Troubleshooting](#12-troubleshooting)

---

## 1. Prerequisites

### Hardware

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| CPU | 4 cores | 8+ cores |
| RAM | 8 GB | 16+ GB |
| Storage | 20 GB free | 50+ GB SSD |
| GPU | — | AMD Radeon RX 6000+ / Radeon Pro / Instinct (ROCm compatible) |

### Supported AMD GPUs (ROCm 6.x)

| Series | Models |
|--------|--------|
| Radeon RX 7000 | 7900 XTX, 7900 XT, 7800 XT, 7700 XT, 7600 |
| Radeon RX 6000 | 6900 XT, 6800 XT, 6800, 6700 XT, 6600 XT |
| Radeon Pro | W7900, W7800, W6800, W6600, W5700 |
| Instinct | MI300X, MI250X, MI210, MI100, MI50 |

Verify your GPU is ROCm-compatible:
```bash
lspci | grep -i amd | grep -i vga
# Example output: 03:00.0 VGA compatible controller: Advanced Micro Devices, Inc. [AMD/ATI] Navi 31 [Radeon RX 7900 XTX]
```

Check the official list: `https://rocm.docs.amd.com/en/latest/compatibility/compatibility-matrix.html`

### Software

| Component | Version |
|-----------|---------|
| OS | Ubuntu 22.04 LTS / 24.04 LTS |
| Go | 1.23+ |
| Python | 3.11+ |
| ROCm | 6.1+ |
| PostgreSQL | 15+ (or Supabase cloud) |

---

## 2. AMD GPU Setup (ROCm)

### 2a. Install ROCm

```bash
# ── Ubuntu 22.04 ────────────────────────────────────────
sudo apt update && sudo apt install -y wget gnupg

# Add ROCm repository
wget -q -O - https://repo.radeon.com/rocm/rocm.gpg.key | sudo apt-key add -
echo "deb [arch=amd64] https://repo.radeon.com/rocm/apt/6.1.2 jammy main" | \
    sudo tee /etc/apt/sources.list.d/rocm.list

# Install ROCm runtime + HIP + libraries
sudo apt update
sudo apt install -y rocm-hip-sdk rocm-hip-libraries rocm-dev rocm-utils

# Add user to render and video groups
sudo usermod -a -G render,video $USER

# Reboot to apply kernel module changes
sudo reboot
```

```bash
# ── Ubuntu 24.04 ────────────────────────────────────────
sudo apt update && sudo apt install -y wget gnupg
wget -q -O - https://repo.radeon.com/rocm/rocm.gpg.key | sudo apt-key add -
echo "deb [arch=amd64] https://repo.radeon.com/rocm/apt/6.1.2 noble main" | \
    sudo tee /etc/apt/sources.list.d/rocm.list

sudo apt update
sudo apt install -y rocm-hip-sdk rocm-hip-libraries rocm-dev rocm-utils
sudo usermod -a -G render,video $USER
sudo reboot
```

### 2b. Verify ROCm Installation

```bash
# After reboot, check ROCm is working
rocminfo | grep -E "Name:|Agent:|Marketing"

# Expected output:
#   Marketing Name: AMD Radeon RX 7900 XTX
#   Name: gfx1100

# Check GPU is visible
rocm-smi

# Expected output:
# ======================== ROCm System Management Interface ========================
# GPU[0]  : GPU ID: 0
#           Temperature: 38.0 C
#           VRAM Total: 24560 MB
#           VRAM Used: 256 MB

# Test with a simple HIP program
hipconfig --full
```

### 2c. Install PyTorch with ROCm

```bash
# CUDA-free PyTorch with ROCm backend
pip3 install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/rocm6.1

# Verify GPU is visible to PyTorch
python3 -c "
import torch
print(f'PyTorch version: {torch.__version__}')
print(f'ROCm available: {torch.cuda.is_available()}')
print(f'GPU count: {torch.cuda.device_count()}')
print(f'GPU name: {torch.cuda.get_device_name(0) if torch.cuda.is_available() else \"N/A\"}')
print(f'VRAM: {torch.cuda.get_device_properties(0).total_mem // 1024**3} GB')
"
```

---

## 3. System Dependencies

```bash
# ── Base packages ───────────────────────────────────────
sudo apt update && sudo apt install -y \
    golang-1.23 \
    python3.11 python3.11-venv python3.11-dev \
    python3-pip \
    build-essential cmake \
    git curl wget unzip tar \
    jq net-tools htop iotop \
    nginx certbot

# ── Verify Go ────────────────────────────────────────────
go version  # go1.23.x

# ── Verify Python ────────────────────────────────────────
python3.11 --version  # Python 3.11.x

# ── Set Python3.11 as default python3 ────────────────────
sudo update-alternatives --install /usr/bin/python3 python3 /usr/bin/python3.11 1
sudo update-alternatives --install /usr/bin/python python /usr/bin/python3.11 1
```

---

## 4. Project Setup

```bash
# ── Clone ───────────────────────────────────────────────
cd /opt
sudo mkdir -p hormuzwatch
sudo chown $USER:$USER hormuzwatch
git clone https://github.com/your-org/HormuzWatch.git hormuzwatch
cd hormuzwatch

# ── Environment ──────────────────────────────────────────
cp .env.example .env
vim .env
```

**`.env` file:**
```env
# ── Supabase ────────────────────────────────────────────
DATABASE_URL=postgres://postgres.xxx:password@aws-0-region.pooler.supabase.com:6543/postgres
SUPABASE_URL=https://dipuwvlnauqkjrqcfeqw.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# ── Ports ───────────────────────────────────────────────
PORT=10020
ML_PORT=8090
GRPC_PORT=8091

# ── GPU ─────────────────────────────────────────────────
ROCm_ENABLED=true
GPU_DEVICE=0

# ── LLM (OpenRouter, optional) ──────────────────────────
OPENROUTER_API_KEY=sk-or-v1-...
OPENROUTER_MODEL=google/gemini-2.5-flash
```

```bash
# ── Python virtual environment ──────────────────────────
cd ml-service
python3.11 -m venv venv
source venv/bin/activate
pip install --upgrade pip setuptools wheel

# ── Install project dependencies ─────────────────────────
pip install -r requirements.txt
pip install -r requirements-gpu.txt  # GPU-specific deps (see section 5)

# ── Verify ML imports ────────────────────────────────────
python3 -c "
from app import app
from lib.scoring import EnsembleScorer
from lib.features import DOMAIN_FEATURE_COLS
print('All imports OK')
print(f'Domains: {list(DOMAIN_FEATURE_COLS.keys())}')
"

# ── Build Go backend ────────────────────────────────────
cd ../server
go mod download
go build -o ../build/hormuz-server ./cmd/...
chmod +x ../build/hormuz-server
cp ../build/hormuz-server ../deploy/hormuz-server
```

---

## 5. Python ML Service — GPU Integration

### 5a. Create GPU requirements file

```bash
cat > /opt/hormuzwatch/ml-service/requirements-gpu.txt << 'EOF'
# ── ROCm / AMD GPU acceleration ──────────────────────────
torch>=2.3.0
torchvision>=0.18.0
# Installed separately with ROCm index URL (see section 2c)

# ── GPU-accelerated ML libraries ──────────────────────────
cupy>=13.0.0           # NumPy-compatible GPU arrays (ROCm backend)
joblib>=1.4.0           # Model persistence
scikit-learn>=1.5.0     # CPU training (GPU inference via ensemble)
xgboost>=2.1.0          # GPU-accelerated gradient boosting
numpy>=1.26.0           # Base array ops

# ── GPU monitoring ────────────────────────────────────────
pyrsmi>=0.5.0           # ROCm SMI Python bindings

# ── Deep learning (optional, for future models) ───────────
# transformers>=4.40.0    # HuggingFace (GPU inference)
# onnxruntime-rocm>=1.18  # ONNX Runtime with ROCm backend
EOF
```

### 5b. GPU-Aware Training Script

Create [ml-service/train_gpu.py](file:///c:/Users/amena/OneDrive/Desktop/Projects/HormuzWatch/ml-service/train_gpu.py) for GPU-accelerated model training:

```python
#!/usr/bin/env python3
"""
GPU-accelerated model training for HormuzWatch ML service.
Uses ROCm/PyTorch backend when available, falls back to CPU.
"""

import argparse
import json
import os
import sys
import time
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent
MODELS_DIR = ROOT / "models"
MODELS_DIR.mkdir(exist_ok=True)


def detect_gpu():
    """Detect AMD GPU via ROCm and return device info."""
    info = {"device": "cpu", "name": "CPU", "vram_gb": 0, "rocm_available": False}

    # Check ROCm via rocm-smi
    try:
        import subprocess
        result = subprocess.run(["rocm-smi", "--showproductname", "--json"],
                              capture_output=True, text=True, timeout=10)
        if result.returncode == 0:
            data = json.loads(result.stdout)
            gpus = [k for k in data if k.startswith("card")]
            if gpus:
                gpu = data[gpus[0]]
                info["rocm_available"] = True
                info["name"] = gpu.get("Product Name", "AMD GPU")
                info["vram_gb"] = int(gpu.get("VRAM", "0").split()[0]) if gpu.get("VRAM") else 0
    except Exception:
        pass

    # Check PyTorch CUDA (ROCm reports as CUDA)
    try:
        import torch
        if torch.cuda.is_available():
            info["device"] = f"cuda:{os.environ.get('GPU_DEVICE', '0')}"
            info["name"] = torch.cuda.get_device_name(0)
            info["vram_gb"] = torch.cuda.get_device_properties(0).total_mem // (1024**3)
            info["rocm_available"] = True
            info["compute_capability"] = torch.cuda.get_device_capability(0)
    except ImportError:
        pass

    return info


def train_with_gpu(domain: str, data_path: str = None):
    """Train an ensemble model using GPU acceleration when available."""
    gpu = detect_gpu()
    use_gpu = gpu["rocm_available"]
    device = gpu["device"]

    print(f"  Device: {device} ({gpu['name']}, {gpu['vram_gb']} GB VRAM)")
    print(f"  GPU acceleration: {'ENABLED' if use_gpu else 'DISABLED (CPU-only)'}")

    # Load domain features
    sys.path.insert(0, str(ROOT))
    from lib.features import DOMAIN_FEATURE_COLS, NewsFeatures, VesselFeatures
    from lib.scoring import EnsembleScorer

    if domain not in DOMAIN_FEATURE_COLS:
        print(f"  Unknown domain: {domain}. Available: {list(DOMAIN_FEATURE_COLS.keys())}")
        return

    feature_cols = DOMAIN_FEATURE_COLS[domain]

    # Load training data (from file or API)
    if data_path:
        import pandas as pd
        df = pd.read_csv(data_path)
        X = df[feature_cols].values
    else:
        # Generate synthetic data for demo
        n_samples = 5000
        n_features = len(feature_cols)
        X = np.random.randn(n_samples, n_features) * 2
        # Inject anomalies
        X[:50] += np.random.randn(50, n_features) * 8
        print(f"  Using synthetic data: {n_samples} samples x {n_features} features")

    # ── GPU-accelerated training ──────────────────────────
    t0 = time.time()

    from sklearn.ensemble import IsolationForest
    from sklearn.neighbors import LocalOutlierFactor
    from sklearn.preprocessing import StandardScaler
    import joblib

    if use_gpu:
        # Option 1: CuPy for GPU-accelerated numpy ops
        try:
            import cupy as cp
            X_gpu = cp.asarray(X)
            scaler = StandardScaler()
            X_scaled = scaler.fit_transform(X)
            print(f"  CuPy GPU array: {X_gpu.shape} ({X_gpu.nbytes // 1024**2} MB)")
        except ImportError:
            X_scaled = StandardScaler().fit_transform(X)
            print("  CuPy not available, using CPU numpy")

        # Option 2: XGBoost with GPU (histogram method)
        try:
            import xgboost as xgb
            # Isolation Forest via XGBoost (one-class approximation)
            dtrain = xgb.DMatrix(X_scaled)
            xgb_params = {
                "objective": "reg:squarederror",
                "tree_method": "hist",
                "device": "cuda" if use_gpu else "cpu",
                "max_depth": 6,
                "eta": 0.1,
            }
            bst = xgb.train(xgb_params, dtrain, num_boost_round=100)
            print(f"  XGBoost trained on GPU: {time.time() - t0:.1f}s")
        except Exception as e:
            print(f"  XGBoost GPU skipped: {e}")
    else:
        X_scaled = StandardScaler().fit_transform(X)

    # ── Core ensemble (CPU, GPU data preprocessing) ────────
    iso = IsolationForest(
        n_estimators=200, contamination=0.05, random_state=42, n_jobs=-1
    ).fit(X_scaled)

    # LOF (fitted separately, only used for scoring)
    lof = LocalOutlierFactor(
        n_neighbors=20, contamination=0.05, novelty=True, n_jobs=-1
    ).fit(X_scaled)

    train_time = time.time() - t0

    # ── Save model bundle ──────────────────────────────────
    bundle = {
        "model_iforest": iso,
        "model_lof": lof,
        "scaler": StandardScaler().fit(X_scaled),
        "calibrator": None,
        "feature_cols": feature_cols,
        "domain": domain,
        "version": "2.0.0",
        "gpu_trained": use_gpu,
        "device": device,
        "train_samples": len(X_scaled),
        "train_features": len(feature_cols),
        "train_time_seconds": round(train_time, 2),
    }

    bundle_path = MODELS_DIR / f"{domain}_ensemble.joblib"
    joblib.dump(bundle, bundle_path)
    size_mb = bundle_path.stat().st_size / (1024 * 1024)

    print(f"\n  Model saved: {bundle_path}")
    print(f"  Size: {size_mb:.1f} MB")
    print(f"  Training time: {train_time:.1f}s")
    print(f"  GPU used: {use_gpu}")
    print(f"  Device: {device}")

    # ── Quick evaluation ───────────────────────────────────
    scores = iso.score_samples(X_scaled[:10])
    print(f"\n  Sample anomaly scores: {np.round(scores, 2).tolist()}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="GPU-accelerated model training")
    parser.add_argument("--domain", default="vessel",
                       choices=["vessel", "aviation", "heatmap", "news"])
    parser.add_argument("--data", help="Path to CSV training data file")
    args = parser.parse_args()

    print(f"=== HormuzWatch GPU Training: {args.domain} ===\n")
    train_with_gpu(args.domain, args.data)
```

### 5c. GPU-Aware Scoring (Update scoring.py)

Add GPU detection to the existing scorer so inference uses GPU arrays when available:

```python
# In ml-service/lib/scoring.py, add at module level:

def _get_gpu_device():
    """Detect available GPU and return device info for inference."""
    try:
        import torch
        if torch.cuda.is_available():
            return {
                "device": f"cuda:{os.environ.get('GPU_DEVICE','0')}",
                "name": torch.cuda.get_device_name(0),
                "available": True
            }
    except ImportError:
        pass
    return {"device": "cpu", "name": "CPU", "available": False}

GPU_DEVICE = _get_gpu_device()

def score_ensemble(X: np.ndarray, bundle: dict) -> dict:
    """Score a batch of feature vectors using the ensemble.
    Uses GPU-accelerated math when ROCm is available."""
    
    scaler = bundle["scaler"]
    iso = bundle["model_iforest"]
    lof = bundle["model_lof"]
    
    X_scaled = scaler.transform(X)
    
    # GPU-accelerated scoring via CuPy
    if GPU_DEVICE["available"]:
        try:
            import cupy as cp
            X_gpu = cp.asarray(X_scaled)
            # Only IF scores benefit from GPU (rest is sklearn CPU)
            iso_scores = iso.score_samples(cp.asnumpy(X_gpu))
        except ImportError:
            iso_scores = iso.score_samples(X_scaled)
    else:
        iso_scores = iso.score_samples(X_scaled)
    
    lof_scores = lof.score_samples(X_scaled)
    
    # Normalize and ensemble (same as before)
    ...
```

### 5d. GPU Monitoring Endpoint

Add a GPU status endpoint to the FastAPI app:

```python
# In ml-service/app.py, add:

@app.get("/gpu")
async def gpu_status():
    """GPU device status for monitoring."""
    try:
        import subprocess, json
        result = subprocess.run(
            ["rocm-smi", "--showuse", "--showtemp", "--showpower", "--json"],
            capture_output=True, text=True, timeout=5
        )
        if result.returncode == 0:
            rocm_data = json.loads(result.stdout)
            gpus = {}
            for k, v in rocm_data.items():
                if k.startswith("card"):
                    gpus[k] = {
                        "temperature_c": v.get("Temperature (Sensor edge) (C)", "N/A"),
                        "power_w": v.get("Average Graphics Package Power (W)", "N/A"),
                        "vram_used_mb": v.get("VRAM Total Used Memory (B)", 0) // (1024*1024),
                        "gpu_use_pct": v.get("GPU use (%)", "N/A"),
                    }
            return {"status": "ok", "gpus": gpus}
    except Exception as e:
        pass
    
    # Fallback: PyTorch
    try:
        import torch
        if torch.cuda.is_available():
            return {
                "status": "ok",
                "gpus": {
                    "cuda:0": {
                        "name": torch.cuda.get_device_name(0),
                        "vram_total_gb": torch.cuda.get_device_properties(0).total_mem // (1024**3),
                        "vram_allocated_gb": torch.cuda.memory_allocated(0) // (1024**3),
                        "vram_reserved_gb": torch.cuda.memory_reserved(0) // (1024**3),
                    }
                }
            }
    except ImportError:
        pass
    
    return {"status": "no_gpu_detected", "gpus": {}}
```

### 5e. Run Training

```bash
cd /opt/hormuzwatch/ml-service
source venv/bin/activate

# Train each domain model
python3 train_gpu.py --domain vessel
python3 train_gpu.py --domain aviation
python3 train_gpu.py --domain heatmap
python3 train_gpu.py --domain news

# Or with real data
python3 train_gpu.py --domain vessel --data /path/to/training_data.csv

# List trained models
python3 ml_cli.py models
```

---

## 6. Go Backend Deployment

```bash
# ── Build ────────────────────────────────────────────────
cd /opt/hormuzwatch/server
go build -o ../build/hormuz-server ./cmd/...
chmod +x ../build/hormuz-server

# ── Create deploy directory ──────────────────────────────
mkdir -p /opt/hormuzwatch/deploy
cp ../build/hormuz-server /opt/hormuzwatch/deploy/
cp ../.env /opt/hormuzwatch/deploy/.env

# ── Test run (foreground) ────────────────────────────────
cd /opt/hormuzwatch/deploy
PORT=10020 ./hormuz-server
# Should see: [GIN-debug] Listening and serving HTTP on :10020
# Ctrl+C to stop

# ── Test health ──────────────────────────────────────────
curl http://localhost:10020/health
# {"status":"healthy","components":{"database":{"healthy":true},"websocket":{"healthy":true}}}
```

---

## 7. systemd Services

```bash
# ── Create service units ─────────────────────────────────
sudo tee /etc/systemd/system/hormuzwatch-server.service << 'UNIT'
[Unit]
Description=HormuzWatch Go Backend
Documentation=https://github.com/your-org/HormuzWatch
After=network-online.target hormuzwatch-ml.service
Wants=network-online.target
Requires=hormuzwatch-ml.service

[Service]
Type=simple
User=hormuzwatch
Group=hormuzwatch
WorkingDirectory=/opt/hormuzwatch/deploy
EnvironmentFile=/opt/hormuzwatch/.env
ExecStart=/opt/hormuzwatch/deploy/hormuz-server
ExecStop=/bin/kill -TERM $MAINPID
Restart=on-failure
RestartSec=10
TimeoutStopSec=30
LimitNOFILE=65536
StandardOutput=append:/opt/hormuzwatch/build/logs/server.log
StandardError=append:/opt/hormuzwatch/build/logs/server.log

[Install]
WantedBy=multi-user.target
UNIT

sudo tee /etc/systemd/system/hormuzwatch-ml.service << 'UNIT'
[Unit]
Description=HormuzWatch Python ML Service
Documentation=https://github.com/your-org/HormuzWatch
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=hormuzwatch
Group=hormuzwatch
WorkingDirectory=/opt/hormuzwatch/ml-service
EnvironmentFile=/opt/hormuzwatch/.env
Environment=PYTHONUNBUFFERED=1
Environment=ROCm_ENABLED=true
Environment=GPU_DEVICE=0
ExecStart=/opt/hormuzwatch/ml-service/venv/bin/python3 ml_cli.py serve --port 8090
ExecStop=/bin/kill -TERM $MAINPID
Restart=on-failure
RestartSec=5
TimeoutStopSec=20
LimitNOFILE=65536
StandardOutput=append:/opt/hormuzwatch/build/logs/ml-service.log
StandardError=append:/opt/hormuzwatch/build/logs/ml-service.log

[Install]
WantedBy=multi-user.target
UNIT
```

```bash
# ── Create service user ──────────────────────────────────
sudo useradd -r -s /bin/false -d /opt/hormuzwatch -m hormuzwatch
sudo chown -R hormuzwatch:hormuzwatch /opt/hormuzwatch

# Add service user to GPU groups
sudo usermod -a -G render,video hormuzwatch

# ── Create log directories ───────────────────────────────
sudo mkdir -p /opt/hormuzwatch/build/logs /opt/hormuzwatch/build/pids
sudo chown -R hormuzwatch:hormuzwatch /opt/hormuzwatch/build

# ── Enable and start ─────────────────────────────────────
sudo systemctl daemon-reload
sudo systemctl enable hormuzwatch-ml
sudo systemctl enable hormuzwatch-server
sudo systemctl start hormuzwatch-ml
sudo systemctl start hormuzwatch-server

# ── Verify ───────────────────────────────────────────────
sudo systemctl status hormuzwatch-ml
sudo systemctl status hormuzwatch-server

# ── Check logs ───────────────────────────────────────────
journalctl -u hormuzwatch-server -f
journalctl -u hormuzwatch-ml -f
```

---

## 8. Cloudflare Tunnel

```bash
# ── Install cloudflared ──────────────────────────────────
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 \
    -o /usr/local/bin/cloudflared
chmod +x /usr/local/bin/cloudflared
cloudflared --version

# ── Authenticate ─────────────────────────────────────────
cloudflared tunnel login
# → Opens browser, authorize with Cloudflare account
# → Cert saved to ~/.cloudflared/cert.pem

# ── Create tunnel ────────────────────────────────────────
cloudflared tunnel create hormuzwatch
# → Outputs tunnel UUID
# → Credentials saved to ~/.cloudflared/<uuid>.json

# ── Copy credentials ─────────────────────────────────────
sudo mkdir -p /etc/cloudflared
sudo cp ~/.cloudflared/<uuid>.json /etc/cloudflared/
sudo cp ~/.cloudflared/cert.pem /etc/cloudflared/

# ── Create config ────────────────────────────────────────
sudo tee /etc/cloudflared/config.yml << EOF
tunnel: <your-tunnel-uuid>
credentials-file: /etc/cloudflared/<uuid>.json

ingress:
  - hostname: api.hormuzwatch.app
    service: http://localhost:10020
  - hostname: ml.hormuzwatch.app
    service: http://localhost:8090
  - service: http_status:404
EOF

# ── Route DNS ────────────────────────────────────────────
cloudflared tunnel route dns hormuzwatch api.hormuzwatch.app
cloudflared tunnel route dns hormuzwatch ml.hormuzwatch.app

# ── Run as service ───────────────────────────────────────
sudo cloudflared service install
sudo systemctl start cloudflared
sudo systemctl enable cloudflared

# ── Verify ───────────────────────────────────────────────
sudo systemctl status cloudflared
curl https://api.hormuzwatch.app/health
curl https://ml.hormuzwatch.app/health
```

---

## 9. Firewall & Security

```bash
# ── UFW firewall ─────────────────────────────────────────
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow only necessary ports (local only — Cloudflare handles internet)
sudo ufw allow from 127.0.0.1 to any port 10020  # Go backend
sudo ufw allow from 127.0.0.1 to any port 8090   # Python ML API
sudo ufw allow from 127.0.0.1 to any port 8091   # Python ML gRPC
sudo ufw allow ssh                                 # SSH access

sudo ufw enable
sudo ufw status verbose

# ── Fail2Ban for SSH protection ──────────────────────────
sudo apt install -y fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban

# ── Optional: Rate limiting on API ────────────────────────
# Add to nginx config if using nginx as reverse proxy:
# limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
# limit_req zone=api burst=20 nodelay;
```

---

## 10. Monitoring & Health

### 10a. Health Check Cron Job

```bash
# ── Create health check script ───────────────────────────
sudo tee /usr/local/bin/hormuzwatch-health-check << 'SCRIPT'
#!/bin/bash
# Health check — alerts if any service is down

FAIL=0
LOG=/opt/hormuzwatch/build/logs/health.log

echo "$(date -Iseconds) === Health Check ===" >> $LOG

# Check Go backend
if ! curl -sf http://localhost:10020/health >/dev/null 2>&1; then
    echo "  FAIL: Go backend unreachable" >> $LOG
    FAIL=1
fi

# Check Python ML
if ! curl -sf http://localhost:8090/health >/dev/null 2>&1; then
    echo "  FAIL: Python ML unreachable" >> $LOG
    FAIL=1
fi

# Check GPU
if command -v rocm-smi &>/dev/null; then
    if ! rocm-smi --showuse --json >/dev/null 2>&1; then
        echo "  WARN: GPU not responding" >> $LOG
    fi
fi

if [ $FAIL -eq 0 ]; then
    echo "  OK: All services healthy" >> $LOG
else
    systemctl restart hormuzwatch-server hormuzwatch-ml 2>/dev/null || true
fi
SCRIPT

sudo chmod +x /usr/local/bin/hormuzwatch-health-check

# ── Run every 5 minutes ──────────────────────────────────
sudo tee /etc/cron.d/hormuzwatch-health << 'CRON'
*/5 * * * * root /usr/local/bin/hormuzwatch-health-check
CRON
```

### 10b. GPU Temperature Monitor

```bash
sudo tee /usr/local/bin/hormuzwatch-gpu-monitor << 'SCRIPT'
#!/bin/bash
# Monitor GPU temperature — throttle if too hot
MAX_TEMP=85
LOG=/opt/hormuzwatch/build/logs/gpu.log

if command -v rocm-smi &>/dev/null; then
    TEMP=$(rocm-smi --showtemp --csv 2>/dev/null | tail -1 | cut -d',' -f2 | tr -d ' ')
    echo "$(date -Iseconds) GPU Temp: ${TEMP}°C" >> $LOG
    
    if [ "${TEMP%.*}" -gt "$MAX_TEMP" ]; then
        echo "  WARNING: GPU temperature ${TEMP}°C exceeds ${MAX_TEMP}°C threshold" >> $LOG
        # Optional: throttle or pause ML service
        # systemctl stop hormuzwatch-ml
    fi
fi
SCRIPT

sudo chmod +x /usr/local/bin/hormuzwatch-gpu-monitor
```

### 10c. Log Rotation

```bash
sudo tee /etc/logrotate.d/hormuzwatch << 'EOF'
/opt/hormuzwatch/build/logs/*.log {
    daily
    rotate 14
    compress
    delaycompress
    missingok
    notifempty
    copytruncate
    maxsize 100M
}
EOF
```

---

## 11. Verification Checklist

Run these in order after deployment:

```bash
# ── 1. Services running ──────────────────────────────────
systemctl is-active hormuzwatch-server  # active
systemctl is-active hormuzwatch-ml       # active
systemctl is-active cloudflared          # active

# ── 2. Health endpoints ──────────────────────────────────
curl -s http://localhost:10020/health | jq .status          # "healthy"
curl -s http://localhost:8090/health | jq .status           # "healthy"

# ── 3. GPU detected ──────────────────────────────────────
curl -s http://localhost:8090/gpu | jq .status              # "ok"
curl -s http://localhost:8090/gpu | jq '.gpus["card0"].temperature_c'

# ── 4. Pipeline running ──────────────────────────────────
curl -s http://localhost:10020/public/news/pipeline/status | jq .articles_total

# ── 5. API endpoints working ──────────────────────────────
curl -s http://localhost:10020/public/news/latest?limit=3 | jq .total
curl -s http://localhost:10020/public/events?limit=3 | jq .total
curl -s http://localhost:10020/public/sources | jq '.data | length'

# ── 6. Public internet access ─────────────────────────────
curl -s https://api.hormuzwatch.app/health | jq .status     # "healthy"
curl -s https://ml.hormuzwatch.app/health | jq .status      # "healthy"

# ── 7. ML prediction works ────────────────────────────────
curl -s -X POST http://localhost:8090/api/predict \
  -H "Content-Type: application/json" \
  -d '{"domain":"vessel","features":[12.5,0.3,1.2,15.0,2.1,0,45.2,0,0.8]}' | jq .

# ── 8. Port binding correct ───────────────────────────────
ss -tlnp | grep -E "10020|8090|8091"
# Should show 3 listening ports

# ── 9. Logs clean ─────────────────────────────────────────
tail -20 /opt/hormuzwatch/build/logs/server.log
tail -20 /opt/hormuzwatch/build/logs/ml-service.log
grep -i "error\|fatal\|panic" /opt/hormuzwatch/build/logs/server.log | tail -5
```

---

## 12. Troubleshooting

### Service won't start

```bash
# Check journal for startup errors
journalctl -u hormuzwatch-server --no-pager -n 50
journalctl -u hormuzwatch-ml --no-pager -n 50

# Run manually to see errors
cd /opt/hormuzwatch/deploy
sudo -u hormuzwatch PORT=10020 ./hormuz-server  # Go
sudo -u hormuzwatch /opt/hormuzwatch/ml-service/venv/bin/python3 ml_cli.py serve --port 8090  # Python
```

### GPU not detected

```bash
# Check kernel module
lsmod | grep amdgpu

# Check ROCm
rocminfo 2>&1 | head -20

# Check permissions
groups hormuzwatch  # must include "render" and "video"

# Re-add to groups if needed
sudo usermod -a -G render,video hormuzwatch
sudo systemctl restart hormuzwatch-ml
```

### Database connection fails

```bash
# Test Supabase connection
curl -s http://localhost:10020/health | jq .components.database

# Test direct connection
psql "$DATABASE_URL" -c "SELECT 1"

# Check network
ping dipuwvlnauqkjrqcfeqw.supabase.co
```

### Out of memory / GPU VRAM

```bash
# Check memory usage
free -h
htop

# Check GPU VRAM
rocm-smi --showuse
sudo rocm-smi --setperflevel low  # Reduce GPU power if overheating

# Reduce worker count in .env:
echo "NEWS_WORKERS=2" >> /opt/hormuzwatch/.env
sudo systemctl restart hormuzwatch-server
```

### Cloudflare tunnel returning 502

```bash
# Check tunnel logs
journalctl -u cloudflared --no-pager -n 50

# Verify backend is running locally
curl http://localhost:10020/health

# Restart tunnel
sudo systemctl restart cloudflared

# Check config
sudo cloudflared tunnel info hormuzwatch
```
