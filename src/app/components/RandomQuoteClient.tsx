'use client'

import { useEffect, useState } from 'react'
import quotes from '@/data/quotes'

/* Static-mirror variant of RandomQuote: with no server to roll a quote per
   request, the roll happens in the browser after hydration. Until then the
   block renders quotes[0] with visibility:hidden — it reserves space so the
   page doesn't jump, but no build-time quote is ever visible, so there's no
   flash of one quote being swapped for another. */
export function RandomQuoteClient() {
  const [quote, setQuote] = useState<(typeof quotes)[number] | null>(null)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/purity
    setQuote(quotes[Math.floor(Math.random() * quotes.length)])
  }, [])

  const shown = quote ?? quotes[0]

  return (
    <div className="quote-reserve">
      <div className="quote" style={quote ? undefined : { visibility: 'hidden' }}>
        <blockquote>&quot;{shown.text}&quot;</blockquote>
        <cite>— {shown.author}</cite>
      </div>
    </div>
  )
}
