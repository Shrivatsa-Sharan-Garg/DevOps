#!/usr/bin/env bash
set -euo pipefail

UPSTREAM_URL="${UPSTREAM_URL:-https://github.com/Shrivatsa-Sharan-Garg/DevOps.git}"
UPSTREAM_BRANCH="${UPSTREAM_BRANCH:-main}"
TARGET_BRANCH="${TARGET_BRANCH:-main}"

ORIGIN_URL=$(git remote get-url origin 2>/dev/null || echo "")

if [[ "$ORIGIN_URL" == *"Shrivatsa-Sharan-Garg/DevOps"* ]]; then
  echo "Parent repository detected. Skipping upstream sync."
  exit 0
fi

echo "Fork detected. Fetching latest changes from upstream ($UPSTREAM_URL)..."

if ! git remote | grep -q "^upstream$"; then
  git remote add upstream "$UPSTREAM_URL"
fi

git fetch upstream --prune

git checkout "$TARGET_BRANCH"

echo "Merging upstream/$UPSTREAM_BRANCH into local $TARGET_BRANCH..."
git merge "upstream/$UPSTREAM_BRANCH" --no-edit || {
  echo "Merge conflict detected! Please resolve conflicts manually."
  exit 1
}

if [[ "${GITHUB_ACTIONS:-}" == "true" ]]; then
  git push origin "$TARGET_BRANCH" || echo "Push skipped or already up-to-date"
  
  git reset --hard
  git clean -fd
fi
echo "Fork synchronization complete and working tree clean.
