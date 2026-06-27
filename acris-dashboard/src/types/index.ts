export interface User {
  id: string;
  email: string;
  full_name?: string;
  organization_id?: string;
  role_id?: string;
  department?: string;
  user_type?: string;
  status?: string;
  created_at: string;
}

export interface Document {
  id: string;
  user_id: string;
  title: string;
  source: string;
  file_path: string;
  status: string;
  created_at: string;
  copilot_mode?: string;
}

export interface Clause {
  id: string;
  document_id: string;
  clause_id: string;
  text: string;
}

export interface Comparison {
  id: string;
  old_document_id: string;
  new_document_id: string;
  changes: unknown;
  created_at: string;
  old_document?: Document;
  new_document?: Document;
}

export interface ImpactAnalysis {
  id: string;
  comparison_id: string;
  user_id: string;
  risk_level: string;
  impact_summary: string;
  departments: string[];
  services: string[];
  created_at: string;
  copilot_mode?: string;
  comparison?: Comparison;
}

export interface MapTask {
  id: string;
  comparison_id: string;
  user_id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  assigned_department?: string;
  copilot_mode?: string;
  created_at: string;
  evidences?: Evidence[];
}

export interface Evidence {
  id: string;
  map_id: string;
  file_path: string;
  status: string;
  department?: string;
  organization_id?: string;
  requested_status?: string;
  previous_status?: string;
  progress?: string;
  validation_status?: string;
  uploaded_at: string;
  ai_confidence?: number;
  ai_rationale?: string;
  impact_score?: number;
}

export type JsonValue = string | number | boolean | null | { [key: string]: JsonValue } | JsonValue[];
export type JsonObject = { [key: string]: JsonValue };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyObject = any;

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  is_read: boolean;
  type: string;
  created_at: string;
  copilot_mode?: string;
}

export interface Regulation {
  id: string;
  title: string;
  source: string;
  publish_date?: string;
  content: string;
  summary?: string;
  created_at: string;
  risk_level?: string;
  obligations?: unknown[];
  suggested_actions?: unknown[];
}
