const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

interface ParsedDate {
  year: number
  month?: number
}

/* Data stores dates as "YYYY.M" (or bare "YYYY"). Anything else — "Present",
   a free-form label — is passed through untouched. */
function parse(token: string): ParsedDate | null {
  const match = /^(\d{4})(?:\.(\d{1,2}))?$/.exec(token.trim())
  if (!match) return null
  const year = Number(match[1])
  const month = match[2] === undefined ? undefined : Number(match[2])
  if (month !== undefined && (month < 1 || month > 12)) return null
  return { year, month }
}

function render({ year, month }: ParsedDate): string {
  return month === undefined ? String(year) : `${MONTHS[month - 1]} ${year}`
}

export function formatDate(token: string): string {
  const parsed = parse(token)
  return parsed ? render(parsed) : token.trim()
}

/** "2026.5" + "2026.8" -> "May – August 2026"; "2025.9" + "2026.4" -> "September 2025 – April 2026". */
export function formatDateRange(dates: string[]): string {
  const tokens = dates.map((d) => d.trim()).filter(Boolean)
  if (tokens.length === 0) return ''

  const start = tokens[0]
  const end = tokens[tokens.length - 1]
  if (tokens.length === 1 || start === end) return formatDate(start)

  const from = parse(start)
  const to = parse(end)
  if (!from || !to || from.year !== to.year) return `${formatDate(start)} – ${formatDate(end)}`

  // Same year: name it once at the end.
  if (from.month === undefined || to.month === undefined) return String(from.year)
  if (from.month === to.month) return render(from)
  return `${MONTHS[from.month - 1]} – ${MONTHS[to.month - 1]} ${from.year}`
}
