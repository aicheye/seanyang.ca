import jobs from '@/data/jobs'

export function ExperienceSection() {
  return (
    <section>
      <h2>
        <span>Experience</span>
      </h2>
      <div className="jobs">
        {jobs.map((job) => (
          <div key={job.title} className={`job${job.current ? ' job-current' : ''}`}>
            <div className="job-header">
              <div className="job-meta">
                <span>{job.dates.join(' – ')}</span>
                {job.location && <span className="job-location">{job.location}</span>}
              </div>
              <div className="job-body">
                <a href={job.website} target="_blank" rel="noopener noreferrer">
                  <strong>
                    {job.title} @ {job.company}
                  </strong>
                </a>
                {job.description && <p className="job-description">{job.description}</p>}
                {job.technologies.length > 0 && (
                  <div className="badges badges-right">
                    {job.technologies.map((t: string) => (
                      <span key={t} className="badge">
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
