import quotes from '@/data/quotes'
import { RandomQuoteClient } from './RandomQuoteClient'

export function RandomQuote() {
  // The static mirror has no server to roll per request, so it rolls in the
  // browser instead; prod keeps the server-side roll (no client JS for it).
  if (process.env.STATIC_EXPORT === '1') return <RandomQuoteClient />

  // eslint-disable-next-line react-hooks/purity
  const quote = quotes[Math.floor(Math.random() * quotes.length)]

  return (
    <div className="quote">
      <blockquote>&quot;{quote.text}&quot;</blockquote>
      <cite>— {quote.author}</cite>
    </div>
  )
}
