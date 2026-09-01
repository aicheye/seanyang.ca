#!/usr/bin/env bash
# Build the static export and deploy to the UW mirrors and tilde.club.
# The UW hosts share one build (basePath /~<watiam>); tilde.club needs its
# own build because the username there differs (basePath /~syang).
#
# Usage:
#   scripts/deploy-mirrors.sh <watiam-userid>
set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "usage: $0 <watiam-userid>" >&2
  exit 1
fi

WATIAM="$1"
TILDE_USER=syang
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

UW_HOSTS=(
  linux.student.cs.uwaterloo.ca
  eceubuntu1.uwaterloo.ca
  sftp.eng.uwaterloo.ca
  linux.student.math.uwaterloo.ca
)

deploy() {
  local user="$1" host="$2"
  echo "deploying to $host ..."
  scp -r "$ROOT/out/." "${user}@${host}:~/public_html/"
  ssh "${user}@${host}" 'chmod -R a+rX ~/public_html'
  echo "$host done"
}

wait_all() {
  local failed=0 pid
  for pid in "$@"; do
    wait "$pid" || failed=1
  done
  if [[ $failed -ne 0 ]]; then
    echo "one or more deploys failed" >&2
    exit 1
  fi
}

# UW hosts: one build, deployed in parallel.
bash "$ROOT/scripts/build-static.sh" "$WATIAM"
pids=()
for host in "${UW_HOSTS[@]}"; do
  deploy "$WATIAM" "$host" &
  pids+=($!)
done
wait_all "${pids[@]}"

# tilde.club: separate build for the different username.
bash "$ROOT/scripts/build-static.sh" "$TILDE_USER"
deploy "$TILDE_USER" tilde.club

echo "all mirrors deployed"
