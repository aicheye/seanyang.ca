import jobs from '@public/data/jobs.json'

export interface Job {
  title: string
  company: string
  description: string
  website: string
  logo: string
  location: string
  technologies: string[]
  /** Optional demo gif/image shown in the entry dialog. */
  media?: string
  dates: string[]
  current: boolean
}

export default jobs as Job[]
