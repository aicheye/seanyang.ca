/* 88×31 buttons: the badge wall at the bottom of every page that linked to
   anything. Drawn in CSS rather than shipped as GIFs, so they cost nothing
   and stay crisp. Each one links somewhere real. */

interface Badge {
  label: string
  sub?: string
  href: string
  bg: string
  fg: string
}

const BADGES: Badge[] = [
  {
    label: 'Netscape',
    sub: 'NOW!',
    href: 'https://en.wikipedia.org/wiki/Netscape_Navigator',
    bg: '#000080',
    fg: '#fff',
  },
  {
    label: 'Y2K',
    sub: 'compliant',
    href: 'https://en.wikipedia.org/wiki/Year_2000_problem',
    bg: '#ff0',
    fg: '#000',
  },
  {
    label: 'Made with',
    sub: 'Notepad',
    href: 'https://github.com/aicheye/seanyang.me',
    bg: '#fff',
    fg: '#000',
  },
  {
    label: 'Best viewed',
    sub: '800×600',
    href: 'https://en.wikipedia.org/wiki/Super_VGA',
    bg: '#008080',
    fg: '#fff',
  },
  {
    label: 'HTML 4.01',
    sub: 'valid-ish',
    href: 'https://www.w3.org/TR/html401/',
    bg: '#f0f',
    fg: '#fff',
  },
  { label: 'Powered by', sub: 'Next.js', href: 'https://nextjs.org', bg: '#000', fg: '#0f0' },
  {
    label: 'Any browser',
    sub: 'campaign',
    href: 'https://anybrowser.org/campaign/',
    bg: '#c0c0c0',
    fg: '#000',
  },
  { label: 'SE Webring', sub: 'member', href: 'https://se-webring.xyz', bg: '#800000', fg: '#ff0' },
]

export function Badges88() {
  return (
    <div className="badges88">
      {BADGES.map((b) => (
        <a
          key={b.label}
          className="badge88"
          href={b.href}
          target="_blank"
          rel="noopener noreferrer"
          style={{ background: b.bg, color: b.fg }}
        >
          {b.label}
          {b.sub && <small>{b.sub}</small>}
        </a>
      ))}
    </div>
  )
}
