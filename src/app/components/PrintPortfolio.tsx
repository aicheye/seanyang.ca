'use client'

import bakedBio from '@public/data/adjectives.json'
import type { EntryPage } from '@/data/entry'
import type { Job } from '@/data/jobs'
import bakedJobs from '@/data/jobs'
import type { Project } from '@/data/projects'
import bakedProjects from '@/data/projects'
import { SITE_DOMAIN } from '@/data/site'
import { primaryEmail, socials } from '@/data/socials'
import { withBase } from '@/lib/basePath'
import { useLiveData } from '@/lib/liveData'
import type { SyntheticEvent } from 'react'

/** One printed piece of work: a project, or one demo from a job. */
interface Piece {
  order: number
  title: string
  subtitle: string
  text: string
  technologies: string[]
  href: string
  image: string
}

/** "https://github.com/aicheye/crustty/" -> "github.com/aicheye/crustty" */
function linkLabel(href: string): string {
  return href.replace(/^https?:\/\//, '').replace(/\/$/, '')
}

/* Paper can't play video, so each mp4 demo prints a still frame from
   public/assets/stills, extracted by hand with ffmpeg. */
function printImage(media: string): string {
  return withBase(media.replace(/^\/assets\/demos\/(.+)\.mp4$/i, '/assets/stills/$1.webp'))
}

function projectPiece(p: Project): Piece[] {
  const media = p.pages?.find((page) => page.media)?.media ?? p.media
  if (!media || p.printOrder === undefined) return []
  return [
    {
      order: p.printOrder,
      title: p.title,
      subtitle: p.description,
      text: (p.details ?? [p.description]).join(' '),
      technologies: p.technologies,
      href: p.github,
      image: printImage(media),
    },
  ]
}

/* Each demo page of a job with a `printOrder` prints as its own piece,
   titled by its caption. */
function jobPieces(job: Job): Piece[] {
  const role = `${job.title} @ ${job.company}`
  return (job.pages ?? []).flatMap((page: EntryPage) =>
    page.media && page.printOrder !== undefined
      ? [
          {
            order: page.printOrder,
            title: page.caption ?? job.title,
            subtitle: role,
            text: (page.text ?? job.details ?? [job.description]).join(' '),
            technologies: job.technologies,
            href: job.website,
            image: printImage(page.media),
          },
        ]
      : [],
  )
}

/* Media added through the mirrors' live data since the last still was made
   has no still; drop the image instead of printing a broken-image icon. */
function hideOnError(e: SyntheticEvent<HTMLImageElement>) {
  e.currentTarget.style.display = 'none'
}

/* Pieces per printed page. The first page also holds the header and the
   featured piece, so it takes one more piece; each later page takes three.
   Every card is kept under about 3 in tall so three fit on a page. */
const FIRST_PAGE = 1
const PER_PAGE = 3

function paginate<T>(items: T[]): T[][] {
  const pages = [items.slice(0, FIRST_PAGE)]
  for (let i = FIRST_PAGE; i < items.length; i += PER_PAGE) pages.push(items.slice(i, i + PER_PAGE))
  return pages
}

// Social profiles worth printing on a portfolio; the rest are personal.
const PRINT_SOCIALS = ['GitHub', 'LinkedIn']

/* The layout the browser prints (ctrl+p). It is hidden on screen and replaces
   the interactive page in print, because the dialogs, demo videos, and
   now-playing card have no meaning on paper. It is one list of work with a
   picture each: every project and job demo page with a `printOrder`, sorted
   by it, the first one featured. Nothing else prints. */
export function PrintPortfolio() {
  const jobs = useLiveData('jobs.json', bakedJobs)
  const projects = useLiveData('projects.json', bakedProjects)
  const { location } = useLiveData('adjectives.json', bakedBio)
  const links = socials.filter((s) => PRINT_SOCIALS.includes(s.label))
  const [featured, ...rest] = [
    ...projects.flatMap(projectPiece),
    ...jobs.flatMap(jobPieces),
  ].toSorted((a, b) => a.order - b.order)

  const [firstPage, ...laterPages] = paginate(rest)
  const total = laterPages.length + 1
  /* The footer is part of each sheet rather than an @page margin box, which
     only Chrome prints, and only at the dialog's default margins. */
  const footer = (page: number) => (
    <div className="pp-footer">
      <span>Sean Yang · {primaryEmail.label}</span>
      <span>
        {page} / {total}
      </span>
    </div>
  )

  return (
    <div className="print-portfolio" aria-hidden="true">
      <div className="pp-sheet pp-sheet-first">
        <header className="pp-header">
          <div>
            <h1>Sean Yang</h1>
            <p className="pp-role">Software Engineering @ University of Waterloo, class of 2030</p>
            <p className="pp-location">{location}</p>
          </div>
          <ul className="pp-contact">
            <li>
              <a href={primaryEmail.url}>{primaryEmail.label}</a>
            </li>
            <li>
              <a href={`https://${SITE_DOMAIN}`}>{SITE_DOMAIN}</a>
            </li>
            {links.map((s) => (
              <li key={s.label}>
                <a href={s.url}>{linkLabel(s.url)}</a>
              </li>
            ))}
          </ul>
        </header>
        <div className="pp-sheet-body">
          {featured && <PieceCard piece={featured} featured />}
          {firstPage.map((piece) => (
            <PieceCard key={piece.image} piece={piece} flip />
          ))}
        </div>
        {footer(1)}
      </div>
      {laterPages.map((page, p) => (
        <div key={page[0].image} className="pp-sheet">
          <div
            className={page.length < PER_PAGE ? 'pp-sheet-body pp-sheet-short' : 'pp-sheet-body'}
          >
            {page.map((piece, i) => (
              // Sides alternate across the whole list, not per page.
              <PieceCard
                key={piece.image}
                piece={piece}
                flip={(FIRST_PAGE + p * PER_PAGE + i) % 2 === 0}
              />
            ))}
          </div>
          {footer(p + 2)}
        </div>
      ))}
    </div>
  )
}

function PieceCard({
  piece,
  featured,
  flip,
}: {
  piece: Piece
  featured?: boolean
  flip?: boolean
}) {
  const className = ['pp-piece', featured && 'pp-featured', flip && 'pp-flip']
    .filter(Boolean)
    .join(' ')
  return (
    <article className={className}>
      <div className="pp-cover">
        {/* eslint-disable-next-line @next/next/no-img-element -- static print asset */}
        <img src={piece.image} alt="" onError={hideOnError} />
      </div>
      <div className="pp-body">
        <h3>{piece.title}</h3>
        <p className="pp-subtitle">{piece.subtitle}</p>
        <p className="pp-desc">{piece.text}</p>
        {piece.technologies.length > 0 && (
          <p className="pp-tech">{piece.technologies.join(' · ')}</p>
        )}
        <a className="pp-link" href={piece.href}>
          {linkLabel(piece.href)}
        </a>
      </div>
    </article>
  )
}
