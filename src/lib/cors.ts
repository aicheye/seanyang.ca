/**
 * The UW static mirrors call the API routes cross-origin (NowPlaying widget).
 * Only those origins get an Access-Control-Allow-Origin echo; every other
 * cross-origin caller is blocked by the browser as usual. Same-origin
 * requests (prod itself) never need these headers.
 */
const ALLOWED_ORIGINS = new Set([
  'https://ece.uwaterloo.ca',
  'https://student.math.uwaterloo.ca',
  'https://www.student.math.uwaterloo.ca',
  'https://student.cs.uwaterloo.ca',
])

export function corsHeaders(req: Request): Record<string, string> {
  // Vary on every response, allowed or not — the art route is CDN-cacheable,
  // and without it a cached same-origin response (no ACAO) could be served
  // to a mirror.
  const origin = req.headers.get('origin')
  if (!origin || !ALLOWED_ORIGINS.has(origin)) return { Vary: 'Origin' }
  return { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' }
}
