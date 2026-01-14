#!/usr/bin/env bash

set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <major|minor|patch> [image-name]" >&2
  exit 1
fi

BUMP_TYPE="$1"
IMAGE_NAME="${2:-moonsonglabs/cre-frontend}"
LATEST_TAG="latest"

case "$BUMP_TYPE" in
  major|minor|patch) ;;
  *) 
    echo "Invalid bump type '$BUMP_TYPE'. Expected one of: major, minor, patch." >&2
    exit 1
    ;;
esac

CURRENT_TAG=$(git tag --list 'v*' | sort -V | tail -n1 || true)

if [[ -z "$CURRENT_TAG" ]]; then
  CURRENT_TAG="v0.0.0"
fi

VERSION="${CURRENT_TAG#v}"
IFS='.' read -r MAJOR MINOR PATCH <<< "$VERSION"

MAJOR=${MAJOR:-0}
MINOR=${MINOR:-0}
PATCH=${PATCH:-0}

case "$BUMP_TYPE" in
  major)
    ((MAJOR+=1))
    MINOR=0
    PATCH=0
    ;;
  minor)
    ((MINOR+=1))
    PATCH=0
    ;;
  patch)
    ((PATCH+=1))
    ;;
esac

NEW_VERSION="${MAJOR}.${MINOR}.${PATCH}"
NEW_TAG="v${NEW_VERSION}"

echo "Building docker image ${IMAGE_NAME}:${NEW_VERSION} (also tagging :latest)"

cd fe && docker build \
  -f Dockerfile \
  --tag "${IMAGE_NAME}:${NEW_VERSION}" \
  --tag "${IMAGE_NAME}:latest" \
  .

echo "Pushing docker tags"
docker push "${IMAGE_NAME}:${NEW_VERSION}"
docker push "${IMAGE_NAME}:latest"

echo "Creating git tags ${NEW_TAG} and ${LATEST_TAG}"
git tag -a "${NEW_TAG}" -m "Release ${NEW_TAG}"
git tag -fa "${LATEST_TAG}" -m "Release ${LATEST_TAG} -> ${NEW_TAG}"

echo "Pushing git tags"
git push origin "${NEW_TAG}"
git push --force origin "${LATEST_TAG}"

echo "Release complete: ${IMAGE_NAME}:${NEW_VERSION}"
