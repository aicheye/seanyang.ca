import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="not-found">
      <div>
        <h1
          style={{
            fontSize: 28,
            fontWeight: 600,
            color: 'var(--accent)',
            letterSpacing: '-0.5px',
            margin: '0 0 4px',
          }}
        >
          404
        </h1>
        <p style={{ margin: '0 0 20px' }}>page not found</p>
        <Link href="/" className="not-found-link">
          ← go home
        </Link>
      </div>
    </div>
  )
}
