import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Mirrors — Sean Yang',
}

const MIRRORS = [
  'https://seanyang.ca',
  'https://student.math.uwaterloo.ca/~s345yang',
  'https://student.cs.uwaterloo.ca/~s345yang',
  'https://ece.uwaterloo.ca/~s345yang',
]

export default function MirrorsPage() {
  return (
    <div className="mirrors-page">
      <h1>mirrors</h1>
      <ul>
        {MIRRORS.map((url) => (
          <li key={url}>
            <a href={url} target="_blank" rel="noopener noreferrer">
              {url}
            </a>
          </li>
        ))}
      </ul>
      <Link href="/" className="not-found-link">
        ← go home
      </Link>
    </div>
  )
}
