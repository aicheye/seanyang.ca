#!/usr/bin/env bash
# Build a static copy of the site for the UW student servers, which serve
# plain files out of ~/public_html at https://<host>/~<watiam>/ where <host>
# is student.cs.uwaterloo.ca, ece.uwaterloo.ca, or student.math.uwaterloo.ca.
# Upload over ssh to linux.student.cs / eceubuntu1 / linux.student.math.
#
# Usage:
#   scripts/build-static.sh <watiam-userid>
#   scp -r out/. <watiam>@linux.student.cs.uwaterloo.ca:~/public_html/
#
# The production (Vercel) build is untouched: everything server-side is
# stripped only for this build, and the sources moved aside are restored
# on exit even if the build fails.
set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "usage: $0 <watiam-userid>" >&2
  exit 1
fi

WATIAM="$1"
BASE_PATH="/~${WATIAM}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# Route handlers can't exist in an `output: export` build: the API route
# sources are dropped (the NowPlaying widget calls prod's routes cross-origin
# instead), and /resume + /transcript become .htaccess redirects to prod.
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

# Jobs/projects refresh at runtime from jsDelivr (12h CDN cache over the
# GitHub repo), so the mirrors track main without a redeploy.
STATIC_EXPORT=1 NEXT_PUBLIC_BASE_PATH="$BASE_PATH" \
  NEXT_PUBLIC_API_BASE="https://seanyang.ca" \
  NEXT_PUBLIC_DATA_BASE="https://cdn.jsdelivr.net/gh/aicheye/seanyang.ca@main/public/data" \
  npx next build

# UW's Apache honors .htaccess. Redirect the proxy paths to prod, which
# serves the PDFs, and serve the exported 404 page.
cat > out/.htaccess <<EOF
Options -Indexes
ErrorDocument 404 ${BASE_PATH}/404.html
RedirectMatch 302 ^${BASE_PATH}/resume(\.pdf)?/?$ https://seanyang.ca/resume
RedirectMatch 302 ^${BASE_PATH}/transcript(\.pdf)?/?$ https://seanyang.ca/transcript
EOF

echo
echo "Static build done: $ROOT/out"
echo "Deploy: scp -r out/. ${WATIAM}@linux.student.cs.uwaterloo.ca:~/public_html/"
echo "Then:   ssh ${WATIAM}@linux.student.cs.uwaterloo.ca 'chmod -R a+rX ~/public_html'"
