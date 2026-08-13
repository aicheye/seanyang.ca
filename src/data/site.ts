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

/**
 * The origin this site is registered under in third-party directories.
 *
 * Deliberately still `.me`. The SE'30 webring identifies a member by the
 * `from=` origin it is given and looks it up in its own member list, so
 * sending `.ca` before the ring's registry is updated finds no member and
 * breaks the prev/next arrows. Flip this only after re-registering the site
 * with the ring — until then, `.me` is the address those services know.
 */
export const REGISTERED_ORIGIN = 'https://seanyang.me'
