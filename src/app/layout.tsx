import type { Metadata, Viewport } from 'next'
import { Anton, Comic_Neue, Geist, JetBrains_Mono, Unbounded } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { SITE_URL } from '@/data/site'
import { location } from '@/data/adjectives'
import { withBase } from '@/lib/basePath'
import './globals.css'

/* The screen fonts are the ones every machine shipped with in 1997: Comic
   Sans MS, Impact, Courier New, MS Sans Serif. These two are the fallbacks
   for machines without them (Linux, mostly); globals.css lists them after
   the system names. */
const comicNeue = Comic_Neue({
  weight: ['400', '700'],
  subsets: ['latin'],
  variable: '--font-comic',
})

const anton = Anton({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-anton',
  preload: false,
})

/* Only the print portfolio (ctrl+p) uses these three, so they aren't
   preloaded; the browser fetches them when it prints. */
const geist = Geist({
  subsets: ['latin'],
  variable: '--font-geist',
  preload: false,
})

const unbounded = Unbounded({
  subsets: ['latin'],
  variable: '--font-unbounded',
  preload: false,
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains',
  preload: false,
})

/* viewport-fit=cover draws the page edge-to-edge on iOS, so the dialog
   overlay's dim extends under the notch and home-indicator zones instead of
   Safari painting them opaque while a dialog is open. Content keeps clear of
   those zones via env(safe-area-inset-*) padding in globals.css. */
export const viewport: Viewport = {
  viewportFit: 'cover',
}

export const metadata: Metadata = {
  // Both seanyang.me and seanyang.ca serve this app during the migration, so
  // every page has to declare which one is the real address. Without a
  // canonical the two hosts are duplicate content and search engines pick a
  // winner themselves — this points them at .ca before .me redirects.
  metadataBase: new URL(SITE_URL),
  alternates: { canonical: './' },
  title: 'Sean Yang',
  description: `Student and software developer based in ${location}.`,
  icons: {
    icon: [
      { url: withBase('/favicon-96x96.png'), sizes: '96x96', type: 'image/png' },
      { url: withBase('/favicon.svg'), type: 'image/svg+xml' },
      { url: withBase('/favicon.ico') },
    ],
    apple: { url: withBase('/apple-touch-icon.png'), sizes: '180x180' },
  },
  manifest: withBase('/site.webmanifest'),
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${comicNeue.variable} ${anton.variable} ${geist.variable} ${unbounded.variable} ${jetbrainsMono.variable}`}
    >
      <body>
        {children}
        {/* Vercel telemetry POSTs to /_vercel/* — dead endpoints on the
            linux.student static mirror, so the mirror omits the scripts. */}
        {process.env.STATIC_EXPORT !== '1' && (
          <>
            <Analytics />
            <SpeedInsights />
          </>
        )}
      </body>
    </html>
  )
}
