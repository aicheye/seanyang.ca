'use client'

import { useEffect, useState } from 'react'

/**
 * On the UW static mirrors the baked-in data goes stale between redeploys,
 * so after hydration the sections refresh it from jsDelivr, the CORS-open
 * CDN in front of this (public) GitHub repo. Set by scripts/build-static.sh;
 * empty on prod, where the hook returns the baked data untouched.
 */
const DATA_BASE = process.env.NEXT_PUBLIC_DATA_BASE ?? ''

export function useLiveData<T>(file: string, baked: T): T {
  const [data, setData] = useState(baked)
  useEffect(() => {
    if (!DATA_BASE) return
    let cancelled = false
    fetch(`${DATA_BASE}/${file}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json && !cancelled) setData(json)
      })
      .catch(() => {
        /* keep the baked data */
      })
    return () => {
      cancelled = true
    }
  }, [file])
  return data
}
