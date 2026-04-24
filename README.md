# Mix Loans Server

Backend API for the Mix Loans mobile app.

## Quick Start

```bash
cp .env.example .env
npm install
npm run migrate:pg
npm run dev
```

The API runs on `http://localhost:5000` by default.

## Database Platform

The backend now targets PostgreSQL (Supabase-hosted or any compatible PostgreSQL server) using the `pg` driver.

Express remains the main API layer. JWT auth remains in Express.

## Environment Variables

Preferred:

- `DATABASE_URL` - PostgreSQL connection string (Supabase recommended).

Optional split configuration (used when `DATABASE_URL` is not set):

- `PGHOST`
- `PGPORT`
- `PGDATABASE`
- `PGUSER`
- `PGPASSWORD`
- `PGSSL=true|false`

Other required runtime variables:

- `PORT`
- `JWT_SECRET`
- `JWT_EXPIRES_IN_SECONDS`
- `ADMIN_USERNAME` (or `ADMIN_EMAIL`)
- `ADMIN_PASSWORD`
- `ADMIN_FULL_NAME`

## PostgreSQL Migration Files

PostgreSQL schema and seed files:

- `db/postgres/001_live_schema.sql`
- `db/postgres/002_seed_settings.sql`

Run them with:

```bash
npm run migrate:pg
```

## Legacy MySQL Migration Note

`db/migrations/001_core_upgrade.sql` is kept for historical MySQL reference only and is not the PostgreSQL source of truth.

## Parity Verification Script

Smoke/parity verification runner:

```bash
npm run parity:api
```

Optional write-flow checks (creates test records; use on staging only):

```bash
PARITY_WRITE=true npm run parity:api
```
