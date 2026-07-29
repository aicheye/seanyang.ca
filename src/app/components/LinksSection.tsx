import { socials } from '@/data/socials'

export function LinksSection() {
  return (
    <section>
      <h2>
        <span>Links</span>
      </h2>
      <nav className="links">
        {socials.map((s) => (
          <a key={s.label} href={s.url} target="_blank" rel="noopener noreferrer">
            {s.label}
          </a>
        ))}
      </nav>
    </section>
  )
}
