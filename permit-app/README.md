# PermitPilot — Soliciting Permit Operations

Turn *"I need permits for Area 3 for Cascade Township"* into filled, print-ready permit
forms in a couple of clicks.

PermitPilot is a self-contained web app for door-to-door companies that have to apply for
a soliciting/peddler permit in every township they knock. It tracks your team, each
township's unique requirements, and auto-fills the real township permit PDFs so all you
have to do is print the stack and turn it in.

---

## What it does

- **Dashboard** — active employees, townships tracked, permit status, upcoming
  expirations, and compliance gaps at a glance.
- **Employees** — your field team. Each person is assigned to an **area group** and
  tracked for the per-person compliance items townships ask for (2×2 photo, background
  check, fingerprints).
- **Area groups** — teams like "Area 3". Employees belong to one; townships are
  designated to one. That pairing is what drives permit generation.
- **Townships** — every township is different, so each one records its own:
  - **Requirements** (fee, fingerprints, background check, 2×2 photo, insurance, bond,
    driver's license, vehicle info, in-person, notarized — plus free-form extras)
  - **Clerk / office contact** (name, email, phone, address, website)
  - **Logistics** (fee, processing time, how long the permit is valid)
  - The **official permit PDF**, uploaded once, with a field-to-data **mapping** so it
    auto-fills for every employee.
- **Generate Permits** — the core flow. Pick an area and the townships, and PermitPilot:
  1. Fills each employee's real township PDF (or a standardized packet if no PDF is
     uploaded yet),
  2. Flags any employee missing a requirement for that township,
  3. Merges everything into **one combined, print-ready batch PDF** you send to the
     printer.
- **Print batches** — every generation run is saved as a batch with a one-click **Print**
  button.
- **Permits** — every generated application and its lifecycle (generated → submitted →
  approved / denied / expired), with expiration tracking.
- **Township requests** — a queue to submit new townships you want to knock; research
  them, then convert a ready request into a tracked township.
- **Clerk emails** — generate a ready-to-send email to a clerk's office (request
  requirements, follow up, or transmit applications). You review and send from your own
  inbox — nothing is sent automatically.
- **Company profile** — your business details (name, address, insurance, bond, contact)
  that flow into every permit.

---

## Tech

- **Next.js** (App Router, server actions) — one process, one deploy.
- **Prisma + SQLite** — the entire database is a single file (`prisma/dev.db`); no
  external services to run.
- **pdf-lib** — detects AcroForm fields, fills them, and merges print batches, all in
  pure JavaScript.

---

## Run it locally

```bash
cd permit-app
npm install
npm run setup      # creates the SQLite DB and loads realistic sample data
npm run dev        # http://localhost:3000
```

Sign in with the seeded admin account (printed when you run `npm run setup`):
`admin@permitpilot.local` / `permitpilot`.

For a production build:

```bash
npm run build
npm start
```

## Accounts, roles & security

Each person signs in with their own **email + password** (passwords are scrypt-hashed).
Manage accounts under **Users** (admin only). Three roles:

| Role      | Can do                                                        |
| --------- | ------------------------------------------------------------ |
| `admin`   | Everything, including managing users and company settings.   |
| `manager` | Everything except user management.                           |
| `member`  | Day-to-day permit operations.                                |

Environment variables:

| Variable       | Purpose                                                                        | Default                   |
| -------------- | ------------------------------------------------------------------------------ | ------------------------- |
| `AUTH_SECRET`  | Signs the session cookie so it can't be forged. Set a long random string in production. | derived (dev only) |
| `ADMIN_EMAIL`  | Email for the initial admin account (first seed only).                         | `admin@permitpilot.local` |
| `APP_PASSWORD` | Password for the initial admin account (first seed only).                      | `permitpilot`             |

Edge middleware protects every route — including `/files/*`, which serves permit PDFs that
contain personal data. Sessions are signed per-user with `AUTH_SECRET`. **Set a strong
`AUTH_SECRET` and change the seeded admin password before exposing the app publicly.**

## Deploy with Docker

```bash
cd permit-app
docker compose up --build          # http://localhost:3000
# one-time: seed the fresh volume DB — this creates the admin login (and sample data)
docker compose exec permitpilot npm run db:seed
```

The seed is what creates the initial admin account, so run it at least once or you'll have
no way to sign in. Set `ADMIN_EMAIL` / `APP_PASSWORD` before seeding to control that login;
you can delete the sample townships/employees afterward.

The SQLite database persists on the `permitpilot-db` volume and uploaded/generated files
on `permitpilot-storage`, so both survive restarts. Set real `APP_PASSWORD` and
`AUTH_SECRET` values in `docker-compose.yml` (or your host's env) before going live.

Any platform that builds a Dockerfile (Render, Fly.io, Railway, a VPS) can run the same
image — just attach a persistent disk for `/data` and `/app/storage`.

### Useful scripts

| Script            | What it does                                    |
| ----------------- | ----------------------------------------------- |
| `npm run setup`   | `prisma db push` + seed sample data             |
| `npm run db:push` | Apply the schema to the database                |
| `npm run db:seed` | (Re)load sample data                            |
| `npm run dev`     | Start the dev server                            |
| `npm run build`   | Generate the Prisma client + production build   |

---

## How auto-fill works

1. On a township's page, upload its official **fillable** permit PDF. PermitPilot detects
   the form fields and pre-guesses a mapping (e.g. a field named `applicant_name` → the
   employee's full name).
2. Adjust the mapping if needed — each PDF field can be pointed at any employee, company,
   township, or date value.
3. When you generate permits, every field is filled per employee and the form is
   flattened so it prints exactly as the clerk expects.

If a township has no uploaded PDF (or the PDF is a flat scan with no form fields),
PermitPilot generates a clean standardized application packet instead, so you're never
blocked.

---

## Notes & next steps

- **Printing** from a hosted site goes through the browser's print dialog against the
  combined batch PDF — the closest a web app gets to "send to printer." For true
  one-click physical printing you'd run this on an office machine or add a print server.
- Uploaded files (township PDFs, employee photos) and generated batches live under
  `/storage` (git-ignored). The database lives at `prisma/dev.db` (git-ignored).
- SQLite is used for zero-setup portability. To move to Postgres later, change the
  `datasource` in `prisma/schema.prisma` and re-run the migration.
- This is a single-tenant MVP (no login yet). Add authentication before exposing it
  publicly.
