#!/usr/bin/env bash
# Worktree bootstrap for web + expo + portless (`/wt` skill).
# Runs inside the new worktree. ROOT_WORKTREE_PATH = main checkout.
set -euo pipefail

ROOT="${ROOT_WORKTREE_PATH:?ROOT_WORKTREE_PATH is required}"

# Matches portless.json / `bun web` (`portless run --name *.heynbord`).
WEB_PORTLESS_NAME="web.heynbord"

echo "==> Installing workspace dependencies"
bun install --frozen-lockfile

sync_app_envs() {
  local app_dir="$1"
  shift
  local files=("$@")
  mkdir -p "$app_dir"

  local copied=0
  local f src
  for f in "${files[@]}"; do
    src="$ROOT/$app_dir/$f"
    if [[ -f "$src" ]]; then
      cp "$src" "$app_dir/$f"
      echo "    copied $app_dir/$f"
      copied=$((copied + 1))
    fi
  done

  local example="$app_dir/.env.example"
  if [[ -f "$example" ]]; then
    for f in "${files[@]}"; do
      if [[ ! -f "$app_dir/$f" ]]; then
        cp "$example" "$app_dir/$f"
        echo "    seeded $app_dir/$f from example"
        copied=$((copied + 1))
      fi
    done
  fi

  if [[ "$copied" -eq 0 ]]; then
    echo "    warning: no env files found in $ROOT/$app_dir (copy .env.example manually)"
  fi
}

echo "==> Syncing app env files from main checkout"
sync_app_envs apps/web .env.local .env.prod
sync_app_envs apps/expo .env.local

echo "==> Checking portless (required for bun web)"
if ! command -v portless >/dev/null 2>&1; then
  echo "error: portless not on PATH. Install once on the machine:"
  echo "  npm install -g portless"
  echo "  # or: bun add -g portless"
  exit 1
fi

# `portless run` prefixes linked worktrees: https://<branch>.web.heynbord.localhost
web_url="$(portless get "$WEB_PORTLESS_NAME" 2>/dev/null || true)"
if [[ -z "$web_url" ]]; then
  web_url="https://${WEB_PORTLESS_NAME}.localhost"
fi

echo ""
echo "Worktree setup complete."
echo "  Web URL:  $web_url"
echo "  Start:    bun web   # or: bun expo"
echo ""
