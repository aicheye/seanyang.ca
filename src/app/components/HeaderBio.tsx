'use client'

import bakedData from '@public/data/adjectives.json'
import { useLiveData } from '@/lib/liveData'
import { FiMapPin } from 'react-icons/fi'

interface Bio {
  location: string
  adjectives: string[]
}

/* The location next to my name and the adjective list below it both come from
   adjectives.json, so on the mirrors they refresh like jobs and projects do. */
export function HeaderLocation() {
  const { location } = useLiveData<Bio>('adjectives.json', bakedData)
  return (
    <span className="location">
      {location}
      <FiMapPin size={12} />
    </span>
  )
}

export function HeaderAdjectives() {
  const { adjectives } = useLiveData<Bio>('adjectives.json', bakedData)
  // The brackets live inside the first and last phrase, so a line never
  // starts or ends on a bracket of its own when the row wraps. The spaces
  // around each dot are the only places the row can break: JSX puts no
  // whitespace between elements by itself.
  const last = adjectives.length - 1
  return (
    <div className="about">
      {adjectives.flatMap((w, i) => [
        ...(i === 0
          ? []
          : [
              ' ',
              <span key={`sep-${i}`} className="sep">
                ·
              </span>,
              ' ',
            ]),
        <span key={w} className="about-word">
          {i === 0 && <span className="sep">&#91;</span>}
          {w}
          {i === last && <span className="sep">&#93;</span>}
        </span>,
      ])}
    </div>
  )
}
