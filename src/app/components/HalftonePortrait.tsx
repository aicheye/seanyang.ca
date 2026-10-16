'use client'

import { useEffect, useRef } from 'react'
import { withBase } from '@/lib/basePath'

/* My face, screened into halftone dots on a canvas. The source is a tiny
   greyscale crop (public/assets/portrait.webp, ~5KB); the dots are laid on
   a 45° grid like a one-colour print screen, each sized by how dark the
   photo is under it, and fade out toward the edges so the night background
   dissolves into the paper instead of printing as a black square.

   The dots are live: they print on in a diagonal sweep when the page loads,
   a moving pointer brushes them aside and they spring back, and while hovered a
   second, accent-coloured pass prints slightly off register under the ink,
   like a two-colour print that didn't quite line up. */

const SRC = '/assets/portrait.webp'
const SAMPLE = 160 // the photo is read at this many pixels across
const DOTS_ACROSS = 54 // dot pitch is the canvas width over this, so phones get the same screen
const ANGLE = Math.PI / 4 // screen angle
const DOT_MAX = 0.66 // radius of a dot over solid black, as a fraction of the pitch
const INK_CAP = 0.86 // darkness is capped so even the blackest areas keep a dot grid
const GAMMA = 0.7 // < 1 lifts the mid-tones, so the lit face still gets ink
const MIN_RADIUS = 0.2

const PUSH_RADIUS = 36
const PUSH_FORCE = 0.11 // per css px the pointer travels; a still pointer leaves the dots alone
const PUSH_MAX_TRAVEL = 24 // one event's travel is capped so a fast swipe doesn't scatter dots
const SPRING = 0.1
const DAMPING = 0.8
const REST = 0.02 // offsets and velocities below this count as settled

const PRINT_MS = 1100 // the opening sweep, corner to corner
const PRINT_EDGE = 0.18 // width of the sweep's soft edge, as a fraction of the diagonal

const SHIFT_X = 1.4 // accent pass offset, css px
const SHIFT_Y = 0.9
const SHIFT_ALPHA = 0.55

interface Dots {
  n: number
  x: Float32Array
  y: Float32Array
  r: Float32Array
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)))
  return t * t * (3 - 2 * t)
}

function buildDots(img: HTMLImageElement, size: number): Dots {
  const off = document.createElement('canvas')
  off.width = SAMPLE
  off.height = SAMPLE
  const ctx = off.getContext('2d', { willReadFrequently: true })!
  ctx.drawImage(img, 0, 0, SAMPLE, SAMPLE)
  const px = ctx.getImageData(0, 0, SAMPLE, SAMPLE).data

  // Greyscale value at (u, v) in 0..1, bilinear between the four nearest samples.
  const lum = (u: number, v: number): number => {
    const fx = Math.min(Math.max(u * SAMPLE - 0.5, 0), SAMPLE - 1)
    const fy = Math.min(Math.max(v * SAMPLE - 0.5, 0), SAMPLE - 1)
    const x0 = Math.floor(fx)
    const y0 = Math.floor(fy)
    const x1 = Math.min(x0 + 1, SAMPLE - 1)
    const y1 = Math.min(y0 + 1, SAMPLE - 1)
    const tx = fx - x0
    const ty = fy - y0
    const at = (x: number, y: number) => px[(y * SAMPLE + x) * 4]
    const top = at(x0, y0) * (1 - tx) + at(x1, y0) * tx
    const bottom = at(x0, y1) * (1 - tx) + at(x1, y1) * tx
    return (top * (1 - ty) + bottom * ty) / 255
  }

  const half = size / 2
  const pitch = size / DOTS_ACROSS
  const dotMax = pitch * DOT_MAX
  const reach = Math.ceil((half * Math.SQRT2) / pitch) + 1
  const cos = Math.cos(ANGLE)
  const sin = Math.sin(ANGLE)
  const xs: number[] = []
  const ys: number[] = []
  const rs: number[] = []
  for (let i = -reach; i <= reach; i++) {
    for (let j = -reach; j <= reach; j++) {
      const x = half + (i * cos - j * sin) * pitch
      const y = half + (i * sin + j * cos) * pitch
      if (x < 0 || y < 0 || x >= size || y >= size) continue
      const u = x / size
      const v = y / size
      // The face sits a little above centre; the mask is a soft ellipse
      // around it, solid inside and gone by the edge.
      const du = (u - 0.5) * 2
      const dv = (v - 0.45) * 2
      const mask = 1 - smoothstep(0.62, 1.0, Math.hypot(du, dv * 0.86))
      if (mask <= 0) continue
      const dark = Math.min(1 - lum(u, v), INK_CAP)
      const r = Math.pow(dark, GAMMA) * dotMax * mask
      if (r < MIN_RADIUS) continue
      xs.push(x)
      ys.push(y)
      rs.push(r)
    }
  }
  return {
    n: xs.length,
    x: Float32Array.from(xs),
    y: Float32Array.from(ys),
    r: Float32Array.from(rs),
  }
}

