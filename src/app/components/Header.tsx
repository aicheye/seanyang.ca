import adjectives from '@/data/adjectives'
import { DOCS_URL } from '@/data/site'
import { primaryEmail } from '@/data/socials'
import { FiMapPin } from 'react-icons/fi'
import { NowPlaying } from './NowPlaying'
import { SSHCopyButton } from './SSHCopyButton'
import { TermProgress } from './TermProgress'

// The static mirror has no server: /resume proxies through a route handler
// on prod, so the mirror links straight to the PDF, and the Last.fm/Spotify
// widget is dropped entirely.
const staticExport = process.env.STATIC_EXPORT === '1'
const resumeHref = staticExport
  ? `${DOCS_URL}/Sean_Yang_resume/Sean_Yang_resume.pdf`
  : '/resume'

export function Header() {
  return (
    <header>
      <div className="name-row">
        <h1>Sean Yang</h1>
        <span className="location">
          San Francisco, CA
          <FiMapPin size={12} />
        </span>
      </div>
      <div className="tagline">
        <a href={primaryEmail.url}>{primaryEmail.label}</a>
        <span>|</span>
        <a href={resumeHref} target="_blank" rel="noopener noreferrer">
          résumé ↗
        </a>
      </div>
      {!staticExport && <NowPlaying />}
      <div className="about">
        <span className="sep">&#91;</span>
        {adjectives.flatMap((w, i) =>
          i === 0
            ? [<span key={w}>{w}</span>]
            : [
                <span key={`sep-${i}`} className="sep">
                  ·
                </span>,
                <span key={w}>{w}</span>,
              ],
        )}
        <span className="sep">&#93;</span>
      </div>
      <TermProgress />
      <SSHCopyButton />
    </header>
  )
}
