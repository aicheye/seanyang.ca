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
    <section id="experience">
      <h2>
        <span>Experience</span>
      </h2>
      {/* A real <table border>, the way a 1997 page laid out anything with
          columns. Each row is one job; the dialog opens from the title. */}
      <div className="jobs-wrap">
        <table className="jobs" cellPadding={6} cellSpacing={0}>
          <thead>
            <tr>
              <th scope="col">when</th>
              <th scope="col">where</th>
              <th scope="col">what</th>
              <th scope="col">with</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((job, i) => {
              const dates = formatDateRange(job.dates)
              return (
                <tr key={ids[i]} className={`job${job.current ? ' job-current' : ''}`}>
                  <td className="job-meta">
                    <span className="job-dates">{dates}</span>
                  </td>
                  <td className="job-meta">
                    <span className="job-location">{job.location}</span>
                  </td>
                  <td className="job-body">
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
                    {job.current && (
                      <span className="new-badge blink" aria-label="current">
                        NEW!
                      </span>
                    )}
                    {job.description && <p className="job-description">{job.description}</p>}
                  </td>
                  <td className="job-tech">
                    {job.technologies.length > 0 && (
                      <div className="badges">
                        {job.technologies.map((t: string) => (
                          <span key={t} className="badge">
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}
