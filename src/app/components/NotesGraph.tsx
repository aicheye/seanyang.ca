'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { FiX } from 'react-icons/fi'
import { PiGraph } from 'react-icons/pi'

const BRAIN_URL = 'https://brain.seanyang.ca'

/* The footer's "notes" link, which opens the lecture-notes graph from
   brain.seanyang.ca in a dialog. brain's /embed page draws only the graph
   and opens clicked notes in a new tab; its frame-ancestors header allows
   this site, the mirrors, and localhost:3000. The iframe exists only while
   the dialog is open, so the graph is never downloaded until someone opens
   it. */
export function NotesGraph() {
  const [open, setOpen] = useState(false)
  const trigger = useRef<HTMLButtonElement>(null)
  const closeBtn = useRef<HTMLButtonElement>(null)
  const dialog = useRef<HTMLDivElement>(null)
  const frame = useRef<HTMLIFrameElement>(null)

  const close = useCallback(() => {
    setOpen(false)
    trigger.current?.focus()
  }, [])

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
      <button
        ref={trigger}
        className="notes-graph-btn"
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
      >
        <PiGraph size={18} />
        notes
      </button>
      {open &&
        createPortal(
          <div className="modal-overlay" onClick={close}>
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
                src={`${BRAIN_URL}/embed`}
                title="Graph of my lecture notes"
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
