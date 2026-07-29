import adjectives from '@/data/adjectives'
import { primaryEmail } from '@/data/socials'
import { FiMapPin } from 'react-icons/fi'
import { NowPlaying } from './NowPlaying'
import { SSHCopyButton } from './SSHCopyButton'
import { TermProgress } from './TermProgress'

export function Header() {
  return (
    <header>
      <div className="name-row">
        <h1>Sean Yang</h1>
        <span className="location">
          <span className="pulse" />
          San Francisco, CA
          <FiMapPin size={12} />
        </span>
      </div>
      <div className="tagline">
        <a href={primaryEmail.url}>{primaryEmail.label}</a>
        <span>|</span>
        <a href="/resume" target="_blank" rel="noopener noreferrer">
          résumé ↗
        </a>
      </div>
      <NowPlaying />
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
