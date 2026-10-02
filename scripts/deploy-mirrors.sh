#!/usr/bin/env bash
# Build the static export once and deploy it to the UW mirrors, CSC,
# tilde.club, and envs.net.
#
# Usernames come from ~/.ssh/config (resolved with `ssh -G`), so each host
# needs a `User` entry there. Each host gets its own copy of out/ under
# out-mirrors/<host>, with the placeholder basePath replaced by /~<user>.
#
# Usage:
#   scripts/deploy-mirrors.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# Must match BASE_PATH in scripts/build-static.sh.
MIRROR_BASE_PLACEHOLDER="/__MIRROR_BASE_PATH__"

HOSTS=(
  linux.student.cs.uwaterloo.ca
  eceubuntu1.uwaterloo.ca
  sftp.eng.uwaterloo.ca
  linux.student.math.uwaterloo.ca
  high-fructose-corn-syrup.csclub.uwaterloo.ca
  tilde.club
  envs.net
)

# Apache serves ~/public_html everywhere except CSC, which serves ~/www.
declare -A WEB_DIRS=(
  [high-fructose-corn-syrup.csclub.uwaterloo.ca]=www
)

# tilde.club and envs.net run nginx: no .htaccess, and /page does not
# resolve to page.html. Those hosts get page/index.html copies and HTML
# redirects.
declare -A NGINX_HOSTS=(
  [tilde.club]=1
  [envs.net]=1
)

# envs.net also serves ~/public_html at https://<user>.envs.net/, where the
# pages' /~<user>/ asset paths 404. Pages on these hosts send any other
# origin to the same path on the canonical one.
declare -A CANONICAL_ORIGINS=(
  [envs.net]=https://envs.net
)

# Resolve each host's user from ssh config. `ssh -G` falls back to the
# local username when no User is configured; treat that as unconfigured.
declare -A USERS
for host in "${HOSTS[@]}"; do
  user="$(ssh -G "$host" | awk '$1 == "user" { print $2 }')"
  if [[ -z "$user" || "$user" == "$(id -un)" ]]; then
    echo "no User for $host in ~/.ssh/config" >&2
    exit 1
  fi
  USERS[$host]="$user"
done

# Write a page that sends the browser to $2. Used where .htaccess is ignored.
html_redirect() {
  mkdir -p "$(dirname "$1")"
  cat > "$1" <<HTML
<!doctype html>
<meta charset="utf-8">
<meta http-equiv="refresh" content="0; url=$2">
<link rel="canonical" href="$2">
<a href="$2">$2</a>
HTML
}

# Copy out/ to out-mirrors/<host> with that host's basePath filled in.
stage() {
  local host="$1" user="${USERS[$1]}"
  local base="/~${user}" dir="$ROOT/out-mirrors/$host"
  rm -rf "$dir"
  mkdir -p "$ROOT/out-mirrors"
  cp -r "$ROOT/out" "$dir"
  grep -rlZI -F "$MIRROR_BASE_PLACEHOLDER" "$dir" \
    | xargs -0 -r sed -i "s|${MIRROR_BASE_PLACEHOLDER}|${base}|g"

  # The static site.webmanifest has root-relative icon paths; rewrite them
  # so they resolve under the basePath.
  sed -i "s|\"src\": \"/|\"src\": \"${base}/|g" "$dir/site.webmanifest"

  local origin="${CANONICAL_ORIGINS[$host]:-}"
  if [[ -n "$origin" ]]; then
    # https://syang.envs.net/mirrors/ goes to https://envs.net/~syang/mirrors/.
    # The script is first in <head>, so it runs before any asset loads.
    local js="if(location.origin!=='${origin}'){var p=location.pathname,b='${base}';if(p!==b)if(p.indexOf(b+'/'))p=b+p;location.replace('${origin}'+p+location.search+location.hash)}"
    find "$dir" -name '*.html' -print0 \
      | xargs -0 -r sed -i "0,/<head>/s#<head>#<head><script>${js}</script>#"
  fi

  if [[ -n "${NGINX_HOSTS[$host]:-}" ]]; then
    # /page 301s to /page/, which serves page/index.html.
    find "$dir" -name '*.html' ! -name index.html ! -name 404.html \
      | while read -r f; do
          mkdir -p "${f%.html}"
          cp "$f" "${f%.html}/index.html"
        done
    html_redirect "$dir/resume/index.html" https://seanyang.ca/resume
    html_redirect "$dir/transcript/index.html" https://seanyang.ca/transcript
    return
  fi

  # Apache honors .htaccess. Redirect the proxy paths to prod, which serves
  # the PDFs, and serve the exported 404 page. Images get the same
  # Cache-Control as prod (IMAGE_CACHE_CONTROL in src/lib/cache.ts); the
  # IfModule keeps the file valid if mod_headers is off.
  cat > "$dir/.htaccess" <<HTACCESS
Options -Indexes
ErrorDocument 404 ${base}/404.html
RedirectMatch 302 ^${base}/resume(\.pdf)?/?$ https://seanyang.ca/resume
RedirectMatch 302 ^${base}/transcript(\.pdf)?/?$ https://seanyang.ca/transcript
<IfModule mod_headers.c>
  <FilesMatch "\.(png|jpe?g|gif|webp|svg|ico|mp4|webm)\$">
    Header set Cache-Control "public, max-age=86400, stale-while-revalidate=604800"
  </FilesMatch>
</IfModule>
HTACCESS
}

deploy() {
  local host="$1" user="${USERS[$1]}"
  local dir="${WEB_DIRS[$host]:-public_html}"
  echo "deploying to $host ..."
  scp -r "$ROOT/out-mirrors/$host/." "${user}@${host}:~/${dir}/"
  ssh "${user}@${host}" "chmod -R a+rX ~/${dir}"
  echo "$host done"
}

bash "$ROOT/scripts/build-static.sh"
for host in "${HOSTS[@]}"; do
  stage "$host"
done

if [[ "${STAGE_ONLY:-}" == 1 ]]; then
  echo "staged in $ROOT/out-mirrors (STAGE_ONLY=1, nothing uploaded)"
  exit 0
fi

pids=()
for host in "${HOSTS[@]}"; do
  deploy "$host" &
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

echo "all mirrors deployed"
