#!/usr/bin/env bash
# Build one static copy of the site for every mirror (UW student servers,
# CSC, tilde.club, envs.net). They serve plain files at
# https://<host>/~<user>/, so the basePath depends on the username. This
# build uses the placeholder basePath below; scripts/deploy-mirrors.sh
# copies out/ per host and replaces the placeholder with /~<user>, so
# every mirror shares one `next build`.
#
# Usage:
#   scripts/build-static.sh
#
# The production (Vercel) build is untouched: everything server-side is
# stripped only for this build, and the sources moved aside are restored
# on exit even if the build fails.
set -euo pipefail

# Must match MIRROR_BASE_PLACEHOLDER in scripts/deploy-mirrors.sh.
BASE_PATH="/__MIRROR_BASE_PATH__"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# Route handlers can't exist in an `output: export` build: the API route
# sources are dropped (the NowPlaying widget calls prod's routes cross-origin
# instead), and /resume + /transcript become redirects to prod, which
# deploy-mirrors.sh adds per host.
BAK="$(mktemp -d)"
restore() {
  [[ -e "$BAK/api" ]] && mv "$BAK/api" src/app/api
  [[ -e "$BAK/resume" ]] && mv "$BAK/resume" src/app/resume
  [[ -e "$BAK/transcript" ]] && mv "$BAK/transcript" src/app/transcript
  [[ -e "$BAK/page.tsx" ]] && mv "$BAK/page.tsx" src/app/page.tsx
  rmdir "$BAK" 2>/dev/null || true
}
trap restore EXIT

mv src/app/api "$BAK/api"
mv src/app/resume "$BAK/resume"
mv src/app/transcript "$BAK/transcript"

# force-dynamic (fresh RandomQuote per request) can't render statically;
# the exported page bakes in whichever quote the build picks.
cp src/app/page.tsx "$BAK/page.tsx"
sed -i "/export const dynamic = 'force-dynamic'/d" src/app/page.tsx

rm -rf .next

# Jobs/projects refresh at runtime from jsDelivr (12h CDN cache over the
# GitHub repo), so the mirrors track main without a redeploy.
STATIC_EXPORT=1 NEXT_PUBLIC_BASE_PATH="$BASE_PATH" \
  NEXT_PUBLIC_API_BASE="https://seanyang.ca" \
  NEXT_PUBLIC_DATA_BASE="https://cdn.jsdelivr.net/gh/aicheye/seanyang.ca@main/public/data" \
  npx next build

# Next.js exports metadata directories alongside .html files. When a
# directory and a .html file share the same name, Apache resolves the
# directory first (301 to dir/, then 403). Remove the metadata dirs so
# the .html files win.
find out -mindepth 1 -type d | while read -r d; do
  [ -f "${d}.html" ] && rm -rf "$d"
done

echo
echo "Static build done: $ROOT/out (basePath placeholder ${BASE_PATH})"
