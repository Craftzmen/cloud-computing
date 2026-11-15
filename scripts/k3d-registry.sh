#!/usr/bin/env bash
set -euo pipefail

NAME="minipaas-registry.localhost"
PORT="${REGISTRY_PORT:-5001}"

if ! k3d registry list 2>/dev/null | grep -q "$NAME"; then
  k3d registry create "$NAME" --port "${PORT}:5000"
  echo "Created registry $NAME on host port $PORT"
else
  echo "Registry $NAME already exists"
fi

if k3d cluster list | grep -q minipaas; then
  k3d registry delete k3d-"$NAME" 2>/dev/null || true
  k3d registry create "$NAME" --port "${PORT}:5000" 2>/dev/null || true
  k3d cluster edit minipaas --registry-use "k3d-$NAME:$PORT" 2>/dev/null || \
    echo "If pull fails, recreate cluster with: k3d cluster create minipaas ... --registry-use k3d-$NAME:$PORT"
fi

echo "Push images as localhost:${PORT}/user-app:tag"