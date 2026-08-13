import Image from 'next/image'
import { REGISTERED_ORIGIN } from '@/data/site'

export function Footer() {
  return (
    <footer>
      {/* The slug is the scanned host, so it tracks the canonical domain. */}
      <a
        href="https://websitecarbon.com/website/seanyang-ca/"
        target="_blank"
        rel="noopener noreferrer"
      >
        0.04 g CO₂ / view
      </a>
      <div className="webring-wrapper">
        <a
          className="webring"
          href="https://se-webring.xyz"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image src="/logo_b.svg" alt="SE Webring" width={32} height={22} />
        </a>
        <div className="webring">
          <a
            className="webring-arrow"
            href={`https://se30webring.com?from=${REGISTERED_ORIGIN}&dir=prev`}
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
            href={`https://se30webring.com?from=${REGISTERED_ORIGIN}&dir=next`}
          >
            →
          </a>
        </div>
      </div>
    </footer>
  )
}
