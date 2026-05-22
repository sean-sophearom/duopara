#!/bin/sh
set -e

if [ ! -f /workspace/package.json ]; then
  cp -a /opt/duopara/. /workspace/
fi

cd /workspace
exec "$@"
