// Records the pixel size of every demo in public/assets/demos so the entry
// dialog can reserve the right box before the media has downloaded. Reads
// only the file headers (WebP chunk / MP4 tkhd box), so no dependencies.
// Runs before `dev` and `build`; the output is committed so the static
// mirror build (which calls `next build` directly) has it too.

import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const DIR = 'public/assets/demos'
const OUT = 'src/data/mediaSizes.json'

function webpSize(buf) {
  if (buf.toString('ascii', 0, 4) !== 'RIFF' || buf.toString('ascii', 8, 12) !== 'WEBP') return null
  const chunk = buf.toString('ascii', 12, 16)
  if (chunk === 'VP8X') return [buf.readUIntLE(24, 3) + 1, buf.readUIntLE(27, 3) + 1]
  if (chunk === 'VP8 ') return [buf.readUInt16LE(26) & 0x3fff, buf.readUInt16LE(28) & 0x3fff]
  if (chunk === 'VP8L') {
    const bits = buf.readUInt32LE(21)
    return [(bits & 0x3fff) + 1, ((bits >> 14) & 0x3fff) + 1]
  }
  return null
}

// Walks moov > trak > tkhd; the first track with a nonzero size is the video.
function mp4Size(buf, start = 0, end = buf.length) {
  let pos = start
  while (pos + 8 <= end) {
    let size = buf.readUInt32BE(pos)
    const type = buf.toString('ascii', pos + 4, pos + 8)
    let header = 8
    if (size === 1) {
      size = Number(buf.readBigUInt64BE(pos + 8))
      header = 16
    } else if (size === 0) size = end - pos
    if (size < header) return null
    if (type === 'moov' || type === 'trak') {
      const found = mp4Size(buf, pos + header, pos + size)
      if (found) return found
    } else if (type === 'tkhd') {
      // width and height are 16.16 fixed point, the last 8 bytes of the box
      const w = buf.readUInt32BE(pos + size - 8) >>> 16
      const h = buf.readUInt32BE(pos + size - 4) >>> 16
      if (w && h) return [w, h]
    }
    pos += size
  }
  return null
}

const sizes = {}
for (const name of readdirSync(DIR).sort()) {
  const buf = readFileSync(join(DIR, name))
  const size = /\.webp$/i.test(name) ? webpSize(buf) : /\.mp4$/i.test(name) ? mp4Size(buf) : null
  if (size) sizes[`/assets/demos/${name}`] = size
  else console.warn(`media-sizes: couldn't read the size of ${name}`)
}
writeFileSync(OUT, JSON.stringify(sizes, null, 2) + '\n')
