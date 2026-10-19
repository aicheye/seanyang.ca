import Link from 'next/link'
import { primaryEmail } from '@/data/socials'

/* The row of [ bracketed ] links that stood in for a frameset's nav frame.
   Everything it points at is already on the page or linked from the footer;
   "guestbook" is the e-mail address. */
const ITEMS = [
  { label: 'home', href: '/' },
  { label: 'experience', href: '#experience' },
  { label: 'projects', href: '#projects' },
  { label: 'links', href: '#links' },
  { label: 'guestbook', href: primaryEmail.url },
  { label: 'mirrors', href: '/mirrors' },
]

export function NavBar() {
  return (
    <nav className="navbar" aria-label="Page">
      {ITEMS.map((item) => (
        <span key={item.label}>
          [{' '}
          {item.href.startsWith('#') || item.href.startsWith('mailto:') ? (
            <a href={item.href}>{item.label}</a>
          ) : (
            <Link href={item.href}>{item.label}</Link>
          )}{' '}
          ]
        </span>
      ))}
    </nav>
  )
}
