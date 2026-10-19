import { SITE_URL } from '@/data/site'
import { primaryEmail } from '@/data/socials'
import { HeaderAdjectives, HeaderLocation } from './HeaderBio'
import { Marquee } from './Marquee'
import { NowPlaying } from './NowPlaying'
import { SSHCopyButton } from './SSHCopyButton'
import { TermProgress } from './TermProgress'

// The static mirrors have no server: /resume proxies through a route handler
// on prod, so the mirrors link to prod's /resume. The Spotify widget
// calls prod's API routes cross-origin (see NowPlaying's API_BASE).
const staticExport = process.env.STATIC_EXPORT === '1'
const resumeHref = staticExport ? `${SITE_URL}/resume` : '/resume'

export function Header() {
  return (
    <header>
      <p className="welcome">
        ~*~ Welcome to my homepage!!! ~*~ <span className="blink">★</span>
      </p>
      <div className="name-row">
        <h1>Sean Yang</h1>
        <HeaderLocation />
      </div>
      <Marquee />
      <div className="tagline">
        <a href={primaryEmail.url}>✉ {primaryEmail.label}</a>
        <span>|</span>
        <a href={resumeHref} target="_blank" rel="noopener noreferrer">
          résumé ↗
        </a>
      </div>
      <NowPlaying />
      <HeaderAdjectives />
      <TermProgress />
      <SSHCopyButton />
      <hr className="hr-rainbow" />
    </header>
  )
}
