import Image from 'next/image'
import { withBase } from '@/lib/basePath'
import { SITE_URL } from '@/data/site'

const MIRRORS = [
  { label: 'seanyang.ca', href: 'https://seanyang.ca' },
  { label: 'math', href: 'https://student.math.uwaterloo.ca/~s345yang' },
  { label: 'cs', href: 'https://student.cs.uwaterloo.ca/~s345yang' },
  { label: 'ece', href: 'https://ece.uwaterloo.ca/~s345yang' },
]

export function Footer() {
  return (
    <footer>
      <div className="footer-left">
        <a
          href="https://websitecarbon.com/website/seanyang-ca/"
          target="_blank"
          rel="noopener noreferrer"
        >
          0.05 g CO₂ / view
        </a>
        <span className="mirrors">
          {MIRRORS.map((m, i) => (
            <span key={m.label}>
              {i > 0 && <span className="mirror-sep"> · </span>}
              <a href={m.href} target="_blank" rel="noopener noreferrer">
                {m.label}
              </a>
            </span>
          ))}
        </span>
      </div>
      <div className="webring-wrapper">
        <a
          className="webring"
          href="https://se-webring.xyz"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image src={withBase('/logo_b.svg')} alt="SE Webring" width={32} height={22} />
        </a>
        <div className="webring">
          <a
            className="webring-arrow"
            href={`https://se30webring.com?from=${SITE_URL}&dir=prev`}
          >
            ←
          </a>
          <a href="https://se30webring.com" target="_blank" rel="noopener noreferrer">
            <Image
              src="https://se30webring.com/assets/icon_black.svg"
              alt="SE'30 Webring"
              width={24}
              height={22}
            />
          </a>
          <a
            className="webring-arrow"
            href={`https://se30webring.com?from=${SITE_URL}&dir=next`}
          >
            →
          </a>
        </div>
      </div>
    </footer>
  )
}
