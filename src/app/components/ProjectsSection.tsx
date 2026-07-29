import { ProjectDemo } from '@/app/components/ProjectDemo'
import projects from '@/data/projects'

export function ProjectsSection() {
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
                <a href={p.github} target="_blank" rel="noopener noreferrer">
                  {p.title}
                </a>
              </strong>
              {p.media && <ProjectDemo title={p.title} media={p.media} github={p.github} />}
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
