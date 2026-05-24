# VierDeVrijdag

Next.js app to manage meetup programs (timeslots, speakers, visibility) and publish a poster image plus a public event page (`/event?meet=latest` or `meet=YYYYMMDD`).

## Prerequisites

- Node.js 22+
- MariaDB or MySQL (utf8mb4)
- Copy [`.env.example`](.env.example) to `.env` and set `DATABASE_URL`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`.

## Database (MySQL Workbench / phpMyAdmin)

1. Create a database:

   ```sql
   CREATE DATABASE IF NOT EXISTS vierdevrijdag
     CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```

2. Run [`database/init.sql`](database/init.sql) against it (tables + seed admin row; password documented in that script).

3. Grant your app user privileges on `vierdevrijdag` only (see phpMyAdmin user host vs. where the app connects from).

4. `DATABASE_URL` example:

   ```text
   mysql://USER:PASSWORD@HOST:3306/vierdevrijdag
   ```

   From another machine, use the server LAN IP and a user allowed for that client host (e.g. `user@192.168.%`). The app adds `connect_timeout=10` if not set on the URL.

## Local development

```bash
npm install
npx prisma generate
mkdir -p data/posters
npm run dev
```

### Poster JPEGs: one folder only

- **On disk:** only **`data/posters/`** (or **`POSTER_STORAGE_DIR`**). Meetup exports are named `YYYYMMDD.jpg`; the DB stores paths like `generated/posters/YYYYMMDD.jpg`.
- **In the browser:** that same path is a normal URL (`/generated/posters/…`), but it is **not** read from a `public/generated` directory. A **route handler** loads bytes from `data/posters/`.
- **If you still have `public/generated/`** from an old setup: **delete it** (or at least `public/generated/posters/`). Next can prefer those static files over the route handler, so you may see **out-of-date** posters while the app writes to `data/posters/`.

- Open [http://localhost:3000](http://localhost:3000) (login).
- Public page: `/event?meet=latest`.

Useful scripts:

| Script        | Purpose                          |
|---------------|----------------------------------|
| `npm run db:ping` | `SELECT 1` via Prisma CLI   |
| `npm run db:studio` | Prisma Studio             |
| `npm run build` / `npm start` | Production build        |

## Docker (e.g. Synology NAS)

Build and run with the same env vars as production. [`docker-compose.yaml`](docker-compose.yaml) uses `network_mode: host` so `DATABASE_URL` can use `localhost:3306` when MariaDB runs on the same NAS.

**Poster files** live only under **`POSTER_STORAGE_DIR`** (default **`./data/posters`**, in Docker **`/data/posters`** via the bind-mount). URLs stay **`/generated/posters/…`**; a route handler reads from that storage dir—**not** from `public/generated`. Avoid leaving **`public/generated/posters/`** on disk: static files there can **override** the route handler and show stale images. Migrate any old JPEGs into **`data/posters/`** (same filenames), then remove **`public/generated`**. This also avoids Next.js `scandir` on a bad NAS mount under `public/` (**EACCES** on Synology). Compose mounts **`./data/posters:/data/posters`** — create the host dir before first run: `mkdir -p data/posters`.

**`user: "0:0"`** matches marcflix for root-owned NAS mounts; use **`chown -R 1001:1001 data/posters`** and drop `user` if you prefer the Dockerfile `nextjs` user.

[`docker-compose.yaml`](docker-compose.yaml) sets **`build.network: host`** (same as marcflix-2025) so **`npm ci` / Prisma** can reach the registry during the image build. On some engines (including older Synology setups) you must turn BuildKit on for that option:

```bash
export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1
docker compose build
docker compose --env-file .env up -d
```

If **Container Manager** stops the build during `npm ci`, open **SSH**, `cd` to the project, and run the same `docker compose build` from the shell (no UI timeout), or build the image on a faster machine and `docker save` / `docker load` on the NAS.

The Docker build follows the same pattern as **marcflix-2025** (Synology-tested). The runner image installs **`ttf-dejavu`** only, so poster text has fonts on minimal Alpine.

Point your reverse proxy at `PORT` (see `Dockerfile` / compose; default in README examples was 3000). Set **`NEXTAUTH_URL`** to the **exact URL you open in the browser** (scheme, host, port; no trailing slash). If you use **`http://192.168.x.x:3009`** on the LAN, `NEXTAUTH_URL` must use **`http://`**, not `https://`, or session cookies are rejected and **login appears to fail** even with correct credentials. Behind a reverse proxy with HTTPS, use your public `https://…` URL and often **`AUTH_TRUST_HOST=true`** (see `.env.example`).

## Roles

- **USER**: create/update meetings and program (no deleting meetings).
- **ADMIN**: full meeting CRUD, user management.

## Nostr (NIP-05 + NIP-52)

The site can publish meetups as NIP-52 calendar events (`kind:31923`) from a server-held key, with NIP-05 identity **`meetup@<domain>`** (see `NOSTR_NIP05_DOMAIN` below).

### Environment variables

All Nostr settings are **required** for publishing (no code defaults). Copy the block from [`.env.example`](.env.example).

