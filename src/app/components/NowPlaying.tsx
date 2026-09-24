'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { withBase } from '@/lib/basePath'
import { LoadingSkeleton } from './LoadingSkeleton'

interface Track {
  isPlaying: boolean
  title: string
  artist: string
  albumArt: string | null
  url: string | null
  progressMs: number | null
  durationMs: number | null
  asOf: number | null
  // performance.now() when this response arrived.
  receivedAt: number
}

const FALLBACK_COLOR = '#8a5c42'
// Label colour while the new cover's colour is still being extracted.
const PENDING_COLOR = '#fff'

type Face = 'front' | 'back'

// A response can be up to ~3s old (the route's cache) plus network time. The
// client's clock is only trusted for this much, so a skewed clock can shift
// the bar by at most this amount.
const MAX_RESPONSE_AGE_MS = 5_000

// Reserves the progress bar's space in the loading card.
const PLACEHOLDER_TRACK: Track = {
  isPlaying: false,
  title: '',
  artist: '',
  albumArt: null,
  url: null,
  progressMs: null,
  durationMs: null,
  asOf: null,
  receivedAt: 0,
}

// m:ss, as Spotify shows it.
function formatTime(ms: number): string {
  const total = Math.floor(ms / 1000)
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
}

// Read-only progress bar (fill, elapsed and total time) above the track title.
// Between polls it advances locally from the last reported position. Each
// frame it writes --np-progress and the elapsed text directly, so React
// doesn't re-render at 60fps; useLayoutEffect draws before the first paint so
// a new poll never shows a stale position for a frame.
function ProgressBar({ track, shown }: { track: Track; shown: boolean }) {
  const bar = useRef<HTMLSpanElement>(null)
  const elapsed = useRef<HTMLSpanElement>(null)
  const { progressMs, durationMs, asOf, receivedAt, isPlaying } = track
  useLayoutEffect(() => {
    if (progressMs === null || !durationMs || asOf === null) return
    const age = Math.min(Math.max(Date.now() - asOf, 0), MAX_RESPONSE_AGE_MS)
    let raf = 0
    let shownText = ''
    const draw = () => {
      const pos = Math.min(
        progressMs + (isPlaying ? age + performance.now() - receivedAt : 0),
        durationMs,
      )
      bar.current?.style.setProperty('--np-progress', String(pos / durationMs))
      const text = formatTime(pos)
      if (text !== shownText && elapsed.current) elapsed.current.textContent = shownText = text
      if (isPlaying) raf = requestAnimationFrame(draw)
    }
    draw()
    return () => cancelAnimationFrame(raf)
  }, [progressMs, durationMs, asOf, receivedAt, isPlaying])

  // Shown while the record is out (the caller passes that), so the bar comes
  // in with the record and goes when it tucks in: on pause, on a track change
  // and before the first load is ready. It slides up toward the art, fades and
  // collapses its row, keeping the last drawn position while it goes.
  return (
    <span className={`np-progress${shown ? '' : ' np-progress-hidden'}`} aria-hidden="true">
      <span className="np-progress-inner">
        <span ref={bar} className="np-progress-bar">
          <span className="np-progress-fill" />
        </span>
        <span className="np-progress-times">
          <span ref={elapsed} />
          <span>{durationMs ? formatTime(durationMs) : ''}</span>
        </span>
      </span>
    </span>
  )
}

// Placeholder bars while the first track loads.
const skel = { height: '0.65em', borderRadius: 2, containerClassName: 'np-skel' }

// Fills a cover face until its art has loaded.
const coverSkel = (
  <LoadingSkeleton height="100%" borderRadius={4} containerClassName="np-cover-skel" />
)

// The record image behind the cover (.np-vinyl).
const RECORD = withBase('/assets/vinyl/record.png')

// Grain textures drawn over each cover by .np-cover::before/::after.
const COVER_TEX = [
  withBase('/assets/vinyl/cover-tex.jpg'),
  withBase('/assets/vinyl/cover-tex2.jpg'),
]

// The static mirrors have no server, so they call prod's API routes
// cross-origin (set by scripts/build-static.sh). Empty on prod itself.
const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? ''

function rgbToHsl(r: number, g: number, b: number) {
  r /= 255
  g /= 255
  b /= 255
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b)
  const d = max - min
  const l = (max + min) / 2
  let h = 0
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1))
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6
    else if (max === g) h = (b - r) / d + 2
    else h = (r - g) / d + 4
    h *= 60
    if (h < 0) h += 360
  }
  return { h, s, l }
}

