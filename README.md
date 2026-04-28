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

Build and run with the same env vars as production. [`docker-compose.yaml`](docker-compose.yaml) uses `network_mode: host` so `DATABASE_URL` can use `localhost:3306` when MariaDB runs on the same NAS. Bind-mount `./public/generated` so generated posters survive container restarts.

```bash
docker compose build
docker compose --env-file .env up -d
```

Point your reverse proxy at `PORT` (default 3000). Set `NEXTAUTH_URL` to the **public HTTPS URL** (no trailing slash) so cookies work securely.

## Roles

- **USER**: create/update meetings and program (no deleting meetings).
- **ADMIN**: full meeting CRUD, user management.

## Licence

Private project.
