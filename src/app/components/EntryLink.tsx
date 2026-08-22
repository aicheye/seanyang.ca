'use client'

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import type { MouseEvent } from 'react'
import { createPortal } from 'react-dom'
import { FiChevronLeft, FiChevronRight, FiExternalLink, FiX } from 'react-icons/fi'
import type { EntryPage } from '@/data/entry'
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
  /** Demo gif/image shown inside the dialog; the only page when `pages` is unset. */
  media?: string
  /** Every page of the dialog, in order: a demo image and/or a blurb each.
      Replaces `media` when set. */
  pages?: EntryPage[]
  /** Small image shown beside the dialog heading (e.g. a company logo). */
  icon?: string
  /** Short facts rendered under the heading, joined with a middot. */
  meta?: string[]
  className?: string
}

/** "Perception Engineering Intern" -> "perception-engineering-intern" */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

/** "https://github.com/aicheye/crustty/" -> "github.com/aicheye/crustty" */
function linkLabel(href: string): string {
  return href.replace(/^https?:\/\//, '').replace(/\/$/, '')
}

function setFocusParam(slug: string) {
  const url = new URL(window.location.href)
  url.searchParams.set('focus', slug)
  history.replaceState(null, '', url)
}

function clearFocusParam() {
  const url = new URL(window.location.href)
  if (!url.searchParams.has('focus')) return
  url.searchParams.delete('focus')
  history.replaceState(null, '', url)
}

export function EntryLink({
  title,
  company,
  href,
  description,
  technologies,
  media: mediaProp,
  pages: pagesProp,
  icon: iconProp,
  meta,
  className,
}: EntryLinkProps) {
  // Data files store root-absolute /assets/... paths; prefix them when the
  // site is served from a subpath (the linux.student mirror).
  const pages = useMemo<EntryPage[]>(() => {
    const list =
      pagesProp && pagesProp.length > 0 ? pagesProp : mediaProp ? [{ media: mediaProp }] : []
    return list.map((p) => (p.media ? { ...p, media: withBase(p.media) } : p))
  }, [pagesProp, mediaProp])
  const imageUrls = useMemo(() => pages.flatMap((p) => (p.media ? [p.media] : [])), [pages])
  const icon = iconProp && withBase(iconProp)
  const [open, setOpen] = useState(false)
  const [page, setPage] = useState(0)
  const [src, setSrc] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)
  const trigger = useRef<HTMLAnchorElement>(null)
  const modal = useRef<HTMLDivElement>(null)
  const closeBtn = useRef<HTMLButtonElement>(null)
  const objectUrl = useRef<string | null>(null)
  // Which media URL the current object URL was made from, so a page change
  // knows whether the image on screen is already the right one.
  const shown = useRef<string | null>(null)
  const iconUrl = useRef<string | null>(null)
  const didInitialFocus = useRef(false)
  const slug = company ? `${slugify(company)}-${slugify(title)}` : slugify(title)
  const titleId = useId()
  const label = company ? `${title} @ ${company}` : title
  const current = pages[page]
  const media = current?.media

  const close = useCallback(() => {
    setOpen(false)
    clearFocusParam()
    trigger.current?.focus()
  }, [])

  /* A fresh object URL per show so a gif always restarts from frame 0 —
     a cached <img> src can resume mid-loop in some browsers. */
  const showBlob = useCallback((url: string, blob: Blob) => {
    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current)
    objectUrl.current = URL.createObjectURL(blob)
    shown.current = url
    setSrc(objectUrl.current)
  }, [])

  /* Switch pages; an already-warmed image is shown in this same render, with
     no loading flash. */
  const goTo = useCallback(
    (index: number) => {
      const next = Math.min(Math.max(index, 0), pages.length - 1)
      setPage(next)
      const url = pages[next]?.media
      const blob = url ? cachedMedia(url) : undefined
      if (url && blob) showBlob(url, blob)
    },
    [pages, showBlob],
  )

  /* Let modified clicks (new tab/window, middle click) reach the browser so the
     link still behaves like a link; a plain click opens the dialog instead. */
  const onTriggerClick = useCallback(
    (e: MouseEvent<HTMLAnchorElement>) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return
      e.preventDefault()
      goTo(0)
      if (icon) {
        if (iconUrl.current) URL.revokeObjectURL(iconUrl.current)
        const iconBlob = cachedMedia(icon)
        iconUrl.current = iconBlob ? URL.createObjectURL(iconBlob) : null
      }
      setOpen(true)
      setFocusParam(slug)
    },
    [goTo, icon, slug],
  )

  /* Hovering or tabbing to the title is a strong hint the demo is about to be
     opened, so start the downloads ahead of the click. */
  const onIntent = useCallback(() => {
    for (const url of imageUrls) loadMedia(url).catch(() => {})
    if (icon) loadMedia(icon).catch(() => {})
  }, [imageUrls, icon])

  useEffect(() => {
    if (didInitialFocus.current) return
    didInitialFocus.current = true
    const params = new URLSearchParams(window.location.search)
    if (params.get('focus') !== slug) return
    setOpen(true)
    setTimeout(() => {
      trigger.current?.scrollIntoView({ block: 'center' })
    }, 50)
  }, [slug])

  // Warm the demos in the background once the page goes idle.
  useEffect(() => {
    for (const url of imageUrls) prefetchMedia(url)
    if (icon) prefetchMedia(icon)
  }, [imageUrls, icon])

  useEffect(() => {
    if (!open || !media || shown.current === media) return
    setSrc(null)
    setFailed(false)
    let cancelled = false
    loadMedia(media)
      .then((blob) => {
        if (!cancelled) showBlob(media, blob)
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
    if (iconUrl.current) {
      URL.revokeObjectURL(iconUrl.current)
      iconUrl.current = null
    }
    shown.current = null
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
      const focusable = modal.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled])',
      )
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
    /* Pinning the body with position:fixed would zero the document scroll for
       as long as the dialog is open, which un-sticks the sticky section
       headings behind it. Hiding the overflow keeps the scroll offset — and
       the headings pinned — but overflow:hidden alone doesn't stop touch
       scrolling on iOS Safari, so drags outside the dialog are cancelled too. */
    const scrollbar = window.innerWidth - document.documentElement.clientWidth
    const prev = {
      overflow: document.body.style.overflow,
      paddingRight: document.body.style.paddingRight,
    }
    document.body.style.overflow = 'hidden'
    // Hiding the scrollbar frees its gutter; pad it back so nothing shifts.
    if (scrollbar > 0) document.body.style.paddingRight = `${scrollbar}px`
    const onTouchMove = (e: TouchEvent) => {
      // Leave pinch-zoom alone, and let a scrollable dialog scroll itself.
      if (e.touches.length > 1) return
      const box = modal.current
      if (box && box.contains(e.target as Node) && box.scrollHeight > box.clientHeight) return
      e.preventDefault()
    }
    document.addEventListener('touchmove', onTouchMove, { passive: false })
    closeBtn.current?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('touchmove', onTouchMove)
      document.body.style.overflow = prev.overflow
      document.body.style.paddingRight = prev.paddingRight
    }
  }, [open, close])

  // Arrow keys page through a multi-page dialog.
  useEffect(() => {
    if (!open || pages.length < 2) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') goTo(page + 1)
      else if (e.key === 'ArrowLeft') goTo(page - 1)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, pages.length, page, goTo])

  // Each page can carry its own blurb; the entry's description is the fallback.
  const blurb = current?.text ?? description

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
                    {/* eslint-disable-next-line @next/next/no-img-element -- blob URL from prefetch cache */}
                    <img src={iconUrl.current ?? icon} alt="" width={64} height={64} />
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
              {current && (media || pages.length > 1) && (
                <div className="modal-pages">
                  {media &&
                    (src ? (
                      /* eslint-disable-next-line @next/next/no-img-element -- blob URL, next/image can't optimize it */
                      <img
                        className="modal-media"
                        src={src}
                        alt={current.caption ? `${label}: ${current.caption}` : `${label} demo`}
                      />
                    ) : (
                      <div className="modal-loading">
                        {failed ? 'demo unavailable' : 'loading…'}
                      </div>
                    ))}
                  {pages.length > 1 && (
                    <div className="modal-pager">
                      <button
                        type="button"
                        className="modal-page-btn"
                        aria-label="Previous page"
                        disabled={page === 0}
                        onClick={() => goTo(page - 1)}
                      >
                        <FiChevronLeft size={18} />
                      </button>
                      <span className="modal-pager-caption">{current.caption}</span>
                      <span className="modal-pager-count" aria-live="polite">
                        {page + 1} / {pages.length}
                      </span>
                      <button
                        type="button"
                        className="modal-page-btn"
                        aria-label="Next page"
                        disabled={page === pages.length - 1}
                        onClick={() => goTo(page + 1)}
                      >
                        <FiChevronRight size={18} />
                      </button>
                    </div>
                  )}
                </div>
              )}
              {blurb && (
                <p className="modal-description">
                  {Array.isArray(blurb) ? blurb.join(' ') : blurb}
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
