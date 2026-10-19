import Link from 'next/link'

/* A Windows 95 error box, because a 404 should look like one. */
export default function NotFound() {
  return (
    <div className="not-found">
      <div className="not-found-box" role="alertdialog" aria-labelledby="nf-title">
        <div className="win-title" id="nf-title">
          Error 404
        </div>
        <div className="win-body">
          <div className="win-error">
            <span className="win-error-icon" aria-hidden="true">
              ✕
            </span>
            <div>
              <h1>404</h1>
              <p style={{ margin: 0 }}>page not found</p>
            </div>
          </div>
          <Link href="/" className="not-found-link">
            ← go home
          </Link>
        </div>
      </div>
    </div>
  )
}
