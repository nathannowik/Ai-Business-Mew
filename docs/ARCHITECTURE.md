# Architecture

## The big picture

Mew is a **multi-tenant SaaS platform** with a downloadable desktop client.
Each client business is an **Organization**; all data is scoped to it.

```
┌──────────────────────────────────────────────────────────────┐
│  Desktop app (apps/desktop, Electron)                          │
│  A secure shell that loads the web dashboard and login.        │
└───────────────┬──────────────────────────────────────────────┘
                │ loads
┌───────────────▼──────────────────────────────────────────────┐
│  Web dashboard (apps/web, Next.js)                             │
│  Login, service tiles, receptionist config + simulator,        │
│  calls, appointments, knowledge base.                          │
└───────────────┬──────────────────────────────────────────────┘
                │ HTTPS (Bearer JWT)
┌───────────────▼──────────────────────────────────────────────┐
│  Backend API (apps/api, Fastify + TypeScript)                 │
│  Auth · multi-tenant Postgres (Prisma) · AI layer (Claude) ·  │
│  module registry · Twilio voice webhooks                       │
└───────┬───────────────┬───────────────┬──────────────────────┘
        │               │               │
   Anthropic         Twilio         (future) CRM / Calendar /
   (Claude)        (telephony)       Email / Reviews / Storage
```

## Why an integration dashboard, not remote control

The original idea described "virtual control of everything they are running."
That describes RMM / remote-desktop software. We deliberately **did not** build
that, because:

1. **The AI services don't need it.** A receptionist needs a phone number and a
   calendar. A review manager needs the Google Business API. These are
   *business-system* integrations, not machine control.
2. **Liability & trust.** Controlling client machines means holding the keys to
   everything on them — a severe security, privacy, and legal burden, and a
   hard sell to customers.
3. **Cost.** Building and maintaining secure remote-control infrastructure is a
   product unto itself.

The client still gets the experience of "one app that runs all my AI" — that's
the dashboard. If a genuine remote-assist feature is ever needed, it can be
added later as a narrowly-scoped, consent-gated integration.

## Multi-tenancy

Every domain table has an `organizationId` and every tenant-scoped query filters
on the authenticated user's org (from the JWT). See
`apps/api/src/middleware/authenticate.ts` — it decodes the Bearer token into
`request.auth`, and route handlers use `request.auth.organizationId`.

## The module registry

Each AI service is a **module**. `apps/api/src/modules/registry.ts` wires module
routes into the server and exposes `/services` (the catalog + per-org
enablement) for the dashboard. Adding a service = new folder under `modules/` +
one line in the registry + a dashboard page. The catalog itself lives in
`packages/shared/src/services.ts` so every app agrees on the list.

## The AI layer

`apps/api/src/ai/claude.ts` is the single wrapper around the Anthropic SDK.
Reasoning-heavy features use `AI_MODEL` (default `claude-sonnet-5`); the
latency-sensitive voice receptionist uses `RECEPTIONIST_MODEL` (default a fast
model). No other file touches the SDK directly.

## The AI Receptionist

- **`service.ts`** — data helpers: config, knowledge context, booking, call
  transcript persistence.
- **`agent.ts`** — the conversation engine. Builds a system prompt from the
  org's config + knowledge base, runs a tool-use loop with Claude, and executes
  `book_appointment` / `transfer_call` / `end_call`. Returns the spoken reply
  plus the action the phone channel should take.
- **`twilio.ts`** — TwiML voice webhooks: greet on incoming call, gather the
  caller's speech, run a turn, then speak / gather again / dial (transfer) /
  hang up.
- **`routes.ts`** — dashboard endpoints (config CRUD, call list) and the
  `/receptionist/simulate` endpoint that drives the same engine over text so it
  can be tested without a phone.

### Telephony

With Twilio configured, point your number's Voice webhook at
`POST {PUBLIC_API_URL}/webhooks/twilio/voice/incoming`. The org is resolved from
the dialed number (a `twilio` integration row whose `config.phoneNumber`
matches) or an `?orgId=` query param. Without Twilio, the receptionist still
works fully in simulation mode from the dashboard.

## Security notes / TODO before production

- **Encrypt `Integration.config` at rest** (it will hold provider secrets).
- **Validate Twilio webhook signatures** (`twilio.validateRequest`) — stubbed
  as a follow-up; do it before exposing real numbers.
- **Rotate `JWT_SECRET`**, add refresh tokens, rate-limit `/auth/*`.
- **Add role checks** (owner/admin/member) on mutating routes.
- **Per-tenant usage metering & billing** (Stripe) for monetization.
