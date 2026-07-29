import data from '@public/data/socials.json'

export interface Social {
  label: string
  url: string
  handle: string
}

export interface Email {
  label: string
  url: string
}

export const primaryEmail: Email = data.primaryEmail

export const socials: Social[] = data.socials
