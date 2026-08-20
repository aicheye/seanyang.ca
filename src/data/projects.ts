import projects from '@public/data/projects.json'

export interface Project {
  title: string
  /** One-line summary shown on the card. */
  description: string
  /** Longer blurb shown in the entry dialog; falls back to `description`. */
  details?: string
  github: string
  technologies: string[]
  media?: string
}

export default projects as Project[]
