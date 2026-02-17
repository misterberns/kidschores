#!/bin/bash
set -e

# KidsChores Docker Build & Push Script
# Works from Git Bash on Windows with Docker Desktop
# Usage: ./kc-build.sh [--push] [--version X.Y.Z]
#
# Environment variables:
#   DOCKER_REGISTRY  - Container registry (default: ghcr.io/misterberns)
#   DOCKER_REPO      - Repository namespace (default: kidschores)

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
APP_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
REGISTRY="${DOCKER_REGISTRY:-ghcr.io/misterberns}"
REPO="${DOCKER_REPO:-kidschores}"

# Read version from VERSION file
VERSION=$(cat "$APP_DIR/VERSION" | tr -d '[:space:]')

# Parse args
PUSH=false
while [[ $# -gt 0 ]]; do
  case $1 in
    --push) PUSH=true; shift ;;
    --version) VERSION="$2"; shift 2 ;;
    *) echo "Unknown arg: $1"; exit 1 ;;
  esac
done

BACKEND_IMAGE="$REGISTRY/$REPO/kidschores-backend"
FRONTEND_IMAGE="$REGISTRY/$REPO/kidschores-ui"

echo "=== KidsChores Build v${VERSION} ==="
echo "Backend:  $BACKEND_IMAGE:$VERSION"
echo "Frontend: $FRONTEND_IMAGE:$VERSION"
echo ""

echo "=== Building backend image ==="
docker.exe build \
  -t "$BACKEND_IMAGE:$VERSION" \
  -t "$BACKEND_IMAGE:latest" \
  "$APP_DIR/backend/"

echo ""
echo "=== Building frontend image ==="
docker.exe build \
  -t "$FRONTEND_IMAGE:$VERSION" \
  -t "$FRONTEND_IMAGE:latest" \
  "$APP_DIR/frontend/"

echo ""
echo "=== BUILD COMPLETE ==="
docker.exe images | grep kidschores

if [ "$PUSH" = true ]; then
  echo ""
  echo "=== Pushing to $REGISTRY ==="
  docker.exe push "$BACKEND_IMAGE:$VERSION"
  docker.exe push "$BACKEND_IMAGE:latest"
  docker.exe push "$FRONTEND_IMAGE:$VERSION"
  docker.exe push "$FRONTEND_IMAGE:latest"
  echo ""
  echo "=== PUSH COMPLETE ==="
fi
