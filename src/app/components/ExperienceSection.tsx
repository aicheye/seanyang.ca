'use client'

import { EntryLink } from '@/app/components/EntryLink'
import bakedJobs from '@/data/jobs'
import { formatDateRange } from '@/lib/dates'
import { useLiveData } from '@/lib/liveData'

export function ExperienceSection() {
  const jobs = useLiveData('jobs.json', bakedJobs)
  return (
    <section>
      <h2>
        <span>Experience</span>
      </h2>
      <div className="jobs">
        {jobs.map((job) => {
          const dates = formatDateRange(job.dates)
          return (
            <div key={job.title} className={`job${job.current ? ' job-current' : ''}`}>
              <div className="job-header">
                <div className="job-meta">
                  <span>{dates}</span>
                  {job.location && <span className="job-location">{job.location}</span>}
                </div>
                <div className="job-body">
                  <strong>
                    <EntryLink
                      title={job.title}
                      company={job.company}
                      href={job.website}
                      description={job.details ?? job.description}
                      technologies={job.technologies}
                      media={job.media}
                      pages={job.pages}
                      icon={job.logo}
                      meta={[dates, job.location].filter(Boolean)}
                    />
                  </strong>
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
          )
        })}
      </div>
    </section>
  )
}
