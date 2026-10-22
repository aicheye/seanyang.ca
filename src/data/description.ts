import { location } from '@/data/adjectives'
import jobs, { type Job } from '@/data/jobs'
import { isFuture } from '@/lib/dates'

/* The <meta name="description"> search engines show under the title. Google
   pads anything much shorter than ~155 chars with whatever page text matches
   the query, so this fills the budget itself: who I am and where, then the
   roles I'm in and the one I'm about to start, all pulled from the same data
   the timeline renders. Computed at build time, like the rest of the metadata. */

function joinList(items: string[]): string {
  if (items.length <= 1) return items.join('')
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`
}

function role(job: Job): string {
  return `${job.title} at ${job.company}`
}

export function pageDescription(now: Date = new Date()): string {
  const intro = `Student and engineer at UWaterloo, based in ${location}.`

  const current = jobs.filter((j) => j.current)
  const incoming = jobs.filter((j) => !j.current && isFuture(j.dates[0] ?? '', now))

  const clauses: string[] = []
  if (current.length > 0) clauses.push(joinList(current.map(role)))
  if (incoming.length > 0) clauses.push(`incoming at ${joinList(incoming.map((j) => j.company))}`)
  if (clauses.length === 0) return intro

  const roles = clauses.join('; ')
  return `${intro} ${roles[0].toUpperCase()}${roles.slice(1)}.`
}
