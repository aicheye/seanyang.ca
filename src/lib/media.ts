/* Demo media is fetched as a blob and handed to the dialog as a fresh object
   URL, so a gif always restarts from frame 0 instead of resuming mid-loop.
   Blobs are cached here so a second open — and a prefetched entry — is
   instant rather than a second trip over the network. */

const pending = new Map<string, Promise<Blob>>()
const loaded = new Map<string, Blob>()

export function cachedMedia(url: string): Blob | undefined {
  return loaded.get(url)
}

export function loadMedia(url: string): Promise<Blob> {
  const done = loaded.get(url)
  if (done) return Promise.resolve(done)

  let request = pending.get(url)
  if (!request) {
    request = fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(`${r.status}`)
        return r.blob()
      })
      .then((blob) => {
        loaded.set(url, blob)
        pending.delete(url)
        return blob
      })
    // A failed load shouldn't be cached — let the next open retry it.
    request.catch(() => pending.delete(url))
    pending.set(url, request)
  }
  return request
}

interface Connection {
  saveData?: boolean
  effectiveType?: string
}

/* The demos run to several MB each. Warming them is a nice-to-have, so skip it
   when the visitor is metered or on a slow link — a click still fetches. */
function prefetchAllowed(): boolean {
  const connection = (navigator as Navigator & { connection?: Connection }).connection
  if (!connection) return true
  if (connection.saveData) return false
  return !['slow-2g', '2g', '3g'].includes(connection.effectiveType ?? '')
}

const queue: string[] = []
let draining = false

function drain() {
  const next = queue.shift()
  if (next === undefined) {
    draining = false
    return
  }
  loadMedia(next)
    .catch(() => {})
    .finally(drain)
}

/** Warm one media URL once the browser is idle, one download at a time. */
export function prefetchMedia(url: string) {
  if (loaded.has(url) || pending.has(url) || queue.includes(url)) return
  if (!prefetchAllowed()) return
  queue.push(url)
  if (draining) return
  draining = true
  const idle = window.requestIdleCallback
  if (idle) idle(() => drain(), { timeout: 4000 })
  else window.setTimeout(drain, 1000)
}
