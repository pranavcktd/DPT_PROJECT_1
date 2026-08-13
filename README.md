# Government Contract & Payment Management System

Multi-tenant portal for government departments (PWD, Irrigation, Rural Engineering
Services, ...) to manage contractors, work orders, statutory-deduction payment
entries, budget tracking, and certificate/report generation.

## Repo layout

```
database/schema.sql   Raw PostgreSQL DDL - single source of truth for the schema
                       (tables, generated columns, budget-guardrail triggers,
                       reporting views, seed lookup data)
web/                   Next.js 16 app (App Router, TypeScript, Tailwind, shadcn/ui)
```

## Stack

- **Next.js 16** (App Router, Turbopack, Server Actions) + TypeScript + Tailwind + shadcn/ui
- **PostgreSQL** ([Neon](https://neon.tech), serverless) with the schema in
  `database/schema.sql` as the source of truth
- **Prisma 7** (`adapter-pg` / `pg`) - schema is introspected (`prisma db pull`) from
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

Prerequisites: Node 20.9+, a Postgres connection string (this project develops
directly against a [Neon](https://neon.tech) cloud database - no local Postgres
needed).

```bash
# 1. Install app dependencies
cd web
npm install

# 2. Configure environment
cp .env.example .env
# .env needs DATABASE_URL (your Neon connection string, sslmode=require) and AUTH_SECRET
# generate a secret with:
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# 3. Apply the schema to your Neon database (first time only - see database/schema.sql)
# then pull it into Prisma:
npm run db:pull

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

Edit `database/schema.sql`, then re-apply it to your Neon database and refresh
the Prisma client. There's no local Postgres client dependency required - a
plain Node script using the `pg` package can execute the whole file in one
`client.query(sql)` call (the simple query protocol supports multiple
statements). Then:

```bash
cd web
npm run db:pull                 # prisma db pull --force + prisma generate
npm run db:seed
```

Note: Postgres does not allow a generated column to reference another
generated column (MySQL does). `payments.total_bill_value`, `total_deductions`,
and `net_payable_amount` are therefore plain columns computed and written by
the app on every insert/update via `calculatePayment()` in
`src/lib/payment-calc.ts` - see the header note in `database/schema.sql` for
the full explanation before changing any deduction formula.

## Deploying: Neon (DB) + Vercel (app)

1. **Neon**: create a project (already done - `DPT_Project_1`), copy its
   connection string (`...?sslmode=require`), and apply `database/schema.sql`
   to it once (see "If you change the schema" above for how, without needing
   a local `psql`).
2. **Vercel**: import this repo, set the project **Root Directory** to `web/`.
   Add environment variables:
   - `DATABASE_URL` = the Neon connection string
   - `AUTH_SECRET` = a fresh secret (do not reuse the local dev one)
   - `AUTH_TRUST_HOST` = `true` (or set `AUTH_URL` to your Vercel domain) -
     required by Auth.js v5 behind Vercel's proxy
3. Vercel builds with `next build` (Turbopack) automatically; no separate
   migration step is needed at deploy time since the schema is applied
   directly to the Neon database via `database/schema.sql`, not via
   `prisma migrate`.

## Notes for whoever picks this up next

- Contractor/Scheme/Work masters, the 3-part Payment Entry form (with edit/
  cancel), Work Experience & Payment Certificate PDF generation
  (`@react-pdf/renderer`, no headless browser needed), and Department Profile
  are built and verified end to end.
- Department logo uploads currently use the local filesystem - need real
  object storage in production (Vercel's filesystem is ephemeral). Vercel
  Blob is the simplest fit if staying in the Vercel ecosystem.
- Super Admin (`web/src/app/(app)/super-admin/departments/`) is built:
  onboards departments (auto-creates the Department Admin login using the
  department's official email + default password `Client@123`), and can
  disable/enable, hard-delete (with typed tenant-code confirmation), reset
  the admin's password, and edit subscription amount/start date/days. Login
  is blocked at the credentials-auth layer for disabled departments and
  lapsed subscriptions (`src/lib/auth.ts`). Every user gets a self-service
  `/change-password` page (linked from the sidebar footer).
- Not yet built: Tax/Audit reports (TDS quarterly, GSTR-7 monthly, Contractor
  Tax Summary, Audit Log viewer) and a Staff/User Management UI for
  Department Admins to create additional staff accounts (the `USER_MANAGEMENT`
  module and permission model already exist in the schema, just no page yet).
  See `database/schema.sql`'s NOTES section for the app-layer contracts each
  module needs to respect (budget guardrail triggers, generated-column
  read-only fields, snapshot fields on `payments`, mandatory delete reasons).
