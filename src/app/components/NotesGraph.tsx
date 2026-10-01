'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { FiX } from 'react-icons/fi'
import { PiGraph } from 'react-icons/pi'
import { useFocusDialog } from './EntryLink'

const BRAIN_URL = 'https://brain.seanyang.ca'

// ?focus=notes opens the dialog, like ?focus=<slug> for a job or project.
const SLUG = 'notes'

/* The footer's "notes" link, which opens the lecture-notes graph from
   brain.seanyang.ca in a dialog. brain's /embed page draws only the graph
   and opens clicked notes in a new tab; its frame-ancestors header allows
   this site, the mirrors, and localhost:3000. The iframe is added, hidden,
   once the page has loaded, so the graph is downloaded before anyone opens
   it. /embed?wait runs no physics and draws nothing until this page posts
   "brain:play", which it does each time the dialog opens. */
export function NotesGraph() {
  const trigger = useRef<HTMLButtonElement>(null)
  const closeBtn = useRef<HTMLButtonElement>(null)
  const dialog = useRef<HTMLDivElement>(null)
  const frame = useRef<HTMLIFrameElement>(null)

  const { open, setOpen, show: openDialog, close } = useFocusDialog(SLUG, trigger)
  const [pageLoaded, setPageLoaded] = useState(false)

  useEffect(() => {
    const onLoad = () => setPageLoaded(true)
    if (document.readyState === 'complete') onLoad()
    else window.addEventListener('load', onLoad, { once: true })
    return () => window.removeEventListener('load', onLoad)
  }, [])

  const play = useCallback(() => {
    frame.current?.contentWindow?.postMessage('brain:play', BRAIN_URL)
  }, [])

  // A play posted before the frame's script listens is lost, so the frame
  // posts "brain:ready" once it listens, and gets another play if open.
  useEffect(() => {
    if (!open) return
    play()
    const onMessage = (e: MessageEvent) => {
      if (e.source === frame.current?.contentWindow && e.data === 'brain:ready') play()
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [open, play])

  // Opened from a shared link: show the dialog, with the footer behind it.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('focus') !== SLUG) return
    const id = setTimeout(() => {
      setOpen(true)
      trigger.current?.scrollIntoView({ block: 'center' })
    }, 50)
    return () => clearTimeout(id)
  }, [setOpen])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    document.addEventListener('keydown', onKey)
    /* Clicking the graph moves focus into the iframe, a cross-origin document
       whose key presses never reach onKey, so Escape stopped working. The
       page's window blurs when that happens; focus goes back to the dialog.
       A drag in the graph continues, because pointer events go to the frame
       under the cursor whatever has focus. */
    const onBlur = () => {
      setTimeout(() => {
        if (document.activeElement === frame.current) dialog.current?.focus()
      })
    }
    window.addEventListener('blur', onBlur)
    // Same as EntryLink's dialog: hide the page's scrollbar while open, and
    // pad its gutter back so nothing shifts.
    const scrollbar = window.innerWidth - document.documentElement.clientWidth
    const prev = {
      overflow: document.body.style.overflow,
      paddingRight: document.body.style.paddingRight,
    }
    document.body.style.overflow = 'hidden'
    if (scrollbar > 0) document.body.style.paddingRight = `${scrollbar}px`
    closeBtn.current?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('blur', onBlur)
      document.body.style.overflow = prev.overflow
      document.body.style.paddingRight = prev.paddingRight
    }
  }, [open, close])

  return (
    <>
      <button ref={trigger} className="notes-graph-btn" aria-haspopup="dialog" onClick={openDialog}>
        <PiGraph size={18} />
        notes
      </button>
      {(open || pageLoaded) &&
        createPortal(
          <div className="modal-overlay" hidden={!open} onClick={close}>
            <div
              ref={dialog}
              className="modal notes-graph-modal"
              tabIndex={-1}
              role="dialog"
              aria-modal="true"
              aria-labelledby="notes-graph-title"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <div className="modal-heading">
                  <h3 id="notes-graph-title" className="modal-title">
                    Lecture notes
                  </h3>
                  <p className="modal-meta">
                    <a href={BRAIN_URL} target="_blank" rel="noopener noreferrer">
                      brain.seanyang.ca ↗
                    </a>
                  </p>
                </div>
                <button
                  ref={closeBtn}
                  className="modal-close"
                  aria-label="Close lecture notes"
                  onClick={close}
                >
                  <FiX size={14} />
                </button>
              </div>
              {/* Scripts draw the graph, and same-origin lets them fetch brain's
                  graph JSON. The two together only matter for a same-origin
                  frame, and this one is cross-origin. Popups let a clicked note
                  open in a new tab. */}
              <iframe
                ref={frame}
                src={`${BRAIN_URL}/embed?wait`}
                aria-label="Graph of my lecture notes"
                // eslint-disable-next-line react/iframe-missing-sandbox
                sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
              />
            </div>
          </div>,
          document.body,
        )}
    </>
  )
}
