'use client'

import { EntryLink } from '@/app/components/EntryLink'
import bakedProjects from '@/data/projects'
import { useLiveData } from '@/lib/liveData'

export function ProjectsSection() {
  const projects = useLiveData('projects.json', bakedProjects)
  return (
    <section>
      <h2>
        <span>Projects</span>
      </h2>
      <div className="projects">
        {projects.map((p) => (
          <div key={p.title} className="project">
            <div className="project-title">
              <strong>
                <EntryLink
                  title={p.title}
                  href={p.github}
                  description={p.details ?? p.description}
                  technologies={p.technologies}
                  media={p.media}
                  pages={p.pages}
                />
              </strong>
            </div>
            <p>{p.description}</p>
            <div className="badges">
              {p.technologies.map((t: string) => (
                <span key={t} className="badge">
                  {t}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
