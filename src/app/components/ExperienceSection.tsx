'use client'

import { EntryLink, slugify } from '@/app/components/EntryLink'
import type { Job } from '@/data/jobs'
import bakedJobs from '@/data/jobs'
import { formatDateRange } from '@/lib/dates'
import { useLiveData } from '@/lib/liveData'

/* One id per job, matching EntryLink's own company + title derivation so old
   `?focus=` links keep working. The same title held twice at one company —
   a return to a team on a later term — would collide, so those get their
   start date appended. */
function jobIds(jobs: Job[]): string[] {
  const bases = jobs.map((job) => `${slugify(job.company)}-${slugify(job.title)}`)
  const counts = new Map<string, number>()
  for (const base of bases) counts.set(base, (counts.get(base) ?? 0) + 1)
  return bases.map((base, i) =>
    (counts.get(base) ?? 0) > 1 ? `${base}-${slugify(jobs[i].dates[0] ?? String(i))}` : base,
  )
}

export function ExperienceSection() {
  const jobs = useLiveData('jobs.json', bakedJobs)
  const ids = jobIds(jobs)
  return (
    <section>
      <h2>
        <span>Experience</span>
      </h2>
      <div className="jobs">
        {jobs.map((job, i) => {
          const dates = formatDateRange(job.dates)
          return (
            <div key={ids[i]} className={`job${job.current ? ' job-current' : ''}`}>
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
                      slug={ids[i]}
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
