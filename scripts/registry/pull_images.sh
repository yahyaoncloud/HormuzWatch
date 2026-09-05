#!/usr/bin/env bash
set -eo pipefail

REGISTRY_HOST="${1:-localhost:5000}"
VERSION=$(cat VERSION 2>/dev/null || echo "2.4.0")

echo "============================================================"
echo " HormuzWatch: Pulling Images from Private Registry          "
echo " Registry Host: $REGISTRY_HOST"
echo " Version:       $VERSION"
echo "============================================================"

IMAGES=(
  "hormuzwatch-server"
  "hormuzwatch-ml"
  "hormuzwatch-client"
)

for img in "${IMAGES[@]}"; do
  remote_tag="$REGISTRY_HOST/$img:$VERSION"
  local_dev_tag="$img:dev"
  
  echo "===> Pulling $remote_tag..."
  docker pull "$remote_tag"
  docker tag "$remote_tag" "$img:$VERSION"
  docker tag "$remote_tag" "$local_dev_tag"
  echo "[✓] Cached locally as $img:$VERSION and $local_dev_tag"
done

echo ""
echo "[✓] All images pulled and prepared for container runtime."
