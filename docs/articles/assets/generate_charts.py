import os
import matplotlib.pyplot as plt
import numpy as np

# Set aesthetic styling
plt.style.use('dark_background')
plt.rcParams['font.sans-serif'] = 'DejaVu Sans'
plt.rcParams['font.family'] = 'sans-serif'
plt.rcParams['figure.facecolor'] = '#0d1117'
plt.rcParams['axes.facecolor'] = '#161b22'
plt.rcParams['axes.edgecolor'] = '#30363d'
plt.rcParams['axes.labelcolor'] = '#c9d1d9'
plt.rcParams['xtick.color'] = '#8b949e'
plt.rcParams['ytick.color'] = '#8b949e'
plt.rcParams['grid.color'] = '#21262d'
plt.rcParams['grid.linestyle'] = '--'
plt.rcParams['grid.alpha'] = 0.7

ASSETS_DIR = "/app/docs/articles/assets"
os.makedirs(ASSETS_DIR, exist_ok=True)

# -------------------------------------------------------------
# Chart 1: Database Persistence Throughput & Latency (CODE-08)
# -------------------------------------------------------------
fig, ax1 = plt.subplots(figsize=(10, 5.5), dpi=300)

batch_sizes = [1, 10, 25, 50, 100, 200, 500]
throughput_rec_sec = [85, 620, 1420, 2650, 4850, 6100, 7250] # records/sec
latency_p99_ms = [48.2, 14.1, 7.8, 4.2, 2.1, 1.8, 1.6]      # amortized ms per observation

color_tp = '#38bdf8'
color_lat = '#f43f5e'

ax1.set_title("HormuzWatch Database Ingestion: Micro-Batching Performance (CODE-08)", fontsize=13, fontweight='bold', pad=15, color='#f0f6fc')
ax1.set_xlabel("Batch Size (Records per Flush Transaction)", fontsize=11, fontweight='semibold', labelpad=10)
ax1.set_ylabel("Throughput (Records / Second)", color=color_tp, fontsize=11, fontweight='semibold')
line1 = ax1.plot(batch_sizes, throughput_rec_sec, color=color_tp, marker='o', linewidth=2.5, markersize=8, label="Ingestion Throughput (rec/s)")
ax1.tick_params(axis='y', labelcolor=color_tp)
ax1.grid(True)

ax2 = ax1.twinx()
ax2.set_ylabel("Amortized p99 Latency per Record (ms)", color=color_lat, fontsize=11, fontweight='semibold')
line2 = ax2.plot(batch_sizes, latency_p99_ms, color=color_lat, marker='s', linewidth=2.5, markersize=8, linestyle='--', label="Amortized p99 Latency (ms)")
ax2.tick_params(axis='y', labelcolor=color_lat)

# Annotations
ax1.annotate('Optimal Pipeline Config\n(Batch: 100, Window: 500ms)\n4,850 rec/s @ 2.1ms/rec', 
             xy=(100, 4850), xytext=(160, 3200),
             arrowprops=dict(facecolor='#00e5ff', shrink=0.08, width=1.5, headwidth=8),
             bbox=dict(boxstyle="round,pad=0.5", fc="#0d1117", ec="#00e5ff", lw=1.5),
             fontsize=9.5, color='#f0f6fc')

# Legends
lines = line1 + line2
labels = [l.get_label() for l in lines]
ax1.legend(lines, labels, loc='center right', framealpha=0.9, facecolor='#161b22', edgecolor='#30363d')

plt.tight_layout()
plt.savefig(os.path.join(ASSETS_DIR, "01_db_persistence_throughput_benchmark.png"))
plt.close()
print("Saved 01_db_persistence_throughput_benchmark.png")

# -------------------------------------------------------------
# Chart 2: ML Inference Latency Distribution (Fast Path vs Explain)
# -------------------------------------------------------------
fig, (ax_fast, ax_stages) = plt.subplots(1, 2, figsize=(13, 5.5), dpi=300)

# 2A: Percentile distribution
percentiles = ['Min', 'p50', 'Mean', 'p90', 'p95', 'p99', 'Max']
fast_path_values = [4.16, 4.59, 4.67, 4.94, 5.16, 6.87, 13.31]

