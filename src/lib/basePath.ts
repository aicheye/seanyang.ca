/**
 * Prefix for root-absolute URLs when the site is served from a subpath
 * (the UW student-server static mirrors live at /~watiam/).
 * Empty on the production deployment, so withBase is a no-op there.
 */
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? ''

export function withBase(url: string): string {
  return url.startsWith('/') ? `${BASE_PATH}${url}` : url
}
