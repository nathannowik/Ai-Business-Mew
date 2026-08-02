# Mew AI — Business Control Panel

A platform for an **"AI for business" services company**. Clients download a
desktop app, log in, and manage all of their AI services from one control
panel. The AI services connect to the client's business tools (phone, calendar,
email, CRM) through **secure integrations** — the app is a control panel, not
remote-control software for the client's computer.

**All 10 services from the product vision are live**, running as modules on one
shared platform (auth, multi-tenant data, AI, integrations, billing). The
platform also includes an **Integrations** layer, a **Billing** system with
plan-based entitlements, and an **Agency console** for managing all clients.

> **A note on "controlling everything they run":** none of these AI services
> need control of the client's actual computer. They need to connect to the
> client's *business systems* via APIs. That's what this codebase does — it's
> far safer, cheaper, and more trustworthy than RMM/remote-desktop software.
> See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the reasoning.

## The 10 services

| # | Service | Status |
|---|---------|--------|
| 1 | AI Receptionist | ✅ live |
| 2 | AI Lead Follow-Up | ✅ live |
| 3 | AI Customer Service Agent | ✅ live |
| 4 | AI Employee Knowledge Base | ✅ live |
| 5 | AI Appointment Scheduling | ✅ live |
| 6 | AI Sales Assistant | ✅ live |
| 7 | AI Marketing Assistant | ✅ live |
| 8 | AI Review Management | ✅ live |
| 9 | AI Business Reporting | ✅ live |
| 10 | AI Document Automation | ✅ live |

## Monorepo layout

```
apps/
  api/        Fastify + TypeScript backend (auth, multi-tenant DB, AI, Twilio)
  web/        Next.js client dashboard (login, config, calls, appointments)
  desktop/    Electron shell — the downloadable app that loads the dashboard
packages/
  shared/     Types + the AI service catalog shared across all apps
docs/         Architecture and roadmap
```

## Quick start

Prerequisites: Node 20+, Docker (for Postgres).

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
#   - set ANTHROPIC_API_KEY  (required for AI replies)
#   - Twilio vars are optional; without them the receptionist runs in
#     "simulation mode" and you test it from the dashboard chat.

# 3. Start Postgres and set up the database
npm run db:up
npm run db:migrate      # creates tables
npm run db:seed         # demo login: demo@mew.ai / demo1234

# 4. Run the backend and dashboard (two terminals)
npm run dev:api         # http://localhost:4000
npm run dev:web         # http://localhost:3000

# 5. (optional) Run the desktop app pointing at the dashboard
npm run dev:desktop
```

Then open http://localhost:3000, log in with the demo account, go to
**AI Receptionist**, and try the **simulator** — type what a caller would say
and watch it answer questions, book appointments, and offer transfers.

## Trying the AI Receptionist

**Simulator (no phone needed):** the receptionist page has a chat panel that
runs the exact same AI logic a real call uses. Try:

- "Do you fix water heaters, and how much?"
- "I'd like to book an appointment for tomorrow at 3pm, my name is Sam."
- "Can I speak to a person?"

Bookings show up under **Appointments**; the conversation is saved under
**Calls**.

## Trying AI Lead Follow-Up

Go to **AI Lead Follow-Up** and use the simulator: seed a lead (name + phone +
inquiry), hit **Start follow-up**, and the AI sends the first message. Reply as
the lead and watch it qualify and book. Leads and their status
(new → contacted → qualified → booked/lost) appear in the table below, and
transcripts expand inline.

Other ways leads enter the system:
- **Website form:** `POST {PUBLIC_API_URL}/webhooks/leads/{orgId}` with
  `{ name, phone, email, inquiry }` — creates the lead and fires instant outreach.
- **Inbound SMS:** point your Twilio number's Messaging webhook at
  `POST {PUBLIC_API_URL}/webhooks/twilio/sms?orgId={orgId}` — the AI replies by text.

## Trying AI Customer Service

Go to **AI Customer Service**, configure the greeting, and use the test chat
(it calls the same public endpoint the website widget uses). Add facts under
**Knowledge Base** so it can answer specifics. To put it on a client's website,
copy the one-line embed snippet — it loads a floating chat bubble:

```html
<script src="{API}/widget.js?org={orgId}"></script>
```

## Agency console (for you, the operator)

If your user is a **platform admin**, an **Agency (all clients)** item appears in
the sidebar. From it you can see every client organization with rollup stats,
create a new client (org + owner login), and **Open** any client's dashboard
(a scoped, reversible impersonation — a banner lets you exit back to the
console). The demo account (`demo@mew.ai`) is seeded as a platform admin so you
can try it, and a second demo client is seeded so the console isn't empty.

## Billing & plans

The **Billing & Plans** page offers three subscription tiers (Starter $99,
Growth $299, Pro $599/mo). Each plan **unlocks a set of services** — that's the
entitlement layer: service action endpoints check the org's plan and return
`402` (dashboard shows an upgrade prompt) if it isn't included.

- **With Stripe configured** (`STRIPE_SECRET_KEY`): subscribing opens Stripe
  Checkout; a webhook (`POST /webhooks/stripe`, signature-verified) syncs the
  subscription status. "Manage billing" opens the Stripe customer portal.
- **Without Stripe** (default here): plans activate in **simulation mode**
  (instant, no charge) so the whole flow — subscribe, gate services, cancel — is
  testable. The seeded demo org is on **Pro**; the second demo org has no plan,
  so you can see gating (its services show 🔒 and its endpoints return 402/403).

## Connecting tools (Integrations)

The **Integrations** page lets each client connect **Twilio** (phone + SMS) and
**Email (SMTP)**. Credentials are **encrypted at rest** (AES-256-GCM) and never
returned to the browser. Until a tool is connected, the receptionist and lead
follow-up run in **simulation mode** (messages are logged, not sent), so you can
build and demo the whole product before wiring up real accounts.

**Real phone calls (Twilio):** set the Twilio vars in `.env`, expose your API
with a tunnel (e.g. `ngrok http 4000`), set `PUBLIC_API_URL` to the tunnel URL,
and point your Twilio number's Voice webhook at
`POST {PUBLIC_API_URL}/webhooks/twilio/voice/incoming`. See
[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md#telephony).

## What to build next

See [`docs/ROADMAP.md`](docs/ROADMAP.md). The short version: each new AI service
is a module under `apps/api/src/modules/` plus a dashboard page — the shared
platform (auth, tenancy, AI, billing) is already here.
