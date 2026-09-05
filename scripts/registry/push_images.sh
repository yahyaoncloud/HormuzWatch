#!/usr/bin/env bash
set -eo pipefail

REGISTRY_HOST="${1:-localhost:5000}"
VERSION=$(cat VERSION 2>/dev/null || echo "2.4.0")

echo "============================================================"
echo " HormuzWatch: Building & Pushing Images to Private Registry "
echo " Target Registry: $REGISTRY_HOST"
echo " Version:         $VERSION"
echo "============================================================"

# Verify registry reachable
if ! curl -sf "http://$REGISTRY_HOST/v2/" >/dev/null 2>&1; then
  echo "[-] Warning: Registry http://$REGISTRY_HOST/v2/ not responding directly."
  echo "    Ensure registry is running via: ./scripts/registry/registry_ctl.sh start"
fi

IMAGES=(
  "server:./server:hormuzwatch-server"
  "ml:./service/ml-service:hormuzwatch-ml"
  "client:./client:hormuzwatch-client"
)

for item in "${IMAGES[@]}"; do
  IFS=":" read -r service context image_name <<< "$item"
  echo ""
  echo "===> Building [$image_name:$VERSION] from $context..."
  docker build -t "$image_name:$VERSION" -t "$image_name:latest" "$context"
  
  target_tag="$REGISTRY_HOST/$image_name:$VERSION"
  target_latest="$REGISTRY_HOST/$image_name:latest"
  
  echo "===> Tagging to $target_tag..."
  docker tag "$image_name:$VERSION" "$target_tag"
  docker tag "$image_name:latest" "$target_latest"
  
  echo "===> Pushing to $target_tag..."
  docker push "$target_tag"
  docker push "$target_latest"
  echo "[✓] Pushed $target_tag successfully!"
done

echo ""
echo "============================================================"
echo " All images published to $REGISTRY_HOST!"
echo " Catalog: curl http://$REGISTRY_HOST/v2/_catalog"
echo "============================================================"
