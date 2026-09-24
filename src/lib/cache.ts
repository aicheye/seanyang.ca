// Cache-Control for every image: static files in public/ (via next.config.ts),
// the album-art proxy, and the mirrors' .htaccess (scripts/build-static.sh,
// which repeats the literal). Browsers and the CDN reuse an image for a day
// without asking, then for up to a week more while refetching it in the
// background, so a replaced file shows up within about a day.
export const IMAGE_CACHE_CONTROL = 'public, max-age=86400, stale-while-revalidate=604800'

// File types the policy applies to.
export const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'ico', 'mp4', 'webm']
