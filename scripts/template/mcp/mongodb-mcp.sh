#!/usr/bin/env bash
# Launches the official MongoDB MCP server (mongodb-js/mongodb-mcp-server) bound
# to this project's MONGO_URI from .env.local. Read-only by default so agents
# can inspect data without risk of writes. Atlas Admin tools disabled.
#
# Wired into .mcp.json and .cursor/mcp.json; not meant to be invoked manually.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"

if [ -f "$REPO_ROOT/.env.local" ]; then
  set -a
  # shellcheck disable=SC1091
  . "$REPO_ROOT/.env.local"
  set +a
fi

if [ -z "${MONGO_URI:-}" ]; then
  echo "mongodb-mcp: MONGO_URI not set (looked in $REPO_ROOT/.env.local and process env)" >&2
  exit 1
fi

export MDB_MCP_CONNECTION_STRING="$MONGO_URI"

exec npx -y mongodb-mcp-server --readOnly --disabledTools atlas
