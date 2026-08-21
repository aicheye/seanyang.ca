# seanyang.ca

Personal website built with Next.js, React, and TypeScript. Deployed on Vercel with static mirrors on UW student servers.

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

## Mirrors

Static copies of the site are hosted on UW student servers. They are built with `output: export` and served as plain files out of `~/public_html`.

| Mirror | SSH server |
| --- | --- |
| https://student.cs.uwaterloo.ca/~s532yang/ | `linux.student.cs.uwaterloo.ca` |
| https://student.math.uwaterloo.ca/~s532yang/ | `linux.student.math.uwaterloo.ca` |
| https://ece.uwaterloo.ca/~s532yang/ | `eceubuntu1.uwaterloo.ca` |
| https://www.eng.uwaterloo.ca/~s532yang/ | `sftp.eng.uwaterloo.ca` |

### Deploying mirrors

```bash
scripts/deploy-mirrors.sh s532yang
```

This builds the static export and deploys to all three servers in parallel over SSH. The build strips API routes (the mirrors call prod's routes cross-origin instead), replaces `/resume` and `/transcript` with `.htaccess` redirects to prod, and pulls jobs/projects data from jsDelivr so the mirrors stay current without redeploying.
