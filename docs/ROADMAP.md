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

## Phase 3 — Revenue & content
- [ ] **AI Sales Assistant** — ingest call recordings, transcribe, coach,
      generate follow-ups, track opportunities (CRM integration)
- [ ] **AI Marketing Assistant** — generate posts/emails/ads/blogs, schedule
      to social channels
- [ ] **AI Document Automation** — quotes, proposals, contracts, invoices from
      templates + business data (PDF generation, storage)

## Phase 4 — Insight
- [ ] **AI Business Reporting** — scheduled summaries across all the data the
      other modules now produce (calls, leads, appointments, reviews, sales)

## Cross-cutting (do alongside)
- [ ] Billing & subscriptions (Stripe), per-service plans, usage metering
- [ ] Integrations UI (connect Twilio, Google, CRM with OAuth) + secret vault
- [ ] Admin/agency view: manage many client organizations from one console
- [ ] Audit logging, RBAC, SSO for larger clients
- [ ] Automated tests (unit for services/agent tools, e2e for auth + booking)
- [ ] Code-sign & auto-update the desktop app (electron-updater)
