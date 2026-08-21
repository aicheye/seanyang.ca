#!/usr/bin/env bash
# Build the static export and deploy to all four UW mirrors in parallel.
#
# Usage:
#   scripts/deploy-mirrors.sh <watiam-userid>
set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "usage: $0 <watiam-userid>" >&2
  exit 1
fi

WATIAM="$1"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

HOSTS=(
  linux.student.cs.uwaterloo.ca
  eceubuntu1.uwaterloo.ca
  sftp.eng.uwaterloo.ca
  linux.student.math.uwaterloo.ca
)

bash "$ROOT/scripts/build-static.sh" "$WATIAM"

pids=()
for host in "${HOSTS[@]}"; do
  (
    echo "deploying to $host ..."
    scp -r "$ROOT/out/." "${WATIAM}@${host}:~/public_html/"
    ssh "${WATIAM}@${host}" 'chmod -R a+rX ~/public_html'
    echo "$host done"
  ) &
  pids+=($!)
done

failed=0
for pid in "${pids[@]}"; do
  if ! wait "$pid"; then
    failed=1
  fi
done

if [[ $failed -ne 0 ]]; then
  echo "one or more deploys failed" >&2
  exit 1
fi

echo "all mirrors deployed"