| Variable | Purpose |
|----------|---------|
| `NOSTR_NPUB` | Public key for `/.well-known/nostr.json` and display. |
| `NOSTR_NSEC` | Server signing key. Never commit. Must match `NOSTR_NPUB` if both are set. |
| `NOSTR_RELAYS` | Comma-separated `wss://` relay URLs (at least one). |
| `NOSTR_CRON_TOKEN` | Bearer secret for `/api/nostr/cron/*` and `npm run nostr:backfill`. |
| `NOSTR_NIP05_DOMAIN` | Domain for NIP-05 (`meetup@domain`). |
| `NOSTR_PROFILE_NAME` | NIP-05 local name (e.g. `meetup`). |
| `NOSTR_PROFILE_DISPLAY_NAME` | kind:0 display name. |
| `NOSTR_PROFILE_ABOUT` | kind:0 bio text. |
| `NOSTR_PROFILE_PICTURE_URL` | Optional avatar URL on kind:0 profile. |
| `NOSTR_EVENT_HASHTAGS` | Comma-separated `t` tags on meetup events. Use empty string for none. |
| `NOSTR_EVENT_D_TAG_PREFIX` | Prefix for per-meetup `d` tags (e.g. `vierdevrijdag` → `vierdevrijdag-20260626`). |
| `NOSTR_CALENDAR_COLLECTION_D_TAG` | `d` tag for the kind:31924 collection. |
| `NOSTR_CALENDAR_COLLECTION_TITLE` | Title on the kind:31924 collection. |
| `NOSTR_CALENDAR_COLLECTION_DESCRIPTION` | Content on the kind:31924 collection. |
| `NOSTR_TIMEZONE` | IANA timezone for event times (e.g. `Europe/Amsterdam`). |
| `NOSTR_MEETUP_DEFAULT_START` | Fallback start time (`HH:mm`) when a meetup has no program slots. |
| `NOSTR_MEETUP_DEFAULT_END` | Fallback end time (`HH:mm`) when a meetup has no program slots. |
| `NOSTR_DELETION_REASON` | Text on kind:5 deletion requests. |

### Setup

1. Generate a key pair (once):

   ```bash
   npm run nostr:keygen
   ```

   Add `NOSTR_NPUB` and `NOSTR_NSEC` to `.env`. Never commit the nsec.

2. Generate a cron token (once):

   ```bash
   openssl rand -hex 32
   ```

   Set `NOSTR_CRON_TOKEN` in `.env`. Used by cron, backfill, and `npm run nostr:backfill`.

3. Set every variable in the Nostr block in `.env` (see `.env.example`). Missing values cause publish/NIP-05 operations to fail with a clear error.

4. Apply DB columns (new installs: [`database/init.sql`](database/init.sql); existing DB: [`database/migrations/20260523_nostr_publication_fields.sql`](database/migrations/20260523_nostr_publication_fields.sql) or `npx prisma db push`).

5. Verify NIP-05 (after deploy):

   ```bash
   curl -sS "https://vierdevrijdag.org/.well-known/nostr.json?name=meetup"
   ```

   External check: [nip05.dev](https://nip05.dev/) → `meetup@vierdevrijdag.org`.

6. Publish profile once (admin, while logged in):

   ```bash
   curl -fsS -X POST -b "next-auth.session-token=YOUR_SESSION" \
     https://vierdevrijdag.org/api/admin/nostr/publish-profile
   ```

   Or use **Publiceer profiel** / **Alle meetups opnieuw publiceren** on the admin Meetups page (admin only). Re-run after changing profile env vars or `NOSTR_NIP05_DOMAIN`.

### Publishing meetups

- In the meetup editor: **Publiceren op Nostr** (disabled until `visible_from` is today or earlier).
- After the first publish, edits to the meetup or program auto-republish when saved.
- Deleting a meetup (admin) sends a Nostr deletion request (`kind:5`).

### Cron (auto-publish newly visible meetups)

Requires `NOSTR_CRON_TOKEN` in `.env`.

```bash
*/10 * * * * curl -fsS -X POST \
  -H "Authorization: Bearer $NOSTR_CRON_TOKEN" \
  https://vierdevrijdag.org/api/nostr/cron/publish-due
```

Publishes upcoming meetups that are public (`visible_from <= today`) and not yet on Nostr, and republishes those changed since the last Nostr publish.

### Backfill (existing meetups missing Nostr fields)

Requires `NOSTR_CRON_TOKEN` in `.env`. For meetups already in the DB with empty `nostr_event_id`, publish them once and fill the DB columns. Only **public** meetups (`visible_from <= today`) are included; the template meetup is skipped. An empty `attempted: []` response means every eligible meetup already has Nostr fields set.

**Upcoming only** (default — same date filter as cron):

```bash
npm run nostr:backfill
```

**Include past meetups** (still requires `visible_from <= today`):

```bash
npm run nostr:backfill:past
```

Or via curl (app must be running):

```bash
curl -fsS -X POST \
  -H "Authorization: Bearer $NOSTR_CRON_TOKEN" \
  "http://localhost:3000/api/nostr/cron/backfill"

# with past meetups:
curl -fsS -X POST \
  -H "Authorization: Bearer $NOSTR_CRON_TOKEN" \
  "http://localhost:3000/api/nostr/cron/backfill?includePast=1"
```

Response lists `attempted`, `succeeded`, and `failed` meeting ids. Each success sets `nostr_event_id`, `nostr_d_tag`, and `nostr_published_at` on that row.

## Licence

Private project.
