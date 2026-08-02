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

export interface ReceptionistConfig {
  greeting: string;
  businessName: string;
  businessHours: string;
  transferNumber: string | null;
  /** Free-form guidance appended to the receptionist's system prompt. */
  instructions: string;
  enabled: boolean;
}
