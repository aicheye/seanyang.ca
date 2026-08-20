#!/usr/bin/env bash
# Build a static copy of the site for linux.student.cs.uwaterloo.ca, which
# serves plain files out of ~/public_html at https://linux.student.cs.uwaterloo.ca/~<watiam>/.
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

# Route handlers can't exist in an `output: export` build: the API routes
# (Last.fm/Spotify widget) are dropped, and /resume + /transcript become
# .htaccess redirects to the PDFs they proxy on prod.
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

STATIC_EXPORT=1 NEXT_PUBLIC_BASE_PATH="$BASE_PATH" npx next build

# UW's Apache honors .htaccess. Redirect the proxy paths straight to the
# upstream PDFs and serve the exported 404 page.
cat > out/.htaccess <<EOF
Options -Indexes
ErrorDocument 404 ${BASE_PATH}/404.html
RedirectMatch 302 ^${BASE_PATH}/resume(\.pdf)?/?$ https://docs.seanyang.ca/Sean_Yang_resume/Sean_Yang_resume.pdf
RedirectMatch 302 ^${BASE_PATH}/transcript(\.pdf)?/?$ https://docs.seanyang.ca/Sean_Yang_transcript/Sean_Yang_transcript.pdf
EOF

echo
echo "Static build done: $ROOT/out"
echo "Deploy: scp -r out/. ${WATIAM}@linux.student.cs.uwaterloo.ca:~/public_html/"
echo "Then:   ssh ${WATIAM}@linux.student.cs.uwaterloo.ca 'chmod -R a+rX ~/public_html'"
