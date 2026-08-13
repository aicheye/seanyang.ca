# seanyang.ca

Personal website built with Next.js, React, and TypeScript. Deployed on Vercel.

Served from **seanyang.ca** (canonical) and **seanyang.me**. The `.me` domain is
kept live during the migration and will redirect to `.ca` at the platform level;
`src/data/site.ts` holds the canonical origin that metadata and self-links use.

## Tech Stack

- [Next.js 15](https://nextjs.org/)
- [React 19](https://react.dev/)
- TypeScript
- Vercel Analytics & Speed Insights

## Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Scripts

| Command         | Description              |
| --------------- | ------------------------ |
| `npm run dev`   | Start development server |
| `npm run build` | Build for production     |
| `npm run start` | Start production server  |
| `npm run lint`  | Run ESLint               |
