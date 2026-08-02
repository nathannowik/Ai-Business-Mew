/**
 * The catalog of AI services the platform offers. Each entry is a "module"
 * that plugs into the shared platform (auth, multi-tenant data, AI, billing).
 *
 * `status` tells the dashboard what to render:
 *   - "live"        fully implemented and usable today
 *   - "beta"        implemented, still hardening
 *   - "planned"     on the roadmap, shown as "coming soon"
 */
export type ServiceStatus = "live" | "beta" | "planned";

export interface ServiceDefinition {
  /** Stable key used in the DB and module registry. */
  key: string;
  name: string;
  description: string;
  status: ServiceStatus;
  /** Which external integrations this service needs to function. */
  integrations: string[];
}

export const SERVICE_CATALOG: ServiceDefinition[] = [
  {
    key: "receptionist",
    name: "AI Receptionist",
    description:
      "Answers calls, handles questions, books appointments, and transfers calls.",
    status: "live",
    integrations: ["twilio", "calendar"],
  },
  {
    key: "lead_follow_up",
    name: "AI Lead Follow-Up",
    description:
      "Instantly texts/emails leads, qualifies prospects, and books jobs.",
    status: "live",
    integrations: ["twilio", "email", "crm"],
  },
  {
    key: "customer_service",
    name: "AI Customer Service Agent",
    description: "Answers customer questions using the company's information.",
    status: "live",
    integrations: ["knowledge_base"],
  },
  {
    key: "knowledge_base",
    name: "AI Employee Knowledge Base",
    description:
      "Internal chatbot trained on company documents, policies, and SOPs.",
    status: "planned",
    integrations: ["knowledge_base"],
  },
  {
    key: "scheduling",
    name: "AI Appointment Scheduling",
    description: "Handles booking, confirmations, reminders, and rescheduling.",
    status: "beta",
    integrations: ["calendar", "email", "twilio"],
  },
  {
    key: "sales_assistant",
    name: "AI Sales Assistant",
    description:
      "Reviews sales calls, coaches reps, creates follow-ups, tracks opportunities.",
    status: "planned",
    integrations: ["crm", "call_recording"],
  },
  {
    key: "marketing_assistant",
    name: "AI Marketing Assistant",
    description: "Creates social posts, emails, ads, blogs, and promotions.",
    status: "planned",
    integrations: ["social", "email"],
  },
  {
    key: "review_management",
    name: "AI Review Management",
    description:
      "Requests reviews, responds to reviews, and monitors customer feedback.",
    status: "planned",
    integrations: ["google_business", "email", "twilio"],
  },
  {
    key: "business_reporting",
    name: "AI Business Reporting",
    description:
      "Summarizes sales, leads, customer data, and business performance.",
    status: "planned",
    integrations: ["crm", "analytics"],
  },
  {
    key: "document_automation",
    name: "AI Document Automation",
    description:
      "Creates quotes, proposals, contracts, invoices, and reports automatically.",
    status: "planned",
    integrations: ["storage"],
  },
];

export const SERVICE_KEYS = SERVICE_CATALOG.map((s) => s.key);
