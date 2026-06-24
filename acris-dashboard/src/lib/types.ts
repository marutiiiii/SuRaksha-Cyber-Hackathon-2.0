// ─── Core domain types ───────────────────────────────────────────────────────
// These were previously co-located with mock data in @/mocks/index.ts.
// They are pure TypeScript interfaces/type aliases with no data attached.

export type Risk = "High" | "Medium" | "Low";
export type Severity = "Critical" | "High" | "Medium" | "Low";
export type MapStatus = "Pending" | "Assigned" | "In Progress" | "Review" | "Awaiting Validation" | "Completed";

export interface MAP {
  id: string;
  title: string;
  description: string;
  owner: string;
  ownerInitials: string;
  department: string;
  dueDate: string;
  severity: Severity;
  status: MapStatus;
  regulationId: string;
  evidenceRequired: string[];
  impact: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  citations?: { clause: string; regulation: string; confidence: number; text?: string }[];
}
