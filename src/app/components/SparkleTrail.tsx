'use client'

import { useEffect } from 'react'

/* Stars that fall off the cursor, the DHTML classic. Each one is a span the
   sheet animates and this removes once it has faded. Skipped for touch
   screens and for anyone who asked for less motion; globals.css also hides
   .sparkle under both. */
const GLYPHS = ['★', '✦', '✧', '✶', '✸']
const COLORS = ['#ff0', '#0ff', '#f0f', '#fff', '#0f0', '#ff7f00']
const MIN_GAP_MS = 40
const LIFE_MS = 700

export function SparkleTrail() {
  useEffect(() => {
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    let last = 0
    const onMove = (e: MouseEvent) => {
      const now = performance.now()
      if (now - last < MIN_GAP_MS) return
      last = now
      const s = document.createElement('span')
      s.className = 'sparkle'
      s.textContent = GLYPHS[Math.floor(Math.random() * GLYPHS.length)]
      s.style.color = COLORS[Math.floor(Math.random() * COLORS.length)]
      s.style.left = `${e.clientX + (Math.random() * 16 - 8)}px`
      s.style.top = `${e.clientY + (Math.random() * 16 - 8)}px`
      document.body.appendChild(s)
      setTimeout(() => s.remove(), LIFE_MS)
    }
    window.addEventListener('mousemove', onMove, { passive: true })
    return () => window.removeEventListener('mousemove', onMove)
  }, [])

  return null
}
