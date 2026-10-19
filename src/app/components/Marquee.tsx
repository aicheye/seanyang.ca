import { SITE_DOMAIN } from '@/data/site'
import { primaryEmail } from '@/data/socials'

/* The scrolling banner every homepage had. A CSS animation rather than the
   <marquee> tag, which React's JSX types don't know and browsers only keep
   for compatibility; prefers-reduced-motion stops it in globals.css. */
export function Marquee() {
  return (
    <div className="marquee" aria-hidden="true">
      <span className="marquee-inner">
        ★ ★ ★ WELCOME TO {SITE_DOMAIN.toUpperCase()} ★ ★ ★ thanks for stopping by!!! ★ ★ ★ e-mail me
        at <a href={primaryEmail.url}>{primaryEmail.label}</a> ★ ★ ★ best viewed with Netscape
        Navigator 4.0 at 800×600 ★ ★ ★ this page is Y2K compliant ★ ★ ★ don't forget to sign the
        guestbook ★ ★ ★
      </span>
    </div>
  )
}
