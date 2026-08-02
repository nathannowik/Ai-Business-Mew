/** Shared API contract types used by the backend, web dashboard, and desktop app. */

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: "owner" | "admin" | "member";
  organizationId: string;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

export interface Organization {
  id: string;
  name: string;
  createdAt: string;
}

export type CallStatus = "in_progress" | "completed" | "transferred" | "missed";

export interface CallSummary {
  id: string;
  fromNumber: string;
  toNumber: string;
  status: CallStatus;
  startedAt: string;
  endedAt: string | null;
  summary: string | null;
  transcript: CallTurn[];
}

export interface CallTurn {
  role: "caller" | "assistant";
  text: string;
  at: string;
}

export interface Appointment {
  id: string;
  customerName: string;
  customerPhone: string | null;
  startsAt: string;
  durationMinutes: number;
  notes: string | null;
  source: string; // e.g. "receptionist"
  createdAt: string;
}

export interface KnowledgeDoc {
  id: string;
  title: string;
  content: string;
  updatedAt: string;
}

export type LeadStatus = "new" | "contacted" | "qualified" | "booked" | "lost";
export type LeadChannel = "sms" | "email" | "form";

export interface LeadMessage {
  direction: "outbound" | "inbound";
  channel: LeadChannel;
  text: string;
  at: string;
}

export interface Lead {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  source: string;
  channel: LeadChannel;
  status: LeadStatus;
  inquiry: string | null;
  messages: LeadMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface LeadFollowUpConfig {
  businessName: string;
  /** Persona/instructions appended to the follow-up agent's system prompt. */
  instructions: string;
  /** What a qualified lead looks like — the AI uses this to decide. */
  qualificationCriteria: string;
  /** Preferred outreach channel when both phone and email are available. */
  preferredChannel: LeadChannel;
  enabled: boolean;
}

export interface ReceptionistConfig {
  greeting: string;
  businessName: string;
  businessHours: string;
  transferNumber: string | null;
  /** Free-form guidance appended to the receptionist's system prompt. */
  instructions: string;
  enabled: boolean;
}
