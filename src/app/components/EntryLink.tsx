'use client'

import Image from 'next/image'
import { useCallback, useEffect, useId, useRef, useState } from 'react'
import type { MouseEvent } from 'react'
import { createPortal } from 'react-dom'
import { FiExternalLink, FiPlay, FiX } from 'react-icons/fi'

export interface EntryLinkProps {
  /** Text shown in the list and as the dialog heading. */
  title: string
  href: string
  description?: string
  technologies?: string[]
  /** Demo gif/image shown inside the dialog. */
  media?: string
  /** Small image shown beside the dialog heading (e.g. a company logo). */
  icon?: string
  /** Short facts rendered under the heading, joined with a middot. */
  meta?: string[]
  className?: string
}

/** "https://github.com/aicheye/crustty/" -> "github.com/aicheye/crustty" */
function linkLabel(href: string): string {
  return href.replace(/^https?:\/\//, '').replace(/\/$/, '')
}

export function EntryLink({
  title,
  href,
  description,
  technologies,
  media,
  icon,
  meta,
  className,
}: EntryLinkProps) {
  const [open, setOpen] = useState(false)
  const [src, setSrc] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)
  const trigger = useRef<HTMLAnchorElement>(null)
  const modal = useRef<HTMLDivElement>(null)
  const closeBtn = useRef<HTMLButtonElement>(null)
  const titleId = useId()

  const close = useCallback(() => {
    setOpen(false)
    trigger.current?.focus()
  }, [])

  /* Let modified clicks (new tab/window, middle click) reach the browser so the
     link still behaves like a link; a plain click opens the dialog instead. */
  const onTriggerClick = useCallback((e: MouseEvent<HTMLAnchorElement>) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return
    e.preventDefault()
    setOpen(true)
  }, [])

  /* Fetch as a blob URL so playback always restarts from frame 0 —
     a cached <img> src can resume mid-loop in some browsers. */
  useEffect(() => {
    if (!open || !media) return
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
      if (e.key === 'Escape') {
        close()
        return
      }
      if (e.key !== 'Tab') return
      // Keep focus inside the dialog.
      const focusable = modal.current?.querySelectorAll<HTMLElement>('a[href], button')
      if (!focusable || focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
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
      <a
        ref={trigger}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
        aria-haspopup="dialog"
        onClick={onTriggerClick}
      >
        {title}
        {media && (
          <span className="entry-media-hint" aria-hidden="true">
            <FiPlay size={8} />
          </span>
        )}
      </a>
      {open &&
        createPortal(
          <div className="modal-overlay" onClick={close}>
            <div
              ref={modal}
              className="modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                {icon && <Image className="modal-icon" src={icon} alt="" width={32} height={32} />}
                <div className="modal-heading">
                  <h3 id={titleId} className="modal-title">
                    {title}
                  </h3>
                  {meta && meta.length > 0 && <p className="modal-meta">{meta.join(' · ')}</p>}
                </div>
                <button
                  ref={closeBtn}
                  className="modal-close"
                  aria-label={`Close ${title}`}
                  onClick={close}
                >
                  <FiX size={14} />
                </button>
              </div>
              {media &&
                (src ? (
                  /* eslint-disable-next-line @next/next/no-img-element -- blob URL, next/image can't optimize it */
                  <img className="modal-media" src={src} alt={`${title} demo`} />
                ) : (
                  <div className="modal-loading">{failed ? 'demo unavailable' : 'loading…'}</div>
                ))}
              {description && <p className="modal-description">{description}</p>}
              {technologies && technologies.length > 0 && (
                <div className="badges">
                  {technologies.map((t) => (
                    <span key={t} className="badge">
                      {t}
                    </span>
                  ))}
                </div>
              )}
              <a className="modal-link" href={href} target="_blank" rel="noopener noreferrer">
                <FiExternalLink size={12} />
                {linkLabel(href)}
              </a>
            </div>
          </div>,
          document.body,
        )}
    </>
  )
}
