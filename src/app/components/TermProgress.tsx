'use client'

import { useEffect, useState } from 'react'

const START_MS = Date.UTC(2025, 8, 1) // 2025-09-01
const END_MS = Date.UTC(2030, 4, 1) // 2030-05-01
const TOTAL_MS = END_MS - START_MS

function toPct(ms: number): number {
  return ((ms - START_MS) / TOTAL_MS) * 100
}

const TICK_PCTS = [
  Date.UTC(2026, 0, 1),
  Date.UTC(2026, 4, 1),
  Date.UTC(2026, 8, 1),
  Date.UTC(2027, 0, 1),
  Date.UTC(2027, 4, 1),
  Date.UTC(2027, 8, 1),
  Date.UTC(2028, 0, 1),
  Date.UTC(2028, 4, 1),
  Date.UTC(2028, 8, 1),
  Date.UTC(2029, 0, 1),
  Date.UTC(2029, 4, 1),
  Date.UTC(2029, 8, 1),
  Date.UTC(2030, 0, 1),
].map(toPct)

export function TermProgress() {
  const [progressPct, setProgressPct] = useState(() =>
    Math.max(0, Math.min(100, toPct(Date.now()))),
  )

  useEffect(() => {
    const id = setInterval(() => {
      setProgressPct(Math.max(0, Math.min(100, toPct(Date.now()))))
    }, 50)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="term-progress">
      <div className="term-label">
        <a href="https://uwaterloo.ca/software-engineering/about-software-engineering" target="_blank" rel="noopener noreferrer">uwaterloo bse &apos;30</a>
        <span suppressHydrationWarning style={{ fontFamily: 'var(--font-mono), monospace' }}>
          {progressPct.toFixed(8)}%
        </span>
      </div>
      <div className="term-bar">
        <div className="term-fill" suppressHydrationWarning style={{ width: `${progressPct}%` }} />
        {TICK_PCTS.map((pct, i) => (
          <div key={i} className="term-tick" style={{ left: `${pct}%` }} />
        ))}
      </div>
    </div>
  )
}
