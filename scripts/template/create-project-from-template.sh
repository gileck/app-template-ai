#!/usr/bin/env bash
set -euo pipefail

TEMPLATE_REPO="${TEMPLATE_REPO:-gileck/app-template-ai}"
PROJECTS_DIR="${PROJECTS_DIR:-$HOME/Projects}"

usage() {
  cat <<'EOF'
Create a GitHub repository from the app-template-ai template, clone it into
~/Projects, and run yarn init-project in the cloned project.

Usage:
  create-project [PROJECT_NAME]
  yarn create-project [PROJECT_NAME]
  scripts/template/create-project-from-template.sh [PROJECT_NAME]

Optional environment variables:
  TEMPLATE_REPO=gileck/app-template-ai
  PROJECTS_DIR=~/Projects
EOF
}

require_command() {
  local command_name="$1"
  if ! command -v "$command_name" >/dev/null 2>&1; then
    echo "Missing required command: $command_name" >&2
    exit 1
  fi
}

prompt_required() {
  local prompt="$1"
  local value=""

  while [[ -z "$value" ]]; do
    read -r -p "$prompt: " value
    value="${value#"${value%%[![:space:]]*}"}"
    value="${value%"${value##*[![:space:]]}"}"
  done

  printf '%s\n' "$value"
}

prompt_visibility() {
  local visibility=""

  while [[ -z "$visibility" ]]; do
    read -r -p "Repository visibility [private/public/internal] (private): " visibility
    visibility="${visibility:-private}"

    case "$visibility" in
      private|public|internal)
        printf '%s\n' "$visibility"
        return
        ;;
      *)
        echo "Please enter private, public, or internal." >&2
        visibility=""
        ;;
    esac
  done
}

validate_repo_name() {
  local repo_name="$1"

  if [[ "$repo_name" == */* ]]; then
    echo "Use only the repository name. The script creates it in your authenticated GitHub account." >&2
    exit 1
  fi

  if [[ ! "$repo_name" =~ ^[A-Za-z0-9._-]+$ ]]; then
    echo "Repository names may contain only letters, numbers, dots, underscores, and hyphens." >&2
    exit 1
  fi
}

main() {
  if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
    usage
    exit 0
  fi

  if [[ $# -gt 1 ]]; then
    echo "Usage: create-project [PROJECT_NAME]" >&2
    exit 1
  fi

  require_command gh
  require_command git
  require_command yarn

  gh auth status >/dev/null

  local repo_name
  repo_name="${1:-}"
  if [[ -z "$repo_name" ]]; then
    repo_name="$(prompt_required "Project/repo name")"
  fi
  validate_repo_name "$repo_name"

  local visibility
  visibility="$(prompt_visibility)"

  mkdir -p "$PROJECTS_DIR"

  local target_dir="$PROJECTS_DIR/$repo_name"
  if [[ -e "$target_dir" ]]; then
    echo "Target directory already exists: $target_dir" >&2
    exit 1
  fi

  echo
  echo "Creating GitHub repo from template: $TEMPLATE_REPO"
  echo "Cloning into: $target_dir"
  echo

  (
    cd "$PROJECTS_DIR"
    gh repo create "$repo_name" "--$visibility" --template "$TEMPLATE_REPO" --clone
  )

  cd "$target_dir"

  if [[ ! -d node_modules ]]; then
    echo
    echo "Installing dependencies..."
    yarn install
  fi

  echo
  echo "Running project initializer..."
  yarn init-project
}

main "$@"
