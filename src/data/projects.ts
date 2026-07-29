import projects from '@public/data/projects.json'

export interface Project {
  title: string
  description: string
  github: string
  technologies: string[]
  media?: string
}

export default projects as Project[]