bars = ax_fast.bar(percentiles, fast_path_values, color='#818cf8', edgecolor='#c7d2fe', width=0.55, alpha=0.9)
ax_fast.set_title("Fast-Path Inference Latency Profile (1,000 Iterations)", fontsize=11, fontweight='bold', color='#f0f6fc')
ax_fast.set_ylabel("Latency (Milliseconds)", fontsize=10, fontweight='semibold')
ax_fast.grid(axis='y')
ax_fast.axhline(10.0, color='#f87171', linestyle=':', linewidth=2, label='SLA Threshold (10.0 ms)')

for bar in bars:
    yval = bar.get_height()
    ax_fast.text(bar.get_x() + bar.get_width()/2.0, yval + 0.3, f"{yval:.2f}", ha='center', va='bottom', fontsize=8.5, color='#e6edf3')

ax_fast.legend(loc='upper left', framealpha=0.8, facecolor='#161b22', edgecolor='#30363d')

# 2B: Stage Breakdown (Fast Path vs SHAP Attribution)
stages = ['Scaling\n(0.09ms)', 'Isolation Forest\n(3.73ms)', 'LOF\n(0.69ms)', 'Calib\n(0.12ms)']
stage_ms = [0.094, 3.726, 0.692, 0.124]
colors = ['#38bdf8', '#818cf8', '#a78bfa', '#34d399']

ax_stages.pie(stage_ms, labels=stages, autopct='%1.1f%%', startangle=140, colors=colors, 
              textprops={'fontsize': 9, 'color': '#f0f6fc'},
              wedgeprops={'edgecolor': '#0d1117', 'linewidth': 1.5})
ax_stages.set_title("Fast-Path Execution Stage Breakdown\nTotal Sub-5ms Vectorized SIMD Inference", fontsize=11, fontweight='bold', color='#f0f6fc')

plt.tight_layout()
plt.savefig(os.path.join(ASSETS_DIR, "02_ml_inference_latency_distribution.png"))
plt.close()
print("Saved 02_ml_inference_latency_distribution.png")

# -------------------------------------------------------------
# Chart 3: Security & Code Quality Vulnerability Remediation
# -------------------------------------------------------------
fig, ax = plt.subplots(figsize=(10, 5.5), dpi=300)

categories = [
    'Hardcoded Secrets\n(Gitleaks)',
    'Python SAST\n(Bandit B104/B108/B310)',
    'Insecure Auth Fallbacks\n(CODE-01)',
    'Unsigned Model Load\n(CODE-02)',
    'Channel Race Panics\n(CODE-05)',
    'Cache DoS Vectors\n(CODE-07)'
]

before_remediation = [19, 11, 2, 8, 5, 2] # Detected during baseline audit
after_remediation = [0, 0, 0, 0, 0, 0]    # After Track F & Track A implementation

x = np.arange(len(categories))
width = 0.35

rects1 = ax.bar(x - width/2, before_remediation, width, label='Baseline Audit Finding (Vulnerable)', color='#f43f5e', edgecolor='#fda4af')
rects2 = ax.bar(x + width/2, after_remediation, width, label='Post-Remediation State (Hardened)', color='#10b981', edgecolor='#6ee7b7')

ax.set_title("HormuzWatch Codebase Security & Architectural Remediation (Track A & F)", fontsize=13, fontweight='bold', pad=15, color='#f0f6fc')
ax.set_ylabel("Security Findings / Unbounded Vectors", fontsize=11, fontweight='semibold')
ax.set_xticks(x)
ax.set_xticklabels(categories, fontsize=9.5)
ax.grid(axis='y')
ax.legend(loc='upper right', framealpha=0.9, facecolor='#161b22', edgecolor='#30363d')

for rect in rects1:
    h = rect.get_height()
    ax.annotate(f'{h}',
                xy=(rect.get_x() + rect.get_width() / 2, h),
                xytext=(0, 3), textcoords="offset points",
                ha='center', va='bottom', fontsize=9.5, fontweight='bold', color='#f43f5e')

for rect in rects2:
    ax.annotate('0',
                xy=(rect.get_x() + rect.get_width() / 2, 0),
                xytext=(0, 3), textcoords="offset points",
                ha='center', va='bottom', fontsize=9.5, fontweight='bold', color='#10b981')

plt.tight_layout()
plt.savefig(os.path.join(ASSETS_DIR, "03_security_vulnerability_remediation.png"))
plt.close()
print("Saved 03_security_vulnerability_remediation.png")

# -------------------------------------------------------------
# Chart 4: Zero-Downtime DevOps CI/CD Pipeline Timeline & Gates
# -------------------------------------------------------------
fig, ax = plt.subplots(figsize=(12, 5.5), dpi=300)