export function HalftonePortrait() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const styles = getComputedStyle(document.documentElement)
    const ink = styles.getPropertyValue('--text-h').trim() || '#2a1d15'
    const accent = styles.getPropertyValue('--accent').trim() || '#c8502c'

    let dots: Dots | null = null
    let ox = new Float32Array(0) // per-dot displacement
    let oy = new Float32Array(0)
    let vx = new Float32Array(0)
    let vy = new Float32Array(0)
    let size = 0
    let shift = 0 // 0..1, how far the accent pass has come in
    let pointer: { x: number; y: number } | null = null
    let raf = 0
    let img: HTMLImageElement | null = null
    let printedAt = 0 // when the opening sweep started
    let print = reduceMotion ? 1 : 0 // 0..1, how far the sweep has got

    // Each dot's radius right now: the screened radius, scaled by the sweep
    // front — 0 ahead of it, full behind it, with a soft edge between.
    const radius = (i: number): number => {
      if (print >= 1) return dots!.r[i]
      const along = (dots!.x[i] + dots!.y[i]) / (2 * size)
      const front = print * (1 + PRINT_EDGE)
      return dots!.r[i] * Math.min(1, Math.max(0, (front - along) / PRINT_EDGE))
    }

    const pass = (dx: number, dy: number) => {
      const { n, x, y } = dots!
      ctx.beginPath()
      for (let i = 0; i < n; i++) {
        const rr = radius(i)
        if (rr <= 0) continue
        const cx = x[i] + ox[i] + dx
        const cy = y[i] + oy[i] + dy
        ctx.moveTo(cx + rr, cy)
        ctx.arc(cx, cy, rr, 0, Math.PI * 2)
      }
      ctx.fill()
    }

    const draw = () => {
      if (!dots) return
      const dpr = window.devicePixelRatio || 1
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, size, size)
      if (shift > 0.01) {
        ctx.globalAlpha = SHIFT_ALPHA * shift
        ctx.fillStyle = accent
        pass(SHIFT_X * shift, SHIFT_Y * shift)
        ctx.globalAlpha = 1
      }
      ctx.fillStyle = ink
      pass(0, 0)
    }

    // One physics step. Returns whether anything is still moving.
    const step = (): boolean => {
      if (!dots) return false
      let moving = false
      if (print < 1) {
        print = Math.min(1, (performance.now() - printedAt) / PRINT_MS)
        moving = true
      }
      const target = pointer ? 1 : 0
      if (Math.abs(shift - target) > 0.005) {
        shift += (target - shift) * 0.15
        moving = true
      } else shift = target
      if (reduceMotion) return moving
      const { n } = dots
      for (let i = 0; i < n; i++) {
        vx[i] = (vx[i] - ox[i] * SPRING) * DAMPING
        vy[i] = (vy[i] - oy[i] * SPRING) * DAMPING
        ox[i] += vx[i]
        oy[i] += vy[i]
        if (
          Math.abs(ox[i]) > REST ||
          Math.abs(oy[i]) > REST ||
          Math.abs(vx[i]) > REST ||
          Math.abs(vy[i]) > REST
        )
          moving = true
      }
      return moving
    }

    const loop = () => {
      const moving = step()
      draw()
      raf = moving || pointer ? requestAnimationFrame(loop) : 0
    }
    const wake = () => {
      if (!raf) raf = requestAnimationFrame(loop)
    }

    const rebuild = () => {
      if (!img) return
      const next = Math.round(canvas.clientWidth)
      if (!next) return
      size = next
      const dpr = window.devicePixelRatio || 1
      canvas.width = Math.round(size * dpr)
      canvas.height = Math.round(size * dpr)
      dots = buildDots(img, size)
      ox = new Float32Array(dots.n)
      oy = new Float32Array(dots.n)
      vx = new Float32Array(dots.n)
      vy = new Float32Array(dots.n)
      draw()
    }

    const image = new Image()
    image.decoding = 'async'
    image.onload = () => {
      img = image
      rebuild()
      printedAt = performance.now()
      wake()
    }
    image.src = withBase(SRC)

    const observer = new ResizeObserver(() => {
      if (img && Math.round(canvas.clientWidth) !== size) rebuild()
    })
    observer.observe(canvas)

    // Each pointer move gives the dots around it a shove, outward from the
    // pointer and in proportion to how far it travelled since the last move.
    const brush = (px: number, py: number, travel: number) => {
      if (!dots || reduceMotion) return
      const { n, x, y } = dots
      const f0 = Math.min(travel, PUSH_MAX_TRAVEL) * PUSH_FORCE
      for (let i = 0; i < n; i++) {
        const dx = x[i] + ox[i] - px
        const dy = y[i] + oy[i] - py
        const d = Math.hypot(dx, dy)
        if (d < PUSH_RADIUS && d > 0.001) {
          const f = ((PUSH_RADIUS - d) / PUSH_RADIUS) * f0
          vx[i] += (dx / d) * f
          vy[i] += (dy / d) * f
        }
      }
    }

    const move = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect()
      const px = e.clientX - rect.left
      const py = e.clientY - rect.top
      if (pointer) brush(px, py, Math.hypot(px - pointer.x, py - pointer.y))
      pointer = { x: px, y: py }
      wake()
    }
    const leave = () => {
      pointer = null
      wake()
    }
    canvas.addEventListener('pointermove', move)
    canvas.addEventListener('pointerleave', leave)
    canvas.addEventListener('pointercancel', leave)

    return () => {
      cancelAnimationFrame(raf)
      observer.disconnect()
      image.onload = null
      canvas.removeEventListener('pointermove', move)
      canvas.removeEventListener('pointerleave', leave)
      canvas.removeEventListener('pointercancel', leave)
    }
  }, [])

  return (
    <canvas ref={canvasRef} className="portrait" role="img" aria-label="Halftone portrait of me" />
  )
}
