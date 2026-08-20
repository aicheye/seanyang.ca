'use client'

import Image from 'next/image'
import { useCallback, useEffect, useId, useRef, useState } from 'react'
import type { MouseEvent } from 'react'
import { createPortal } from 'react-dom'
import { FiExternalLink, FiX } from 'react-icons/fi'
import { withBase } from '@/lib/basePath'
import { cachedMedia, loadMedia, prefetchMedia } from '@/lib/media'

export interface EntryLinkProps {
  /** Text shown in the list and as the dialog heading. */
  title: string
  /** Appended to the title as "title @ company"; kept on its own line on narrow screens. */
  company?: string
  href: string
  /** Blurb shown inside the dialog, longer than the summary on the card. An
      array is stored one sentence per line in the data files and joined here. */
  description?: string | string[]
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
  company,
  href,
  description,
  technologies,
  media: mediaProp,
  icon: iconProp,
  meta,
  className,
}: EntryLinkProps) {
  // Data files store root-absolute /assets/... paths; prefix them when the
  // site is served from a subpath (the linux.student mirror).
  const media = mediaProp && withBase(mediaProp)
  const icon = iconProp && withBase(iconProp)
  const [open, setOpen] = useState(false)
  const [src, setSrc] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)
  const trigger = useRef<HTMLAnchorElement>(null)
  const modal = useRef<HTMLDivElement>(null)
  const closeBtn = useRef<HTMLButtonElement>(null)
  const objectUrl = useRef<string | null>(null)
  const titleId = useId()
  const label = company ? `${title} @ ${company}` : title

  const close = useCallback(() => {
    setOpen(false)
    trigger.current?.focus()
  }, [])

  /* A fresh object URL per open so a gif always restarts from frame 0 —
     a cached <img> src can resume mid-loop in some browsers. */
  const showBlob = useCallback((blob: Blob) => {
    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current)
    objectUrl.current = URL.createObjectURL(blob)
    setSrc(objectUrl.current)
  }, [])

  /* Let modified clicks (new tab/window, middle click) reach the browser so the
     link still behaves like a link; a plain click opens the dialog instead. */
  const onTriggerClick = useCallback(
    (e: MouseEvent<HTMLAnchorElement>) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return
      e.preventDefault()
      // Already warmed: show it in this same render, with no loading flash.
      const blob = media ? cachedMedia(media) : undefined
      if (blob) showBlob(blob)
      setOpen(true)
    },
    [media, showBlob],
  )

  /* Hovering or tabbing to the title is a strong hint the demo is about to be
     opened, so start the download ahead of the click. */
  const onIntent = useCallback(() => {
    if (media) loadMedia(media).catch(() => {})
  }, [media])

  // Warm the demo in the background once the page goes idle.
  useEffect(() => {
    if (media) prefetchMedia(media)
  }, [media])

  useEffect(() => {
    if (!open || !media || cachedMedia(media)) return
    let cancelled = false
    loadMedia(media)
      .then((blob) => {
        if (!cancelled) showBlob(blob)
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [open, media, showBlob])

  // Drop the object URL when the dialog closes; the blob itself stays cached.
  useEffect(() => {
    if (open) return
    if (objectUrl.current) {
      URL.revokeObjectURL(objectUrl.current)
      objectUrl.current = null
    }
    setSrc(null)
    setFailed(false)
  }, [open])

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
        onPointerEnter={onIntent}
        onFocus={onIntent}
      >
        {label}
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
                {icon && (
                  <span className="modal-icon">
                    <Image src={icon} alt="" width={64} height={64} />
                  </span>
                )}
                <div className="modal-heading">
                  <h3 id={titleId} className="modal-title">
                    {title}
                    {company && (
                      <>
                        {' @ '}
                        <span className="modal-title-company">{company}</span>
                      </>
                    )}
                  </h3>
                  {meta && meta.length > 0 && <p className="modal-meta">{meta.join(' · ')}</p>}
                </div>
                <button
                  ref={closeBtn}
                  className="modal-close"
                  aria-label={`Close ${label}`}
                  onClick={close}
                >
                  <FiX size={14} />
                </button>
              </div>
              {media &&
                (src ? (
                  /* eslint-disable-next-line @next/next/no-img-element -- blob URL, next/image can't optimize it */
                  <img className="modal-media" src={src} alt={`${label} demo`} />
                ) : (
                  <div className="modal-loading">{failed ? 'demo unavailable' : 'loading…'}</div>
                ))}
              {description && (
                <p className="modal-description">
                  {Array.isArray(description) ? description.join(' ') : description}
                </p>
              )}
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