// Animated covers (GIF / animated WebP) get promoted to their own compositing
// layer, which stops the `mix-blend-mode: screen` texture overlays from
// blending — so the texture disappears. Drawing one frame to a canvas and
// using that static data URL as the cover keeps the overlay working (and stops
// the distracting loop). Cached per URL so we only pay the decode once.
const frameCache = new Map<string, string>()
async function freezeFrame(artUrl: string): Promise<string | null> {
  const cached = frameCache.get(artUrl)
  if (cached) return cached
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image()
      el.crossOrigin = 'anonymous' // canvas reads pixels; required cross-origin
      el.onload = () => resolve(el)
      el.onerror = reject
      el.src = `${API_BASE}/api/spotify/art?url=${encodeURIComponent(artUrl)}`
    })
    const max = 320
    const scale = Math.min(1, max / Math.max(img.naturalWidth || max, img.naturalHeight || max))
    const w = Math.max(1, Math.round((img.naturalWidth || max) * scale))
    const h = Math.max(1, Math.round((img.naturalHeight || max) * scale))
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    canvas.getContext('2d')!.drawImage(img, 0, 0, w, h)
    const url = canvas.toDataURL('image/jpeg', 0.92)
    frameCache.set(artUrl, url)
    return url
  } catch {
    return null
  }
}

// Downsample the art to a coarse 16×16 grid (each cell is an averaged block of
// the original), then pick the most saturated cell — ignoring near-black and
// near-white cells that have no real colour. The bucketing tames noise while
// the max-saturation pick keeps the vivid colour the art is actually built on.
async function extractDominantColor(artUrl: string): Promise<string> {
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image()
      el.crossOrigin = 'anonymous' // canvas reads pixels; required cross-origin
      el.onload = () => resolve(el)
      el.onerror = reject
      el.src = `${API_BASE}/api/spotify/art?url=${encodeURIComponent(artUrl)}`
    })
    const N = 16
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = N
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(img, 0, 0, N, N)
    const { data } = ctx.getImageData(0, 0, N, N)

    let best = FALLBACK_COLOR
    let bestS = -1
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] < 128) continue // skip transparent
      const r = data[i],
        g = data[i + 1],
        b = data[i + 2]
      const { s, l } = rgbToHsl(r, g, b)
      if (l < 0.12 || l > 0.92) continue // ignore near-black / near-white cells
      if (s > bestS) {
        bestS = s
        best = `rgb(${r},${g},${b})`
      }
    }
    return best
  } catch {
    return FALLBACK_COLOR
  }
}

