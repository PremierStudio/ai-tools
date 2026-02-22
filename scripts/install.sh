#!/usr/bin/env sh
set -eu

REQUIRED_MAJOR=22

if ! command -v node >/dev/null 2>&1; then
  echo "Agentful requires Node.js >= ${REQUIRED_MAJOR}."
  echo "Install Node first: https://nodejs.org/"
  exit 1
fi

NODE_MAJOR=$(node -p "Number(process.versions.node.split('.')[0])")
if [ "$NODE_MAJOR" -lt "$REQUIRED_MAJOR" ]; then
  echo "Detected Node.js $(node -v). Agentful requires Node.js >= ${REQUIRED_MAJOR}."
  exit 1
fi

echo "Running Agentful via npx..."
npx agentful@latest "$@"
