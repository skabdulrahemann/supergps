# SuperGPS Production Setup

## Backend

1. Create `backend/.env` from `backend/.env.production.example`.
2. Set `DATABASE_URL` to your Neon Postgres connection string.
3. Set `JWT_SECRET` to a long random value.
4. Set `CORS_ORIGIN` to your deployed admin frontend URL.
5. Keep `DB_SYNC=false` after the schema is created.

For first-time setup on an empty Neon database, run:

```bash
npm run setup:db
```

This creates the schema and one admin user without force-deleting existing data.

## Admin Web

1. Create `admin-web/.env` from `admin-web/.env.production.example`.
2. Set `VITE_API_BASE_URL` to your deployed backend API URL.
3. Build with:

```bash
npm run build
```

## Verification

Backend:

```bash
npm test
npm run audit:prod
```

Frontend:

```bash
npm run build
```
