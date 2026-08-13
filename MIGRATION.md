# seanyang.me → seanyang.ca

Tracking doc for the domain move. Phase 1 (dual-domain) is done in code across
the repos listed below. Phase 2 (redirect) is platform configuration and is not
represented in any repository — the steps are written out here so the cutover is
a checklist rather than a memory exercise.

## The rule the code follows

Every app answers on **both** domains and names **seanyang.ca** in anything it
emits: canonical URLs, `mailto:` links, self-referential links, the SSH hint.
Nothing branches on the request's `Host`. That means the redirect in phase 2 is
purely additive — no code changes when it lands, and no code changes if it has
to be rolled back.

Two categories are deliberately left on `.me`, because they are identities
registered with someone else rather than addresses we control:

| Thing | Where | Why it stays |
|---|---|---|
| `aicheye/seanyang.me`, `aicheye/tui.seanyang.me` | jsDelivr URL, git remotes, release asset URLs | GitHub **repository** names, not hostnames. Renaming the repos would break the TUI's data fetch and every published release download URL. |
| `tui-seanyang-me` crate/binary | `Cargo.toml`, Dockerfile, systemd unit, release assets | The published artifact name. Renaming breaks `Dockerfile`'s release lookup and every existing install. |
| SE'30 webring `from=` origin | `src/data/site.ts` → `REGISTERED_ORIGIN` | The ring resolves a member by the origin it is handed. Sending `.ca` before re-registering finds no member and kills the prev/next arrows. |
| websitecarbon report slug | `src/app/components/Footer.tsx` | The slug is whatever host was scanned. `seanyang-ca` 404s until the new domain is scanned. |
| Bluesky handle `seanyang.me` | `public/data/socials.json`, TUI `fallback.json` | A DNS-verified atproto handle. The profile URL only becomes valid *after* the handle is re-verified against `_atproto.seanyang.ca`. |

## Phase 1 — dual domain (code, done)

| Repo | Change |
|---|---|
| `seanyang.me` | `src/data/site.ts` holds the canonical origin; `metadataBase` + `alternates.canonical` now emit `https://seanyang.ca`; `/resume` and `/transcript` proxy `docs.seanyang.ca`; SSH hint copies `ssh seanyang.ca`; primary email → `sean@seanyang.ca` |
| `tui.seanyang.me` | Nav border and resume link name `seanyang.ca` (`SITE_DOMAIN` const); fallback email → `sean@seanyang.ca`; crate metadata |
| `bucket` | Contact/website links → `.ca`; Hasura vhost serves both hostnames |
| `rankl` | Author credit link → `.ca` |
| `ezp2p` | No domain references — nothing to change |

`public/data/socials.json` is the shared source of truth: the TUI pulls it over
jsDelivr, so the email change reaches the terminal UI without a redeploy.

## Phase 2 — DNS and certificates (do before redirecting)

Nothing here should be started until `seanyang.ca` is registered and its
nameservers are live.

1. **Apex + www** — add `seanyang.ca` and `www.seanyang.ca` as domains on the
   Vercel project for this repo. Let Vercel issue the certificate. Verify both
   hostnames serve the site *before* touching `.me`.
2. **`docs.seanyang.ca`** — point at the same host serving `docs.seanyang.me`
   and issue a certificate. `/resume` and `/transcript` fetch this upstream, so
   until it resolves both routes return the upstream's error status. This is the
   one change in phase 1 that can break a live page — check it first.
3. **`bucket-hasura.seanyang.ca`** — A record to the droplet, then extend the
   existing certificate to cover both names:
   `certbot --nginx -d bucket-hasura.seanyang.ca -d bucket-hasura.seanyang.me`.
   Deploy `services/bucket-hasura.seanyang.ca` (the file was renamed; remove the
   stale `bucket-hasura.seanyang.me` symlink from `sites-enabled`) and reload.
   This vhost keeps answering on both names permanently — see the note in the
   file: GraphQL is POST, and redirecting POST loses the body on clients that do
   not re-send it.
4. **`tui.seanyang.ca`** — A record to the home server's public IP. SSH has no
   virtual hosting and no redirect, so `ssh seanyang.me` keeps working only for
   as long as that record exists. Keep both.

## Phase 3 — redirect .me → .ca

Done at the platform level, no deploy required.

**Vercel** (for the site): keep `seanyang.me` and `www.seanyang.me` on the
project, and set each one's redirect target to `seanyang.ca` in
*Project → Settings → Domains*. Vercel issues a 308 and preserves the path, so
`seanyang.me/resume` lands on `seanyang.ca/resume`.

**Cloudflare** (if `.me` DNS moves there instead): a single Redirect Rule —
match `http.host in {"seanyang.me" "www.seanyang.me"}`, dynamic target
`concat("https://seanyang.ca", http.request.uri.path)`, status 301, preserve
query string.

Verify before calling it done:

```bash
curl -sI https://seanyang.me/resume | head -3        # expect 308/301 → seanyang.ca/resume
curl -sI https://www.seanyang.me/   | head -3        # expect 308/301 → seanyang.ca
curl -s  https://seanyang.ca/ | grep canonical       # expect https://seanyang.ca
ssh seanyang.ca                                      # TUI, nav border reads seanyang.ca
```

Do **not** redirect `bucket-hasura.seanyang.me` or the SSH hostnames.

## Phase 4 — identities to re-register

None of these are code. Each one is a place the old domain is written down
somewhere we do not control, and each has a code reference waiting on it (see
the table at the top).

- [ ] **Email** — confirm `sean@seanyang.ca` delivers, and keep `.me` forwarding
      to it indefinitely. Every published copy of the old address (resumes in
      circulation, old commits, the sunset notice in `bucket`) points at `.me`
      forever.
- [ ] **Bluesky** — add the `_atproto.seanyang.ca` TXT record, change the handle,
      then update the URL and handle in `public/data/socials.json` (the TUI picks
      this up from jsDelivr automatically).
- [ ] **SE'30 webring** — re-register as `https://seanyang.ca`, then flip
      `REGISTERED_ORIGIN` in `src/data/site.ts`.
- [ ] **websitecarbon** — re-scan `seanyang.ca`, then update the report slug in
      `Footer.tsx`.
- [ ] **Resume and transcript PDFs** — the documents themselves carry the old
      email and site. They are built outside this repo and served from `docs.`;
      regenerate them.
- [ ] **Profiles** — GitHub, LinkedIn, X, and the SE webring listing all carry
      the site URL in their bio fields.
- [ ] **Search Console** — add `seanyang.ca` as a property and submit a change of
      address from `seanyang.me` once the 301/308 is live. The canonical tag
      already points at `.ca`, so the two signals agree.
