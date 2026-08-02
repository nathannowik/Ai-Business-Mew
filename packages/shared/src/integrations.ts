/**
 * Catalog of external integrations clients can connect from the dashboard.
 * Each provider declares the fields it needs; the web UI renders a form from
 * this, and the backend validates against it. Secret fields are encrypted at
 * rest and never sent back to the client.
 */
export interface IntegrationField {
  key: string;
  label: string;
  type: "text" | "password";
  placeholder?: string;
  optional?: boolean;
}

export interface IntegrationProvider {
  key: string;
  name: string;
  description: string;
  /** Which fields are secret (encrypted at rest, returned masked). */
  fields: IntegrationField[];
  /** Service keys that rely on this integration. */
  usedBy: string[];
}

export const INTEGRATION_PROVIDERS: IntegrationProvider[] = [
  {
    key: "twilio",
    name: "Twilio",
    description:
      "Phone number for the AI receptionist and SMS for lead follow-up.",
    fields: [
      { key: "accountSid", label: "Account SID", type: "text", placeholder: "AC..." },
      { key: "authToken", label: "Auth Token", type: "password" },
      { key: "phoneNumber", label: "Phone Number", type: "text", placeholder: "+15551234567" },
    ],
    usedBy: ["receptionist", "lead_follow_up"],
  },
  {
    key: "email",
    name: "Email (SMTP)",
    description: "Send follow-up emails to leads and customers.",
    fields: [
      { key: "host", label: "SMTP Host", type: "text", placeholder: "smtp.gmail.com" },
      { key: "port", label: "Port", type: "text", placeholder: "587" },
      { key: "user", label: "Username", type: "text" },
      { key: "password", label: "Password", type: "password" },
      { key: "fromEmail", label: "From Address", type: "text", placeholder: "hello@yourbusiness.com" },
    ],
    usedBy: ["lead_follow_up"],
  },
  {
    key: "google_business",
    name: "Google Business Profile",
    description: "Monitor and import new Google reviews for AI responses.",
    fields: [
      { key: "locationId", label: "Location ID", type: "text", placeholder: "locations/12345" },
      { key: "apiToken", label: "API Token", type: "password" },
    ],
    usedBy: ["review_management"],
  },
];

/** What the API returns for an integration — never includes secret values. */
export interface IntegrationStatus {
  provider: string;
  connected: boolean;
  /** Non-secret field values echoed back for display (e.g. phoneNumber). */
  publicConfig: Record<string, string>;
  updatedAt: string | null;
}
