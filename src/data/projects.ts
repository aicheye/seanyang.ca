import type { EntryPage } from '@/data/entry'
import projects from '@public/data/projects.json'

export interface Project {
  title: string
  /** One-line summary shown on the card. */
  description: string
  /** Longer blurb shown in the entry dialog, one sentence per entry; falls back to `description`. */
  details?: string[]
  github: string
  technologies: string[]
  media?: string
  /** Every page of the entry dialog, in order. When set it replaces `media`,
      which stays as the first page for clients built before `pages` existed
      (the mirrors between deploys). */
  pages?: EntryPage[]
}

export default projects as Project[]
