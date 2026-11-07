#!/usr/bin/env bash
set -euo pipefail

SRC_REF="${SRC_REF:-origin/main}"
SYNC_DIR="${SYNC_DIR:-ml}"
read -ra TARGETS <<< "${TARGETS:-web-dev}"
BRIDGE_FROM="${BRIDGE_FROM:-}"
BRIDGE_TO="${BRIDGE_TO:-}"
BRIDGE_DIR="${BRIDGE_DIR:-DevBridge}"
MSG_TAG="chore(sync)"
PROTECTED_BRANCHES=(main backup)

fail() {
  echo "Sync aborted: $1" >&2
  exit 1
}

branch_exists() {
  git ls-remote --exit-code --heads origin "$1" >/dev/null 2>&1
}

require_writable() {
  local protected
  for protected in "${PROTECTED_BRANCHES[@]}"; do
    [[ "$1" != "$protected" ]] || fail "$1 is a protected branch"
  done
}

# Every version of the directory that the source branch has ever published.
is_published_tree() {
  local dir="$1" tree="$2" commit
  for commit in $(git log --format=%H "$SRC_REF" -- "$dir"); do
    [[ "$(git rev-parse "$commit:$dir")" == "$tree" ]] && return 0
  done
  return 1
}

# Refuse to replace shared code that was edited directly on a target branch.
require_no_drift() {
  local branch="$1" dir="$2" tree
  tree=$(git rev-parse -q --verify "origin/$branch:$dir" || true)
  [[ -z "$tree" ]] && return 0
  is_published_tree "$dir" "$tree" || fail "$branch has its own changes in $dir/. Move them to main first."
}

# Later gitignore rules win, so a branch's own rules stay last.
merge_gitignore() {
  {
    git show "$SRC_REF:.gitignore" 2>/dev/null || true
    echo
    cat .gitignore 2>/dev/null || true
  } | tr -d '\r' | tac | awk '/^[[:space:]]*$/ || !seen[$0]++' | tac | cat -s \
    | sed -e '1{/^$/d;}' -e '${/^$/d;}' > .gitignore.tmp
  mv .gitignore.tmp .gitignore
}

mirror_dir() {
  local ref="$1" dir="$2"
  git cat-file -e "$ref:$dir" 2>/dev/null || fail "$dir does not exist on $ref"
  git rm -r -q --ignore-unmatch -- "$dir"
  git checkout "$ref" -- "$dir"
}

require_only_staged() {
  local allowed="$1" unexpected
  unexpected=$(git diff --cached --name-only | grep -Ev "$allowed" || true)
  [[ -z "$unexpected" ]] || fail "unexpected files staged: $unexpected"
}

commit_push() {
  local branch="$1" msg="$2"
  if git diff --cached --quiet; then
    echo "No changes for $branch"
    return
  fi
  git -c user.name="DevBridge Main Sync Bot" -c user.email="bot@devbridge.main" commit -q -m "$msg"
  git push origin "HEAD:refs/heads/$branch" || fail "push to $branch was rejected"
  echo "Pushed $branch"
}

[[ "${GITHUB_ACTIONS:-}" == "true" || "${ALLOW_LOCAL_SYNC:-}" == "1" ]] || fail "this script runs in GitHub Actions"
[[ -z "$(git status --porcelain)" ]] || fail "the working tree is not clean"
git fetch origin --prune
git cat-file -e "$SRC_REF:$SYNC_DIR" 2>/dev/null || fail "$SYNC_DIR does not exist on $SRC_REF"

# Check every target before anything is written.
ACTIVE_TARGETS=()
for target in "${TARGETS[@]}"; do
  require_writable "$target"
  if branch_exists "$target"; then
    require_no_drift "$target" "$SYNC_DIR"
    ACTIVE_TARGETS+=("$target")
  else
    echo "Skipping $target: not on origin"
  fi
done

for target in "${ACTIVE_TARGETS[@]}"; do
  echo "---- $target"
  git checkout -q --detach "origin/$target"
  mirror_dir "$SRC_REF" "$SYNC_DIR"
  merge_gitignore
  git add -A -- "$SYNC_DIR" .gitignore
  require_only_staged "^($SYNC_DIR/|\.gitignore$)"
  commit_push "$target" "$MSG_TAG: update $SYNC_DIR/ and merge .gitignore from main"
done

if [[ -n "$BRIDGE_FROM" && -n "$BRIDGE_TO" ]] && branch_exists "$BRIDGE_FROM" && branch_exists "$BRIDGE_TO"; then
  require_writable "$BRIDGE_TO"
  git fetch origin --prune
  own=$(git log --oneline "origin/$BRIDGE_FROM..origin/$BRIDGE_TO" --grep="$MSG_TAG" --invert-grep -- "$BRIDGE_DIR" || true)
  if [[ -z "$own" ]]; then
    echo "---- $BRIDGE_TO: mirroring $BRIDGE_DIR/ from $BRIDGE_FROM"
    git checkout -q --detach "origin/$BRIDGE_TO"
    mirror_dir "origin/$BRIDGE_FROM" "$BRIDGE_DIR"
    git add -A -- "$BRIDGE_DIR"
    require_only_staged "^$BRIDGE_DIR/"
    commit_push "$BRIDGE_TO" "$MSG_TAG: mirror $BRIDGE_DIR/ from $BRIDGE_FROM"
  else
    echo "Skipping $BRIDGE_DIR: $BRIDGE_TO has its own changes:"
    echo "$own"
  fi
fi

echo "Done."
