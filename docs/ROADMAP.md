# Roadmap

The platform (auth, multi-tenancy, AI layer, dashboard, module registry) is
built. Each remaining service is an incremental module on top of it. Suggested
order — earliest ROI and least new infrastructure first.

## Phase 0 — Go-live hardening
- [x] Twilio webhook signature validation (voice + SMS webhooks)
- [x] Security headers (helmet) + per-IP rate limiting
- [x] No-double-booking availability checks (self-service booking + slot compute)
- [x] Encrypt integration secrets at rest
- [x] Email/SMS confirmation on self-service bookings
- [x] Google Calendar integration provider (availability sync — API call still to wire)
- [ ] Post-call summary generation + confirmation SMS on receptionist bookings
- [ ] Rotate JWT/encryption secrets + refresh tokens

## Phase 1 — Text-based services (reuse the AI + knowledge base)
These need no new telephony and ship fast:
- [x] **AI Lead Follow-Up** — inbound lead → instant SMS/email, qualify, book
      (agent + web-form and inbound-SMS webhooks + dashboard simulator)
- [x] **Integrations UI + encrypted secret storage** (Twilio, Email/SMTP)
- [x] **AI Customer Service Agent** — public chat API + embeddable website widget
      over the knowledge base, with conversation history
- [x] **Agency console** — platform-admin view of all client orgs, create-client,
      and scoped impersonation to open any client's dashboard
- [x] **AI Employee Knowledge Base** — internal staff chat over all docs
      (public + internal SOPs); knowledge docs now carry an `internal` flag
- [x] Lead follow-up: scheduled re-engagement (drip) — nudges quiet leads on a
      configurable cadence (e.g. 1/3/7 days), with STOP opt-out; runs on the
      background scheduler
- [x] Activity feed — unified cross-service timeline (calls, leads, bookings,
      chats, reviews, documents, drips) with unread badge
- [x] Sales Assistant: call-recording upload + transcription (OpenAI Whisper),
      feeding the existing analysis
- [x] Review monitoring framework — Google Business Profile integration + dedup
      + scheduled polling (the Google API call itself is stubbed pending creds)

## Phase 2 — Scheduling & reviews (done)
- [x] **AI Appointment Scheduling** — create, reschedule, cancel, plus
      confirmation/reminder messaging (deterministic; sends via Twilio when
      connected). Auto-scheduled reminders (cron) still to add.
- [x] **AI Review Management** — request reviews after jobs, monitor + draft
      responses (Google Business Profile API still to wire up)
- [x] **AI Review Management** — request reviews (SMS/email) + AI-drafted
      responses; live Google Business monitoring still to wire up

## Phase 3 — Revenue & content
- [x] **AI Sales Assistant** — transcript analysis (score, coaching, next steps,
      follow-up draft) + opportunity pipeline. Live-recording ingest &
      transcription still to add.
- [x] **AI Marketing Assistant** — generate posts/emails/ads/blogs (grounded in
      the knowledge base); social scheduling still to add
- [x] **AI Document Automation** — quotes, proposals, contracts, invoices from
      business data, with PDF download (pdfkit)

## Phase 4 — Insight
- [x] **AI Business Reporting** — live metrics rollup (calls, leads,
      appointments, chats, conversion) + on-demand AI summary; scheduled/emailed
      reports still to add

## Client-readiness (done)
- [x] Transactional email (Resend) — email verification, password reset,
      team-invite emails; logs in simulation mode without a key
- [x] Password reset flow (forgot / reset pages + tokenized, hashed, expiring links)
- [x] Email verification + dashboard "verify your email" banner
      (REQUIRE_EMAIL_VERIFICATION to enforce at login)
- [x] Onboarding checklist — computed from real state (plan, config, knowledge,
      integrations, team), shown on the dashboard until complete

## Client-readiness (next)
- [ ] Real Google Calendar availability (wire the stubbed API call)
- [ ] Legal pages (Terms, Privacy) + account data export / deletion
- [ ] Error monitoring (Sentry) + automated DB backups

## Platform features (done)
- [x] Dashboard home — KPIs, upcoming appointments, recent activity
- [x] Customer-facing self-service booking page (`/book/:orgId`) with availability
- [x] Team seats — invite/manage members per client, role-gated (owner/admin)
- [x] CSV export for leads and appointments

## Cross-cutting (do alongside)
- [x] Billing & subscriptions (Stripe) with plan tiers + entitlement gating
      (simulation mode when Stripe isn't configured); webhook status sync
- [ ] Usage metering / per-seat or per-usage add-ons on top of the base plans
- [ ] Integrations UI (connect Twilio, Google, CRM with OAuth) + secret vault
- [ ] Admin/agency view: manage many client organizations from one console
- [ ] Audit logging, RBAC, SSO for larger clients
- [ ] Automated tests (unit for services/agent tools, e2e for auth + booking)
- [ ] Code-sign & auto-update the desktop app (electron-updater)
