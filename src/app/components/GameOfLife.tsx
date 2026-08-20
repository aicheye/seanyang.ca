'use client'

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'

const CELL = 14
const TICK = 80
const SIM_STEPS = 300 // generations to look ahead when scoring a seed
const SEED_BUDGET_MS = 500 // max time spent searching for a lively seed
const METHUSELAH_CHANCE = 0.5

// Long-running starter patterns ("methuselahs"), as [row, col] offsets.
const METHUSELAHS: [number, number][][] = [
  // R-pentomino (~1,100 generations)
  [
    [0, 1],
    [0, 2],
    [1, 0],
    [1, 1],
    [2, 1],
  ],
  // Acorn (~5,200 generations)
  [
    [0, 1],
    [1, 3],
    [2, 0],
    [2, 1],
    [2, 4],
    [2, 5],
    [2, 6],
  ],
  // Rabbits (~17,300 generations)
  [
    [0, 0],
    [0, 4],
    [0, 5],
    [0, 6],
    [1, 0],
    [1, 1],
    [1, 2],
    [1, 5],
    [2, 1],
  ],
]

function step(g: Uint8Array, C: number, R: number): Uint8Array {
  const next = new Uint8Array(C * R)
  for (let r = 0; r < R; r++) {
    for (let c = 0; c < C; c++) {
      let n = 0
      for (let dr = -1; dr <= 1; dr++)
        for (let dc = -1; dc <= 1; dc++)
          if (dr || dc) n += g[((r + dr + R) % R) * C + ((c + dc + C) % C)]
      const alive = g[r * C + c]
      next[r * C + c] = alive ? (n === 2 || n === 3 ? 1 : 0) : n === 3 ? 1 : 0
    }
  }
  return next
}

// Color state per cell: a hue vector (hx, hy) whose direction is the hue and
// whose magnitude is the paint strength (1 = freshly painted, 0 = default tan).
const HUE_DECAY = 0.85 // strength multiplier per generation
const HUE_FLOOR = 0.03 // below this a cell renders as plain default

// Like step(), but also advances the hue-vector grid (2 floats per cell).
// Survivors keep their hue and decay; births take the mean of colored
// parents' vectors, also decayed.
function stepColored(
  g: Uint8Array,
  hv: Float32Array,
  C: number,
  R: number,
): [Uint8Array, Float32Array] {
  const next = new Uint8Array(C * R)
  const nextHv = new Float32Array(2 * C * R)
  for (let r = 0; r < R; r++) {
    for (let c = 0; c < C; c++) {
      let n = 0
      let hx = 0
      let hy = 0
      for (let dr = -1; dr <= 1; dr++)
        for (let dc = -1; dc <= 1; dc++) {
          if (!dr && !dc) continue
          const i = ((r + dr + R) % R) * C + ((c + dc + C) % C)
          if (g[i]) {
            n++
            hx += hv[2 * i]
            hy += hv[2 * i + 1]
          }
        }
      const i = r * C + c
      const alive = g[i] ? n === 2 || n === 3 : n === 3
      if (alive) {
        next[i] = 1
        if (g[i]) {
          nextHv[2 * i] = hv[2 * i] * HUE_DECAY
          nextHv[2 * i + 1] = hv[2 * i + 1] * HUE_DECAY
        } else if (n) {
          nextHv[2 * i] = (hx / n) * HUE_DECAY
          nextHv[2 * i + 1] = (hy / n) * HUE_DECAY
        }
      }
    }
  }
  return [next, nextHv]
}

function diffCount(a: Uint8Array, b: Uint8Array): number {
  let d = 0
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) d++
  return d
}

// Cells still changing at generation SIM_STEPS. Compared two generations apart
// so still lifes and period-2 oscillators score 0; bails early once settled.
function activityScore(start: Uint8Array, C: number, R: number): number {
  let a = start
  let b = step(a, C, R)
  let cur = step(b, C, R)
  for (let s = 2; s < SIM_STEPS; s++) {
    if (diffCount(cur, a) === 0) return 0
    a = b
    b = cur
    cur = step(cur, C, R)
  }
  return diffCount(cur, a)
}

