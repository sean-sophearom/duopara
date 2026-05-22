#!/bin/sh
set -e

READY_FILE=/workspace/.duopara-workspace-ready
LOCK_DIR=/workspace/.duopara-init.lock
SOURCE_VERSION_FILE=/opt/duopara/.duopara-image-version
WORKSPACE_VERSION_FILE=/workspace/.duopara-image-version

if [ -d /workspace/.git ]; then
  cd /workspace
  exec "$@"
fi

if [ ! -f "$READY_FILE" ] || ! cmp -s "$SOURCE_VERSION_FILE" "$WORKSPACE_VERSION_FILE"; then
  if mkdir "$LOCK_DIR" 2>/dev/null; then
    cp -a /opt/duopara/. /workspace/
    cp "$SOURCE_VERSION_FILE" "$WORKSPACE_VERSION_FILE"
    touch "$READY_FILE"
    rmdir "$LOCK_DIR"
  else
    while [ ! -f "$READY_FILE" ] || ! cmp -s "$SOURCE_VERSION_FILE" "$WORKSPACE_VERSION_FILE"; do
      sleep 1
    done
  fi
fi

cd /workspace
exec "$@"
