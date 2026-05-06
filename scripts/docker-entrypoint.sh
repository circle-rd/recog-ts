#!/usr/bin/env bash
# Entry point selecting which recog-ts service(s) to run.
# Usage: docker-entrypoint.sh [api|mcp|both]
set -euo pipefail

mode="${1:-${RECOG_TS_MODE:-both}}"

case "$mode" in
  api)
    exec node packages/api/dist/bin/serve.js
    ;;
  mcp)
    exec node packages/mcp/dist/bin/serve.js
    ;;
  both)
    node packages/api/dist/bin/serve.js &
    api_pid=$!
    node packages/mcp/dist/bin/serve.js &
    mcp_pid=$!
    # Forward SIGTERM/SIGINT to the children.
    trap 'kill -TERM "$api_pid" "$mcp_pid" 2>/dev/null || true' TERM INT
    wait -n "$api_pid" "$mcp_pid"
    status=$?
    kill -TERM "$api_pid" "$mcp_pid" 2>/dev/null || true
    wait || true
    exit "$status"
    ;;
  *)
    echo "Unknown mode: $mode (expected api|mcp|both)" >&2
    exit 64
    ;;
esac
