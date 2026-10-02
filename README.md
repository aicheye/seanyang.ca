# seanyang.ca

Personal website built with Next.js, React, and TypeScript. Deployed on Vercel with static mirrors on UW student servers, the CS Club server, tilde.club, and envs.net.

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

Static copies of the site are hosted on UW student servers, the CS Club server, tilde.club, and envs.net. They are built with `output: export` and served as plain files out of `~/public_html` (`~/www` on CSC).

| Mirror                                       | SSH server                                     |
| -------------------------------------------- | ---------------------------------------------- |
| https://student.cs.uwaterloo.ca/~s532yang/   | `linux.student.cs.uwaterloo.ca`                |
| https://ece.uwaterloo.ca/~s532yang/          | `eceubuntu1.uwaterloo.ca`                      |
| https://www.eng.uwaterloo.ca/~s532yang/      | `sftp.eng.uwaterloo.ca`                        |
| https://student.math.uwaterloo.ca/~s532yang/ | `linux.student.math.uwaterloo.ca`              |
| https://csclub.uwaterloo.ca/~s532yang/       | `high-fructose-corn-syrup.csclub.uwaterloo.ca` |
| https://tilde.club/~syang/                   | `tilde.club`                                   |
| https://envs.net/~syang/                     | `envs.net`                                     |

### Deploying mirrors

```bash
scripts/deploy-mirrors.sh
```

This deploys to every mirror over SSH, resolving each host's username from `~/.ssh/config` (each host needs a `User` entry). It runs one static build with a placeholder basePath, then copies `out/` to `out-mirrors/<host>` and replaces the placeholder with `/~<user>`. The build strips API routes (the mirrors call prod's routes cross-origin instead), and pulls jobs/projects data from jsDelivr so the mirrors stay current without redeploying. On the Apache hosts, `/resume` and `/transcript` are `.htaccess` redirects to prod. tilde.club and envs.net run nginx, which ignores `.htaccess` and does not map `/page` to `page.html`, so their copies get `page/index.html` files and HTML redirects instead. envs.net also serves the same folder at https://syang.envs.net/, so the deploy adds a `~syang -> .` symlink there to make the `/~syang/` asset paths resolve on the subdomain. Set `STAGE_ONLY=1` to build and stage without uploading.
