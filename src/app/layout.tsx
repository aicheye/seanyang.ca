import type { Metadata, Viewport } from 'next'
import { Geist, Unbounded, JetBrains_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { SITE_URL } from '@/data/site'
import './globals.css'

const geist = Geist({
  subsets: ['latin'],
  variable: '--font-geist',
})

const unbounded = Unbounded({
  subsets: ['latin'],
  variable: '--font-unbounded',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
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
  description: 'Student and software developer based in Waterloo, ON.',
  icons: {
    icon: [
      { url: '/favicon-96x96.png', sizes: '96x96', type: 'image/png' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico' },
    ],
    apple: { url: '/apple-touch-icon.png', sizes: '180x180' },
  },
  manifest: '/site.webmanifest',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} ${unbounded.variable} ${jetbrainsMono.variable}`}>
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
