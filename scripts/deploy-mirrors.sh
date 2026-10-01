#!/usr/bin/env bash
# Build the static export and deploy to the UW mirrors, CSC, and tilde.club.
#
# Usernames come from ~/.ssh/config (resolved with `ssh -G`), so each host
# needs a `User` entry there. Hosts sharing a user share one build (the
# username sets the basePath); a separate build runs per distinct user.
#
# Usage:
#   scripts/deploy-mirrors.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

HOSTS=(
  linux.student.cs.uwaterloo.ca
  eceubuntu1.uwaterloo.ca
  sftp.eng.uwaterloo.ca
  linux.student.math.uwaterloo.ca
  high-fructose-corn-syrup.csclub.uwaterloo.ca
  tilde.club
)

# Apache serves ~/public_html everywhere except CSC, which serves ~/www.
declare -A WEB_DIRS=(
  [high-fructose-corn-syrup.csclub.uwaterloo.ca]=www
)

# Resolve each host's user from ssh config. `ssh -G` falls back to the
# local username when no User is configured; treat that as unconfigured.
declare -A HOSTS_BY_USER
for host in "${HOSTS[@]}"; do
  user="$(ssh -G "$host" | awk '$1 == "user" { print $2 }')"
  if [[ -z "$user" || "$user" == "$(id -un)" ]]; then
    echo "no User for $host in ~/.ssh/config" >&2
    exit 1
  fi
  HOSTS_BY_USER[$user]+=" $host"
done

deploy() {
  local user="$1" host="$2"
  local dir="${WEB_DIRS[$host]:-public_html}"
  echo "deploying to $host ..."
  scp -r "$ROOT/out/." "${user}@${host}:~/${dir}/"
  ssh "${user}@${host}" "chmod -R a+rX ~/${dir}"
  echo "$host done"
}

# One build per user, deployed to that user's hosts in parallel.
for user in "${!HOSTS_BY_USER[@]}"; do
  bash "$ROOT/scripts/build-static.sh" "$user"
  pids=()
  for host in ${HOSTS_BY_USER[$user]}; do
    deploy "$user" "$host" &
    pids+=($!)
  done
  failed=0
  for pid in "${pids[@]}"; do
    wait "$pid" || failed=1
  done
  if [[ $failed -ne 0 ]]; then
    echo "one or more deploys failed" >&2
    exit 1
  fi
done

echo "all mirrors deployed"
