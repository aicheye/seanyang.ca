/**
 * Canonical origin for the site.
 *
 * During the .me → .ca migration the app answers on both `seanyang.me` and
 * `seanyang.ca`. `.ca` is the canonical one: metadata, self-referential links,
 * and the SSH hint all name it regardless of which host the visitor arrived
 * on, so search engines and copy-pasted links converge on the new domain
 * before `.me` starts redirecting. When the redirect lands at the edge,
 * nothing in here has to change.
 */
export const SITE_DOMAIN = 'seanyang.ca'

export const SITE_URL = `https://${SITE_DOMAIN}`

/** Host serving the resume and transcript PDFs proxied by /resume and /transcript. */
export const DOCS_URL = `https://docs.${SITE_DOMAIN}`
