import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  experimental: {
    // TypeScript 7 (native compiler) drops the API Next.js 16 uses; this
    // makes Next shell out to the TS CLI instead. Drop once Next supports
    // TS 7 natively.
    useTypeScriptCli: true,
  },
  images: {
    remotePatterns: [{ hostname: 'se30webring.com' }],
  },
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
}

export default nextConfig
