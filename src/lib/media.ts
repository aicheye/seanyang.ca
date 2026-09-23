/* Demo media is fetched as a blob and handed to the dialog as a fresh object
   URL, so a demo always restarts from frame 0 instead of resuming mid-loop.
   Blobs are cached here so a second open — and an entry warmed on hover — is
   instant rather than a second trip over the network. Nothing is fetched
   until a visitor shows interest: warming every demo on load cost several MB
   per visit. */

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
