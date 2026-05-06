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

## Licence

Private project.