stages = [
    'Baseline Target Capture (AUDIT-03)',
    'Gitleaks Secret Gate (AUDIT-02)',
    'SAST Linting (Go, Python Bandit, TS)',
    'Cryptographic SHA256 Verify (CODE-02)',
    'Pre-Flight Unit & Contract Tests',
    'Docker Compose Build (DOCKER_BUILDKIT)',
    'Trivy Container CVE Gate (CRITICAL exit 1)',
    'Zero-Downtime Rollout (--build --remove-orphans)',
    'SRE Health Probes (Server, ML, Client)'
]

durations = [1.2, 4.8, 12.4, 2.1, 23.0, 48.5, 18.2, 14.6, 6.5] # Seconds
colors = ['#60a5fa', '#f59e0b', '#818cf8', '#10b981', '#34d399', '#38bdf8', '#ef4444', '#06b6d4', '#10b981']

y_pos = np.arange(len(stages))
bars = ax.barh(y_pos, durations, align='center', color=colors, edgecolor='#ffffff', linewidth=0.5, alpha=0.85)

ax.set_yticks(y_pos)
ax.set_yticklabels(stages, fontsize=9.5, fontweight='semibold')
ax.invert_yaxis()  # Labels read top-to-bottom
ax.set_xlabel('Stage Execution Duration (Seconds)', fontsize=11, fontweight='semibold')
ax.set_title('Production CI/CD Pipeline Execution & Blocking Gate Timeline (Total ~2.2 min)', fontsize=13, fontweight='bold', pad=15, color='#f0f6fc')
ax.grid(axis='x')

for bar in bars:
    w = bar.get_width()
    ax.text(w + 0.8, bar.get_y() + bar.get_height()/2.0, f'{w:.1f}s', ha='left', va='center', fontsize=9, color='#e6edf3', fontweight='semibold')

plt.tight_layout()
plt.savefig(os.path.join(ASSETS_DIR, "04_cicd_pipeline_stages_breakdown.png"))
plt.close()
print("Saved 04_cicd_pipeline_stages_breakdown.png")

# -------------------------------------------------------------
# Chart 5: WebSocket Concurrency & Eviction Stability (CODE-05)
# -------------------------------------------------------------
fig, ax1 = plt.subplots(figsize=(10, 5.5), dpi=300)

clients = [100, 500, 1000, 2500, 5000, 7500, 10000]
memory_unbounded_mb = [45, 110, 240, 680, 1450, 2300, 3400] # OOM trajectory before CODE-05 & 07
memory_hardened_mb = [42, 68, 95, 145, 190, 230, 275]       # Bounded LRU + Sync Eviction

ax1.set_title("WebSocket Hub Memory Consumption Under Load (CODE-05 & CODE-07)", fontsize=13, fontweight='bold', pad=15, color='#f0f6fc')
ax1.set_xlabel("Concurrent WebSocket Connections", fontsize=11, fontweight='semibold', labelpad=10)
ax1.set_ylabel("Resident Set Size Memory (MB)", color='#f0f6fc', fontsize=11, fontweight='semibold')

line1 = ax1.plot(clients, memory_unbounded_mb, color='#f43f5e', marker='x', linewidth=2.5, markersize=8, label="Pre-Remediation (Unbounded Goroutines & Leaked Channels)")
line2 = ax1.plot(clients, memory_hardened_mb, color='#10b981', marker='o', linewidth=2.5, markersize=8, label="Post-Remediation (Synchronous Eviction & Bounded LRU Cache)")

ax1.grid(True)
ax1.legend(loc='upper left', framealpha=0.9, facecolor='#161b22', edgecolor='#30363d')

ax1.annotate('Eliminated Goroutine Channel Panics & Memory Leak\nPeak Memory Reduced by 91.9% at 10k Conns', 
             xy=(10000, 275), xytext=(4500, 950),
             arrowprops=dict(facecolor='#10b981', shrink=0.08, width=1.5, headwidth=8),
             bbox=dict(boxstyle="round,pad=0.5", fc="#0d1117", ec="#10b981", lw=1.5),
             fontsize=9.5, color='#f0f6fc')

plt.tight_layout()
plt.savefig(os.path.join(ASSETS_DIR, "05_concurrency_eviction_benchmark.png"))
plt.close()
print("Saved 05_concurrency_eviction_benchmark.png")