function stampMethuselah(g: Uint8Array, C: number, R: number) {
  const pattern = METHUSELAHS[Math.floor(Math.random() * METHUSELAHS.length)]
  const t = Math.floor(Math.random() * 8) // one of the 8 grid symmetries
  const r0 = Math.floor(Math.random() * R)
  const c0 = Math.floor(Math.random() * C)
  for (const [pr, pc] of pattern) {
    const [r, c] = [
      [pr, pc],
      [pr, -pc],
      [-pr, pc],
      [-pr, -pc],
      [pc, pr],
      [pc, -pr],
      [-pc, pr],
      [-pc, -pr],
    ][t]
    const rr = (((r0 + r) % R) + R) % R
    const cc = (((c0 + c) % C) + C) % C
    g[rr * C + cc] = 1
  }
}

export function GameOfLife() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const grid = useRef<Uint8Array>(new Uint8Array(0))
  const hueVec = useRef<Float32Array>(new Float32Array(0))
  const cols = useRef(0)
  const rows = useRef(0)
  const painting = useRef(false)
  const paintHue = useRef(Math.random() * 360)
  const lastPainted = useRef(-1)
  const timer = useRef<ReturnType<typeof setInterval> | undefined>(undefined)

  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  )

  const [density, setDensity] = useState(5) // 1–10: sparse → dense
  const sparsityRef = useRef(6) // derived: 11 - density
  const densityRef = useRef(5)
  const render = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    const C = cols.current
    const R = rows.current
    const g = grid.current
    const hv = hueVec.current
    for (let r = 0; r < R; r++) {
      for (let c = 0; c < C; c++) {
        const i = r * C + c
        if (g[i]) {
          const hx = hv[2 * i]
          const hy = hv[2 * i + 1]
          const s = Math.min(1, Math.hypot(hx, hy))
          ctx.fillStyle = '#eae3cd'
          ctx.fillRect(c * CELL + 1, r * CELL + 1, CELL - 2, CELL - 2)
          if (s > HUE_FLOOR) {
            const hue = ((Math.atan2(hy, hx) * 180) / Math.PI + 360) % 360
            ctx.globalAlpha = s
            ctx.fillStyle = `hsl(${hue}, 65%, 82%)`
            ctx.fillRect(c * CELL + 1, r * CELL + 1, CELL - 2, CELL - 2)
            ctx.globalAlpha = 1
          }
        }
      }
    }
  }, [])

  const tick = useCallback(() => {
    ;[grid.current, hueVec.current] = stepColored(
      grid.current,
      hueVec.current,
      cols.current,
      rows.current,
    )
    render()
  }, [render])

  const paint = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = canvasRef.current
      if (!canvas) return
      const rect = canvas.getBoundingClientRect()
      const c = Math.floor((clientX - rect.left) / CELL)
      const r = Math.floor((clientY - rect.top) / CELL)
      const C = cols.current
      const R = rows.current
      if (c >= 0 && c < C && r >= 0 && r < R) {
        const i = r * C + c
        grid.current[i] = 1
        hueVec.current[2 * i] = Math.cos((paintHue.current * Math.PI) / 180)
        hueVec.current[2 * i + 1] = Math.sin((paintHue.current * Math.PI) / 180)
        // Advance the rainbow only on entering a new cell, not on every mousemove
        if (i !== lastPainted.current) {
          lastPainted.current = i
          paintHue.current = (paintHue.current + 7) % 360
        }
        render()
      }
    },
    [render],
  )

  const buildCandidate = useCallback((C: number, R: number): Uint8Array => {
    const g = new Uint8Array(C * R)
    // sparsity 1–10 → divisor 200–5000 (log scale), halved on mobile for more clusters
    const mobile = window.innerWidth <= 1000
    const divisor = (mobile ? 100 : 200) * Math.pow(25, (sparsityRef.current - 1) / 9)
    const clusterCount = Math.max(1, Math.floor((C * R) / divisor))
    // Cap fill so clusters stay porous — solid blobs all die at once on the first tick (the "flash").
    const fillProb = 0.15 + (densityRef.current / 10) * 0.35 // 0.18 (sparse) → 0.5 (dense)
    for (let k = 0; k < clusterCount; k++) {
      const cx = Math.random() * C
      const cy = Math.random() * R
      const radius = 3 + Math.random() * 4
      for (let dr = -Math.ceil(radius); dr <= Math.ceil(radius); dr++) {
        for (let dc = -Math.ceil(radius); dc <= Math.ceil(radius); dc++) {
          const dist = Math.sqrt(dr * dr + dc * dc)
          if (dist <= radius && Math.random() < fillProb) {
            const r = Math.round(cy + dr)
            const c = Math.round(cx + dc)
            if (r >= 0 && r < R && c >= 0 && c < C) g[r * C + c] = 1
          }
        }
      }
    }
    // At most one methuselah per board so boards don't feel same-y
    if (Math.random() < METHUSELAH_CHANCE) stampMethuselah(g, C, R)
    return g
  }, [])

  const seed = useCallback(() => {
    const C = cols.current
    const R = rows.current
    // Enough ongoing change to read as "alive" — roughly two gliders' worth on desktop
    const threshold = Math.max(15, Math.floor(C * R * 0.002))
    const deadline = performance.now() + SEED_BUDGET_MS
    let best = buildCandidate(C, R)
    let bestScore = activityScore(best, C, R)
    while (bestScore < threshold && performance.now() < deadline) {
      const candidate = buildCandidate(C, R)
      const score = activityScore(candidate, C, R)
      if (score > bestScore) {
        best = candidate
        bestScore = score
      }
    }
    grid.current = best
    hueVec.current = new Float32Array(2 * cols.current * rows.current)
    render()
  }, [buildCandidate, render])

  const clear = useCallback(() => {
    grid.current = new Uint8Array(cols.current * rows.current)
    hueVec.current = new Float32Array(2 * cols.current * rows.current)
    render()
  }, [render])

  useEffect(() => {
    const canvas = canvasRef.current!

    // Initial setup: size canvas and seed
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
    cols.current = Math.ceil(canvas.width / CELL)
    rows.current = Math.ceil(canvas.height / CELL)
    seed()

    timer.current = setInterval(tick, TICK)

    // On resize: preserve existing grid, copy cells into new dimensions
    let resizeTimer: ReturnType<typeof setTimeout>
    const resize = () => {
      clearTimeout(resizeTimer)
      resizeTimer = setTimeout(() => {
        const newCols = Math.ceil(window.innerWidth / CELL)
        const newRows = Math.ceil(window.innerHeight / CELL)
        const oldGrid = grid.current
        const oldCols = cols.current
        const oldRows = rows.current
        const oldHv = hueVec.current
        const newGrid = new Uint8Array(newCols * newRows)
        const newHv = new Float32Array(2 * newCols * newRows)
        const minR = Math.min(oldRows, newRows)
        const minC = Math.min(oldCols, newCols)
        for (let r = 0; r < minR; r++)
          for (let c = 0; c < minC; c++) {
            newGrid[r * newCols + c] = oldGrid[r * oldCols + c]
            newHv[2 * (r * newCols + c)] = oldHv[2 * (r * oldCols + c)]
            newHv[2 * (r * newCols + c) + 1] = oldHv[2 * (r * oldCols + c) + 1]
          }
        canvas.width = window.innerWidth
        canvas.height = window.innerHeight
        cols.current = newCols
        rows.current = newRows
        grid.current = newGrid
        hues.current = newHues
        render()
      }, 400)
    }
    window.addEventListener('resize', resize)

    const down = (e: MouseEvent) => {
      painting.current = true
      paint(e.clientX, e.clientY)
    }
    const move = (e: MouseEvent) => {
      if (painting.current) paint(e.clientX, e.clientY)
    }
    const up = () => {
      painting.current = false
    }
    window.addEventListener('mousedown', down)
    window.addEventListener('mousemove', move)
    window.addEventListener('mouseup', up)

    return () => {
      clearTimeout(resizeTimer)
      window.removeEventListener('resize', resize)
      clearInterval(timer.current)
      window.removeEventListener('mousedown', down)
      window.removeEventListener('mousemove', move)
      window.removeEventListener('mouseup', up)
    }
  }, [tick, paint, render, seed])

  return (
    <>
      <canvas
        ref={canvasRef}
        style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}
      />
      {mounted && (
        <div className="gol-controls" style={{ position: 'fixed', top: 20, right: 24, zIndex: 2 }}>
          <a
            href="https://en.wikipedia.org/wiki/Conway%27s_Game_of_Life"
            target="_blank"
            rel="noopener noreferrer"
            className="gol-link"
          >
            Conway&apos;s Game of Life ↗
          </a>
          <label className="gol-slider-row">
            <span>density</span>
            <input
              type="range"
              min={1}
              max={10}
              step={1}
              value={density}
              onChange={(e) => {
                const v = Number(e.target.value)
                setDensity(v)
                densityRef.current = v
                sparsityRef.current = 11 - v
                seed()
              }}
            />
          </label>
          <div className="gol-btn-row">
            <button className="gol-btn" onClick={clear}>
              clear
            </button>
            <button className="gol-btn" onClick={seed}>
              regenerate
            </button>
          </div>
        </div>
      )}
    </>
  )
}
