/**
 * Prefix for root-absolute URLs when the site is served from a subpath
 * (the linux.student.cs.uwaterloo.ca static mirror lives at /~watiam/).
 * Empty on the production deployment, so withBase is a no-op there.
 */
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? ''

export function withBase(url: string): string {
  return url.startsWith('/') ? `${BASE_PATH}${url}` : url
}
