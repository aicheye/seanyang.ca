import jobs from '@public/data/jobs.json'

export interface Job {
  title: string
  company: string
  description: string
  website: string
  logo: string
  location: string
  technologies: string[]
  dates: string[]
  current: boolean
}

export default jobs as Job[]
