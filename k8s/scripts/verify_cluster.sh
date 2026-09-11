#!/usr/bin/env bash
# HormuzWatch — Kubernetes Multi-Node Cluster Status & Health Check
set -euo pipefail

echo "============================================================"
echo "          HormuzWatch Kubernetes Cluster Topology           "
echo "============================================================"
kubectl get nodes -o wide --show-labels

echo ""
echo "============================================================"
echo "          Kubernetes Namespaces                             "
echo "============================================================"
kubectl get ns

echo ""
echo "============================================================"
echo "          Core Cluster Components & Pods                    "
echo "============================================================"
kubectl get pods -A -o wide

echo ""
echo "============================================================"
echo "          Node Allocations & Resources                      "
echo "============================================================"
kubectl top nodes 2>/dev/null || kubectl describe nodes | grep -E "(Name:|environment=|Roles:|Non-terminated Pods)"
