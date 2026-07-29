'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { FiPlay, FiX } from 'react-icons/fi'

export function ProjectDemo({
  title,
  media,
  github,
}: {
  title: string
  media: string
  github: string
}) {
  const [open, setOpen] = useState(false)
  const [src, setSrc] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)
  const trigger = useRef<HTMLButtonElement>(null)
  const closeBtn = useRef<HTMLButtonElement>(null)

  const close = useCallback(() => {
    setOpen(false)
    trigger.current?.focus()
  }, [])

  /* Fetch as a blob URL so playback always restarts from frame 0 —
     a cached <img> src can resume mid-loop in some browsers. */
  useEffect(() => {
    if (!open) return
    const controller = new AbortController()
    let url: string | null = null
    fetch(media, { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw new Error(`${r.status}`)
        return r.blob()
      })
      .then((blob) => {
        url = URL.createObjectURL(blob)
        setSrc(url)
      })
      .catch(() => {
        if (!controller.signal.aborted) setFailed(true)
      })
    return () => {
      controller.abort()
      if (url) URL.revokeObjectURL(url)
      setSrc(null)
      setFailed(false)
    }
  }, [open, media])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeBtn.current?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [open, close])

  return (
    <>
      <button
        ref={trigger}
        className="demo-play"
        aria-label={`Play ${title} demo`}
        onClick={() => setOpen(true)}
      >
        <FiPlay size={9} />
      </button>
      {open &&
        createPortal(
          <div className="demo-overlay" onClick={close}>
            <div
              className="demo-modal"
              role="dialog"
              aria-modal="true"
              aria-label={`${title} demo`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="demo-header">
                <span className="demo-title">{title}</span>
                <button
                  ref={closeBtn}
                  className="demo-close"
                  aria-label="Close demo"
                  onClick={close}
                >
                  <FiX size={14} />
                </button>
              </div>
              {src ? (
                <a
                  href={github}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="demo-media-link"
                  aria-label={`View ${title} on GitHub`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- blob URL, next/image can't optimize it */}
                  <img src={src} alt={`${title} demo`} />
                </a>
              ) : (
                <div className="demo-loading">{failed ? 'demo unavailable' : 'loading…'}</div>
              )}
            </div>
          </div>,
          document.body,
        )}
    </>
  )
}
