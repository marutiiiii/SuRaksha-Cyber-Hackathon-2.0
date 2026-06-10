import { supabase } from "@/integrations/supabase/client";

async function authHeaders() {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

const FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

async function callFn<T = any>(name: string, body?: any, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    ...(await authHeaders()),
    ...(init?.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
    ...(init?.headers as any),
  };
  const res = await fetch(`${FN_URL}/${name}`, {
    method: init?.method ?? (body || init?.body ? "POST" : "GET"),
    headers,
    body: init?.body ?? (body ? JSON.stringify(body) : undefined),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `${name} failed: ${res.status}`);
  }
  return res.json();
}

export const api = {
  uploadDocument: async (file: File, source = "Unknown") => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("source", source);
    return callFn<{ documentId: string; document: any }>("upload-document", undefined, { body: fd });
  },
  listDocuments: () => callFn<{ documents: any[] }>("documents"),
  extractText: (documentId: string) => callFn<{ pages: number; text: string }>("extract-text", { documentId }),
  extractClauses: (documentId: string) =>
    callFn<{ count: number; clauses: any[] }>("extract-clauses", { documentId }),
  compare: (oldDocumentId: string, newDocumentId: string) =>
    callFn<{ comparisonId: string; added: any[]; removed: any[]; modified: any[]; counts: any }>(
      "compare-documents",
      { oldDocumentId, newDocumentId }
    ),
  impact: (comparisonId: string) =>
    callFn<{ matrix: any[]; perClause: any[] }>("impact-analysis", { comparisonId }),
  generateMaps: (comparisonId: string) =>
    callFn<{ count: number; maps: any[] }>("generate-maps", { comparisonId }),
  copilot: (message: string, sessionId?: string) =>
    callFn<{ sessionId: string; answer: string; citations: any[] }>("copilot-chat", { message, sessionId }),
  auditReadiness: () =>
    callFn<{ score: number; total: number; completed: number; overdue: number; departments: any[] }>("audit-readiness"),
  regulationsLatest: () => callFn<{ regulations: any[] }>("regulations-latest"),
  generateReport: (type: string) =>
    callFn<{ report: any; signed_url: string }>("generate-report", { type }),
};