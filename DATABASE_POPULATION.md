# Database Population Guide

This document describes how the Peaceful Academy database is created, migrated, and populated with data in both local and Netlify environments.

## Tables and Schema Sources

- Primary application schema is defined in `db/schema.ts` and compiled to SQL migrations in `migrations/` (e.g., `migrations/0000_loud_oracle.sql`).
- An alternate/legacy admin schema exists at `admin/sql/schema.sql` used by the TypeScript function at `netlify/api.ts` for on-demand bootstrapping when the `students` table does not exist.

## Creating and Migrating the Database

- Generate migrations from the TypeScript schema:
```bash
npm run db:generate
```
- Apply migrations (uses Neon via `@netlify/neon`):
```bash
npm run db:migrate
```
This runs `migrate.js`, which calls Drizzle migrator against the SQL files in `migrations/`.

## Automatic Schema Bootstrap (Admin API)

- The function `netlify/api.ts` contains `ensureSchemaLoaded()` logic:
  - On first request, it checks for the `students` table.
  - If missing, it reads `admin/sql/schema.sql` and executes it to create tables and insert default rows (e.g., default `subjects`).
  - This path is primarily for admin/legacy routes and is separate from Drizzle migrations.

## How Data Gets Inserted

- CRUD inserts via Netlify Functions in `netlify/functions/api.mjs` (primary runtime API):
  - `student.insert`, `course.insert`, `log.insert`, `portfolio.insert`, `backup.save` perform single-row inserts.
  - `bulk.upsertAll` clears all domain tables and inserts arrays of `students`, `courses`, `logs`, `portfolio`, `files`, and `settings` in one operation. Settings values are JSON-stringified.
- Admin function variant in `admin/netlify/functions/api.ts` provides similar CRUD and stats endpoints for the admin UI.

## Bulk Population (Import/Restore)

Use the bulk endpoint to load a full dataset dump back into the DB:
- Endpoint: `/.netlify/functions/api?action=bulk.upsertAll`
- Body shape:
```json
{
  "action": "bulk.upsertAll",
  "data": {
    "students": [ { "name": "Alice", "grade": "3" } ],
    "courses": [ { "title": "Math", "subject": "Mathematics" } ],
    "logs": [ { "studentId": 1, "courseId": 1, "date": "2025-01-10", "hours": "1.5" } ],
    "portfolio": [],
    "files": [],
    "settings": { "ui": { "theme": "light" } }
  }
}
```
Notes:
- The bulk operation deletes existing rows from `logs`, `portfolio`, `files`, `courses`, `students`, and `settings` before inserting new ones.
- Use with caution in production.

## Default/Seed Data

- The admin schema applies default subjects on first bootstrap:
  - `INSERT INTO subjects (...) VALUES (...)
    ON CONFLICT (name) DO NOTHING;`
- The primary Drizzle migration (`migrations/0000_...`) creates core app tables (`students`, `courses`, `logs`, `portfolio`, `files`, `settings`, `backups`) but does not include seed rows. Population happens via API calls or bulk import.

## Backfilling Derived Fields

- Action `logs.backfill` populates denormalized fields on `logs` (`studentName`, `courseTitle`, `subject`) by joining `students` and `courses` and updating any log rows with missing values.
- Invoke via: `/.netlify/functions/api?action=logs.backfill`

## Local Development Flow

1) Set `NETLIFY_DATABASE_URL` in `.env`.
2) Run migrations: `npm run db:migrate`.
3) Start dev: `npm run dev`.
4) Populate data by either:
   - Creating entities via the app UI/admin screens (which call the CRUD endpoints), or
   - Calling the bulk endpoint with a dataset export, or
   - Hitting admin API once to bootstrap the legacy schema if testing that path.

## Production (Netlify)

- On deploy, Netlify functions connect to Neon via the managed connection string.
- Ensure migrations have been applied out-of-band (CI step or manual `npm run db:migrate`).
- Runtime population occurs through user actions (CRUD), backup restore flows (bulk upsert), or occasional maintenance (`logs.backfill`).

## Files to Review

- Drizzle schema: `db/schema.ts`
- Migrator: `migrate.js`
- Primary API: `netlify/functions/api.mjs`
- Admin API: `admin/netlify/functions/api.ts` and `netlify/api.ts`
- Legacy schema SQL: `admin/sql/schema.sql`
- Generated SQL: `migrations/`
