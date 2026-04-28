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
npm run dev
```

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

**Poster files** are stored under **`POSTER_STORAGE_DIR`** (default in the image: `/data/posters`), not under `public/generated`. URLs are still `/generated/posters/…`; a route handler serves the JPEGs so Next.js never runs `scandir` on a bind-mounted `public/generated` (which used to crash with **EACCES** on Synology). Compose mounts **`./data/posters:/data/posters`** — create the host dir before first run: `mkdir -p data/posters`.

If you have old files in `public/generated/posters/`, move them to `data/posters/` on the host (same filenames). **`user: "0:0"`** matches marcflix for root-owned NAS mounts; use **`chown -R 1001:1001 data/posters`** and drop `user` if you prefer the Dockerfile `nextjs` user.

[`docker-compose.yaml`](docker-compose.yaml) sets **`build.network: host`** (same as marcflix-2025) so **`npm ci` / Prisma** can reach the registry during the image build. On some engines (including older Synology setups) you must turn BuildKit on for that option:

```bash
export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1
docker compose build
docker compose --env-file .env up -d
```

If **Container Manager** stops the build during `npm ci`, open **SSH**, `cd` to the project, and run the same `docker compose build` from the shell (no UI timeout), or build the image on a faster machine and `docker save` / `docker load` on the NAS.

The Docker build follows the same pattern as **marcflix-2025** (Synology-tested). The runner image installs **`ttf-dejavu`** only, so poster text has fonts on minimal Alpine.

Point your reverse proxy at `PORT` (see `Dockerfile` / compose; default in README examples was 3000). Set `NEXTAUTH_URL` to the **public HTTPS URL** (no trailing slash) so cookies work securely.

## Roles

- **USER**: create/update meetings and program (no deleting meetings).
- **ADMIN**: full meeting CRUD, user management.

## Licence

Private project.
