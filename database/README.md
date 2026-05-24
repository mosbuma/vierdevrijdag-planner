# Database

Schema source of truth: [`prisma/schema.prisma`](../prisma/schema.prisma).

## Existing database (production / dev)

The live database is kept in sync with Prisma. After pulling schema changes:

```bash
npx prisma generate
npx prisma db push
```

No manual SQL migration files need to be run.

## Fresh install

1. Create database `vierdevrijdag` (utf8mb4).
2. Either:
   - Run [`init.sql`](init.sql) in Workbench/phpMyAdmin (full schema + seed admin + template meetup), **or**
   - `npx prisma db push` on an empty database, then create an admin user manually.
3. Set `DATABASE_URL` in `.env`.

`init.sql` is destructive (drops tables). Use only on a new empty database.

## Other SQL

[`queries/export_meetups_and_items_flat.sql`](queries/export_meetups_and_items_flat.sql) — ad-hoc export query, not part of schema setup.
