import type { EntryPage } from '@/data/entry'
import jobs from '@public/data/jobs.json'

export interface Job {
  title: string
  company: string
  /** One-line summary shown in the timeline. */
  description: string
  /** Longer blurb shown in the entry dialog, one sentence per entry; falls back to `description`. */
  details?: string[]
  website: string
  logo: string
  location: string
  technologies: string[]
  /** Optional demo gif/image shown in the entry dialog. */
  media?: string
  /** Every page of the entry dialog, in order. When set it replaces `media`,
      which stays as the first page for clients built before `pages` existed
      (the mirrors between deploys). */
  pages?: EntryPage[]
  dates: string[]
  current: boolean
}

export default jobs as Job[]
