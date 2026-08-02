# Roadmap

The platform (auth, multi-tenancy, AI layer, dashboard, module registry) is
built. Each remaining service is an incremental module on top of it. Suggested
order — earliest ROI and least new infrastructure first.

## Phase 0 — Harden the receptionist (now)
- [ ] Twilio webhook signature validation
- [ ] Real calendar integration (Google Calendar) so bookings check availability
- [ ] Post-call summary generation + email/SMS confirmation to the caller
- [ ] Encrypt integration secrets at rest

## Phase 1 — Text-based services (reuse the AI + knowledge base)
These need no new telephony and ship fast:
- [x] **AI Lead Follow-Up** — inbound lead → instant SMS/email, qualify, book
      (agent + web-form and inbound-SMS webhooks + dashboard simulator)
- [x] **Integrations UI + encrypted secret storage** (Twilio, Email/SMTP)
- [x] **AI Customer Service Agent** — public chat API + embeddable website widget
      over the knowledge base, with conversation history
- [x] **Agency console** — platform-admin view of all client orgs, create-client,
      and scoped impersonation to open any client's dashboard
- [ ] **AI Employee Knowledge Base** — internal chatbot (same retrieval, internal docs)
- [ ] Lead follow-up: scheduled re-engagement (drip) if a lead goes quiet

## Phase 2 — Scheduling & reviews
- [ ] **AI Appointment Scheduling** — confirmations, reminders, rescheduling
      (promote the beta booking into a full module with reminders)
- [ ] **AI Review Management** — request reviews after jobs, monitor + draft
      responses (Google Business Profile API)

## Phase 2 — Reviews (done)
- [x] **AI Review Management** — request reviews (SMS/email) + AI-drafted
      responses; live Google Business monitoring still to wire up

## Phase 3 — Revenue & content
- [ ] **AI Sales Assistant** — ingest call recordings, transcribe, coach,
      generate follow-ups, track opportunities (CRM integration)
- [x] **AI Marketing Assistant** — generate posts/emails/ads/blogs (grounded in
      the knowledge base); social scheduling still to add
- [x] **AI Document Automation** — quotes, proposals, contracts, invoices from
      business data, with PDF download (pdfkit)

## Phase 4 — Insight
- [x] **AI Business Reporting** — live metrics rollup (calls, leads,
      appointments, chats, conversion) + on-demand AI summary; scheduled/emailed
      reports still to add

## Cross-cutting (do alongside)
- [x] Billing & subscriptions (Stripe) with plan tiers + entitlement gating
      (simulation mode when Stripe isn't configured); webhook status sync
- [ ] Usage metering / per-seat or per-usage add-ons on top of the base plans
- [ ] Integrations UI (connect Twilio, Google, CRM with OAuth) + secret vault
- [ ] Admin/agency view: manage many client organizations from one console
- [ ] Audit logging, RBAC, SSO for larger clients
- [ ] Automated tests (unit for services/agent tools, e2e for auth + booking)
- [ ] Code-sign & auto-update the desktop app (electron-updater)
