'use client'

import { useEffect, useState } from 'react'

/* "You are visitor number…", in the green-on-black odometer style. There is
   no server counting anybody, so the number is this browser's own visit
   count (localStorage) on top of a base that climbs by the day, which is
   roughly how trustworthy the originals were too. */
const EPOCH = Date.UTC(1999, 0, 1)
const PER_DAY = 37
const KEY = 'hits'
const DIGITS = 7

function baseline(): number {
  return Math.floor((Date.now() - EPOCH) / 86_400_000) * PER_DAY
}

export function HitCounter() {
  const [count, setCount] = useState<number | null>(null)

  useEffect(() => {
    let mine = 0
    try {
      mine = Number(localStorage.getItem(KEY) ?? 0) + 1
      localStorage.setItem(KEY, String(mine))
    } catch {
      mine = 1
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCount(baseline() + mine)
  }, [])

  const digits = String(count ?? 0)
    .padStart(DIGITS, '0')
    .slice(-DIGITS)
    .split('')

  return (
    <span className="footer-fine-item">
      you are visitor number{' '}
      <span className="hit-counter" aria-label={count ? String(count) : 'counting'}>
        {digits.map((d, i) => (
          <span key={i}>{count === null ? '-' : d}</span>
        ))}
      </span>
    </span>
  )
}
