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
  return (
    <div className="about">
      <span className="sep">&#91;</span>
      {adjectives.flatMap((w, i) =>
        i === 0
          ? [<span key={w}>{w}</span>]
          : [
              <span key={`sep-${i}`} className="sep">
                ·
              </span>,
              <span key={w}>{w}</span>,
            ],
      )}
      <span className="sep">&#93;</span>
    </div>
  )
}