export function NowPlaying() {
  const [track, setTrack] = useState<Track | null>(null)
  const [awaitingFirst, setAwaitingFirst] = useState(true)
  const [labelColor, setLabelColor] = useState(FALLBACK_COLOR)
  const [recordOut, setRecordOut] = useState(false)
  const [flipHide, setFlipHide] = useState(false)
  const [coverAngle, setCoverAngle] = useState(0)
  const [frontOnTop, setFrontOnTop] = useState(true)
  const [frontArt, setFrontArt] = useState<string | null>(null)
  const [backArt, setBackArt] = useState<string | null>(null)
  // Image URLs (art, frozen frames, grain textures) the browser has decoded.
  const [loadedArt, setLoadedArt] = useState<ReadonlySet<string>>(() => new Set())
  // Face whose frozen frame is still being fetched; it shows the skeleton until then.
  const [loadingFace, setLoadingFace] = useState<Face | null>(null)
  const prevArtRef = useRef<string | null>(null)
  const prevKeyRef = useRef<string | null>(null)
  const wasPlayingRef = useRef(false)
  const angleRef = useRef(0)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/spotify/now-playing`)
        if (res.ok) setTrack({ ...(await res.json()), receivedAt: performance.now() })
      } catch {
        /* ignore transient fetch errors; the next poll retries */
      } finally {
        setAwaitingFirst(false)
      }
    }
    load()
    const poll = setInterval(load, 3_000)
    return () => clearInterval(poll)
  }, [])

  // On a track change while playing: record in → flip → record out. The flip
  // does not wait for the new art or colour; they fill in when they arrive.
  const trackKey = `${track?.title ?? ''}__${track?.artist ?? ''}`
  const isPlaying = track?.isPlaying ?? false
  const albumArt = track?.albumArt ?? null
  useEffect(() => {
    if (!track?.title) return // nothing real yet — don't touch the refs (avoids a first-load flip)

    // Which face currently shows: front when the angle is an even multiple of 180°, else back.
    const frontVisible = Math.round(angleRef.current / 180) % 2 === 0
    const setFaceArt = (face: Face, art: string | null) =>
      face === 'front' ? setFrontArt(art) : setBackArt(art)
    const setVisibleArt = (art: string | null) => setFaceArt(frontVisible ? 'front' : 'back', art)

    // Kick off colour extraction as soon as the art changes (runs in parallel with everything).
    const artChanged = albumArt !== prevArtRef.current
    prevArtRef.current = albumArt
    const colorPromise = artChanged && albumArt ? extractDominantColor(albumArt) : null
    // Static frame for display (keeps the blend-mode texture working on animated
    // covers); resolves to the raw URL if freezing fails.
    const framePromise = albumArt ? freezeFrame(albumArt).then((f) => f ?? albumArt) : null
    // Applies the extracted colour unless the art has changed again since. It is
    // not tied to a flip's cancellation: a cancelled flip must not leave the label
    // on PENDING_COLOR, which would keep the record tucked in.
    const applyColor = (p: Promise<string>) =>
      p.then((c) => {
        if (prevArtRef.current === albumArt) setLabelColor(c)
      })

    const wasPlaying = wasPlayingRef.current
    wasPlayingRef.current = isPlaying

    // Record in → flip → optionally back out.
    // slideOutAtEnd=false leaves the record tucked in (used when playback stops).
    const runFlip = (slideOutAtEnd: boolean) => {
      let cancelled = false
      const timers: ReturnType<typeof setTimeout>[] = []
      const wait = (ms: number) => new Promise<void>((r) => timers.push(setTimeout(r, ms)))
      const incoming: Face = frontVisible ? 'back' : 'front'
      let colorStarted = false

      ;(async () => {
        setRecordOut(false) // 1. record slides in behind the cover
        await wait(1000)
        if (cancelled) return

        // 2. flip now; the incoming face shows the skeleton and the label stays white
        //    until the frame and colour resolve (either may already have).
        if (colorPromise) {
          colorStarted = true
          setLabelColor(PENDING_COLOR)
          applyColor(colorPromise)
        }
        setFaceArt(incoming, null)
        if (framePromise) {
          setLoadingFace(incoming)
          framePromise.then((f) => {
            if (cancelled) return
            setFaceArt(incoming, f)
            setLoadingFace(null)
          })
        }
        setFlipHide(true) //    hide the record through the whole flip
        angleRef.current += 180
        setCoverAngle(angleRef.current) //    …and start the flip
        await wait(450) //    reach edge-on (90°)
        if (cancelled) return
        setFrontOnTop(!frontVisible) //    bring the incoming face forward at the edge
        await wait(450) //    finish the flip (180°)
        if (cancelled) return
        setFlipHide(false)

        if (slideOutAtEnd) setRecordOut(true) // 3. record slides back out (skipped when stopped)
      })()

      return () => {
        cancelled = true
        setFlipHide(false)
        setLoadingFace(null)
        timers.forEach(clearTimeout)
        // Cancelled before the flip: still give the new art its colour.
        if (colorPromise && !colorStarted) applyColor(colorPromise)
      }
    }

    const settle = (out: boolean) => {
      setRecordOut(out)
      setLoadingFace(null)
      setVisibleArt(albumArt) // paint something immediately…
      framePromise?.then((f) => {
        if (f) setVisibleArt(f)
      }) // …then upgrade to the static frame
      setFrontOnTop(frontVisible)
      if (colorPromise) {
        setLabelColor(PENDING_COLOR)
        applyColor(colorPromise)
      }
    }

    if (!isPlaying) {
      prevKeyRef.current = trackKey
      // Playback just stopped after playing: animate in → flip, but stay in (no slide out).
      if (wasPlaying && artChanged) return runFlip(false)
      settle(false) // already stopped, or art unchanged — just settle in
      return
    }

    const prev = prevKeyRef.current
    prevKeyRef.current = trackKey
    // Same song (e.g. resumed): the record slides out from where it is — no flip.
    if (prev === trackKey) {
      settle(true)
      return
    }

    // First appearance: the record element was just mounted, so setting it out
    // in the same frame skips the transition. Mount it in, then slide it out
    // after the browser has painted that position (two frames).
    if (prev === null) {
      settle(false)
      let raf = requestAnimationFrame(() => {
        raf = requestAnimationFrame(() => setRecordOut(true))
      })
      return () => cancelAnimationFrame(raf)
    }

    // Song changed while playing: in → flip → out.
    return runFlip(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackKey, isPlaying, albumArt])

  // No raw-URL fallback while the front face is loading, so the skeleton shows.
  const frontFill = loadingFace === 'front' ? null : (frontArt ?? albumArt)
  useEffect(() => {
    for (const url of [frontFill, backArt, RECORD, ...COVER_TEX]) {
      if (!url || loadedArt.has(url)) continue
      const img = new Image()
      img.src = url
      // decode() resolves once the image is decoded, not only downloaded, so a
      // face is not revealed while one of its layers is still decoding.
      const done = () => setLoadedArt((prev) => new Set(prev).add(url))
      img.decode().then(done, done)
    }
  }, [frontFill, backArt, loadedArt])
  const artReady = (url: string | null) => !url || loadedArt.has(url)
  // The art and grain overlays paint under the skeleton from the start; the
  // skeleton is removed once both textures and the face's art have loaded, so
  // all three appear in the same frame.
  const faceReady = (face: Face, url: string | null) =>
    loadingFace !== face && artReady(url) && COVER_TEX.every((t) => loadedArt.has(t))
  const frontReady = faceReady('front', frontFill)
  const backReady = faceReady('back', backArt)
  // The record only slides out once it is fully ready (record.png decoded and
  // the label's colour extracted) and the cover in front of it shows its art;
  // on a slow network it waits tucked in.
  const vinylReady = loadedArt.has(RECORD) && labelColor !== PENDING_COLOR
  const vinylOut = recordOut && vinylReady && (frontOnTop ? frontReady : backReady)

  if (!track || !track.title) {
    // Nothing to show after the first response — give the space back.
    if (!awaitingFirst) return null
    // Same footprint as the loaded card (the card is in the page flow on
    // mobile, so appearing from nothing shifts everything below it).
    return (
      <div className="now-playing np-loading" aria-hidden="true">
        <div className="np-album">
          <div className="np-cover">{coverSkel}</div>
        </div>
        <div className="np-info">
          <ProgressBar track={PLACEHOLDER_TRACK} shown={false} />
          <span className="np-title">
            <span className="np-title-text">
              <LoadingSkeleton width={110} {...skel} />
            </span>
          </span>
          <span className="np-artist">
            <LoadingSkeleton width={72} {...skel} />
          </span>
        </div>
      </div>
    )
  }

  const { title, artist } = track
  const frontStyle = {
    backgroundImage: frontFill ? `url(${frontFill})` : undefined,
    zIndex: frontOnTop ? 2 : 1,
  }
  const backStyle = {
    backgroundImage: backArt ? `url(${backArt})` : undefined,
    zIndex: frontOnTop ? 1 : 2,
  }

  return (
    <a
      className={`now-playing${vinylOut ? ' np-record-out' : ''}`}
      href={
        track.url ??
        `${API_BASE}/api/spotify?title=${encodeURIComponent(title)}&artist=${encodeURIComponent(artist)}`
      }
      target="_blank"
      rel="noopener noreferrer"
    >
      <div
        className="np-album"
        style={
          {
            '--vinyl-record': `url(${RECORD})`,
            '--vinyl-tex1': `url(${COVER_TEX[0]})`,
            '--vinyl-tex2': `url(${COVER_TEX[1]})`,
          } as React.CSSProperties
        }
      >
        <div
          className={`np-vinyl${vinylOut ? ' np-vinyl-out' : ''}${flipHide ? ' np-vinyl-hidden' : ''}`}
        >
          <div className="np-print" style={{ background: labelColor }} />
        </div>
        <div className="np-cover-flip" style={{ transform: `rotateY(${coverAngle}deg)` }}>
          <div className="np-cover np-cover-front" style={frontStyle}>
            {!frontReady && coverSkel}
          </div>
          <div className="np-cover np-cover-back" style={backStyle}>
            {!backReady && coverSkel}
          </div>
        </div>
      </div>
      <div className="np-info">
        <ProgressBar track={track} shown={vinylOut && track.progressMs !== null} />
        <span className="np-title">
          {isPlaying && (
            <span className="np-eq" aria-label="Now playing">
              <span />
              <span />
              <span />
            </span>
          )}
          <span className="np-title-text">{title}</span>
        </span>
        <span className="np-artist">{artist}</span>
      </div>
    </a>
  )
}
