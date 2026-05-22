#!/bin/sh
set -e

READY_FILE=/workspace/.duopara-workspace-ready
LOCK_DIR=/workspace/.duopara-init.lock

if [ ! -f "$READY_FILE" ] && [ -f /workspace/package.json ]; then
  touch "$READY_FILE"
fi

if [ ! -f "$READY_FILE" ]; then
  if mkdir "$LOCK_DIR" 2>/dev/null; then
    cp -a /opt/duopara/. /workspace/
    touch "$READY_FILE"
    rmdir "$LOCK_DIR"
  else
    while [ ! -f "$READY_FILE" ]; do
      sleep 1
    done
  fi
fi

cd /workspace
exec "$@"
