#!/usr/bin/env sh
set -eu

if command -v ipconfig >/dev/null 2>&1; then
  ipconfig getifaddr en0 || ipconfig getifaddr en1 || true
  exit 0
fi

if command -v hostname >/dev/null 2>&1; then
  hostname -I | awk '{print $1}'
fi
