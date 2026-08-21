import type { NextConfig } from 'next'

// Set by scripts/build-static.sh for the UW static mirrors:
// plain HTML export, no image optimizer, served under /~watiam. Redirects
// don't exist in export mode; the build script emits an .htaccess instead.
const staticExport = process.env.STATIC_EXPORT === '1'

const nextConfig: NextConfig = {
  experimental: {
    // TypeScript 7 (native compiler) drops the API Next.js 16 uses; this
    // makes Next shell out to the TS CLI instead. Drop once Next supports
    // TS 7 natively.
    useTypeScriptCli: true,
  },
  ...(staticExport && {
    output: 'export' as const,
    basePath: process.env.NEXT_PUBLIC_BASE_PATH,
  }),
  images: {
    remotePatterns: [{ hostname: 'se30webring.com' }],
    ...(staticExport && { unoptimized: true }),
  },
  ...(!staticExport && {
    redirects: async () => [
      {
        source: '/resume.pdf',
        destination: '/resume',
        permanent: true,
      },
      {
        source: '/transcript.pdf',
        destination: '/transcript',
        permanent: true,
      },
    ],
  }),
}

export default nextConfig
