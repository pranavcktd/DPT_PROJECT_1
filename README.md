# Government Contract & Payment Management System

Multi-tenant portal for government departments (PWD, Irrigation, Rural Engineering
Services, ...) to manage contractors, work orders, statutory-deduction payment
entries, budget tracking, and certificate/report generation.

## Repo layout

```
database/schema.sql   Raw MySQL DDL - single source of truth for the schema
                       (tables, generated columns, budget-guardrail triggers,
                       reporting views, seed lookup data)
docker-compose.yml     Local MySQL 8 for development
web/                   Next.js 16 app (App Router, TypeScript, Tailwind, shadcn/ui)
```

## Stack

- **Next.js 16** (App Router, Turbopack, Server Actions) + TypeScript + Tailwind + shadcn/ui
- **MySQL 8** with the schema in `database/schema.sql` as the source of truth
- **Prisma 7** (`adapter-mariadb`) - schema is introspected (`prisma db pull`) from
  the real database rather than managed by Prisma Migrate, because the schema
  relies on generated columns, `CHECK` constraints, and triggers that Prisma's
  schema language can't express. **Never hand-edit `web/prisma/schema.prisma`
  or run `prisma migrate` against it** - edit `database/schema.sql` and re-pull.
- **Auth.js v5** (`next-auth@beta`) - credentials login (email/password against
  the `users` table), JWT sessions carrying `roleCode` + `departmentId`
- **`src/proxy.ts`** - optimistic (cookie-only) auth gate on every route.
  Real per-module, per-role authorization happens server-side via
  `src/lib/session.ts` (`requireUser`/`requireRole`/`requireDepartmentUser`) in
  every Server Component, Server Action, and Route Handler - proxy alone is
  never sufficient, per Next.js's own guidance.

## Local setup

Prerequisites: Node 20.9+, Docker Desktop (already installed/running if you're
reading this after the initial setup session).

```bash
# 1. Start MySQL (loads database/schema.sql automatically on first run)
docker-compose up -d

# 2. Install app dependencies
cd web
npm install

# 3. Configure environment
cp .env.example .env
# .env needs DATABASE_URL (matches docker-compose.yml by default) and AUTH_SECRET
# generate a secret with:
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# 4. Seed demo data (a demo department + one user per role)
npm run db:seed

# 5. Run the app
npm run dev
```

Visit http://localhost:3000 - it redirects to `/login`.

### Demo accounts (seeded by `npm run db:seed`, password `Passw0rd!` for all)

| Email | Role |
|---|---|
| superadmin@example.com | Super Admin |
| deptadmin@example.com | Department Admin (PWD-DEMO) |
| engineer@example.com | Executive Engineer / Approver |
| dataentry@example.com | Data Entry Operator |
| auditor@example.com | Auditor / Viewer |

### If you change the schema

Edit `database/schema.sql`, then re-apply it to your dev database and refresh
the Prisma client:

```bash
docker-compose down -v          # wipes local data, re-applies schema.sql fresh on next up
docker-compose up -d
cd web
npm run db:pull                 # prisma db pull + prisma generate
npm run db:seed
```

## Moving to Railway (DB) + Vercel (app)

1. **Railway**: create a MySQL 8 database service, then run `database/schema.sql`
   against it (Railway's query console, or `mysql -h <host> -u <user> -p <db> < database/schema.sql`
   from your machine). Copy the connection string it gives you.
2. **Vercel**: import this repo, set the project **Root Directory** to `web/`.
   Add environment variables:
   - `DATABASE_URL` = the Railway MySQL connection string
   - `AUTH_SECRET` = a fresh secret (do not reuse the local dev one)
   - `AUTH_TRUST_HOST` = `true` (or set `AUTH_URL` to your Vercel domain) -
     required by Auth.js v5 behind Vercel's proxy
3. Vercel builds with `next build` (Turbopack) automatically; no separate
   migration step is needed at deploy time since the schema is applied
   directly to the Railway database via `database/schema.sql`, not via
   `prisma migrate`.

## Notes for whoever picks this up next

- PDF generation (Payment Certificates, Work Experience Certificates, Tax
  Ledger reports) is not yet implemented. Recommended: `@react-pdf/renderer`
  rather than Puppeteer/headless-Chrome - Vercel's serverless functions don't
  reliably support a bundled Chromium, and `@react-pdf/renderer` produces
  pixel-perfect PDFs without a browser.
- Department logo uploads need real object storage in production (Vercel's
  filesystem is ephemeral) - Vercel Blob is the simplest fit if staying in
  the Vercel ecosystem.
- CRUD modules (Contractor/Scheme/Work masters, the 3-part Payment Entry
  form, Certificates, Reports, Audit Logs, User Management, Super Admin
  tenant management) are not yet built - only the auth chain
  (login -> session -> role/department-aware dashboard) is proven end to end.
  See `database/schema.sql`'s NOTES section for the app-layer contracts each
  module needs to respect (budget guardrail triggers, generated-column
  read-only fields, snapshot fields on `payments`, mandatory delete reasons).
