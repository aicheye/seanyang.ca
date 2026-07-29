import Image from 'next/image'

export function Footer() {
  return (
    <footer>
      <a
        href="https://websitecarbon.com/website/seanyang-me/"
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
            href="https://se30webring.com?from=https://seanyang.me&dir=prev"
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
            href="https://se30webring.com?from=https://seanyang.me&dir=next"
          >
            →
          </a>
        </div>
      </div>
    </footer>
  )
}
