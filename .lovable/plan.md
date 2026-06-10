
# ReguFlow AI — Backend & AI Implementation Plan

The frontend is frozen. We build the real backend on **Lovable Cloud** (Postgres + Storage + Deno Edge Functions) and **Lovable AI Gateway** (Gemini 2.5 Flash + Gemini embeddings). Each phase ships and is verified before the next.

## Architecture

```text
React UI (existing, untouched)
        │  supabase.functions.invoke(...)
        ▼
Deno Edge Functions  ──►  Lovable AI Gateway (Gemini 2.5 Flash, embeddings)
        │
        ├─► Postgres (documents, clauses, comparisons, maps, reports, chat_history)
        └─► Supabase Storage (raw PDFs + generated reports)
```

Endpoint → Edge Function mapping (1:1 with the spec):

| Spec route | Edge function |
|---|---|
| `POST /documents/upload` | `upload-document` |
| `GET /documents`, `GET /documents/{id}`, `GET /documents/{id}/text` | `documents` |
| `POST /documents/{id}/extract-clauses` | `extract-clauses` |
| `POST /compare` | `compare-documents` |
| `POST /impact-analysis` | `impact-analysis` |
| `POST /generate-maps` | `generate-maps` |
| `POST /copilot/chat` | `copilot-chat` |
| `GET /audit-readiness` | `audit-readiness` |
| `POST /reports/generate` | `generate-report` |
| `GET /regulations/latest` | `regulations-latest` |
| `GET /health` | not needed — Supabase has its own health |

## Phase 0 — Enable platform (one shot)

- Enable Lovable Cloud.
- Provision `LOVABLE_API_KEY` for the AI Gateway.
- Add **Email + Password** auth (per your choice). No profiles table (no profile fields requested); we use `auth.users` directly. Add a minimal `/login` + `/signup` route and an auth guard around the existing app shell. Demo accounts can self-register.
- Create Storage buckets: `documents` (private), `reports` (private).

## Phase 1 — Schema (single migration)

Tables, all with RLS scoped to `auth.uid()`, plus `GRANT`s to `authenticated` + `service_role`:

- `documents` — id, user_id, title, source (RBI/SEBI/…), file_path, pages, extracted_text, status (uploaded|extracted|analyzed), created_at
- `clauses` — id, document_id, clause_id (C001…), text, category, obligation, severity, embedding (vector(768), pgvector)
- `comparisons` — id, old_document_id, new_document_id, result_json (added/removed/modified arrays), created_at
- `maps` — id, comparison_id (nullable), clause_id (nullable), title, description, owner, severity, status (Open/In Progress/Done), deadline, created_at
- `reports` — id, user_id, type (executive|compliance|risk|audit), file_path, created_at
- `chat_history` — id, user_id, session_id, role (user|assistant), content, citations_json, created_at
- `regulations` — id, source, title, date, link, summary  *(seeded; powers Phase 11)*

Enable `pgvector` extension for clause embeddings (used by change detection).

## Phase 2 — Document ingestion (`upload-document`, `documents`)

- `upload-document`: accepts multipart PDF, stores in `documents` bucket at `${user_id}/${uuid}.pdf`, inserts row, returns `{ documentId, status: "uploaded" }`.
- `documents`: GET list + GET by id (with signed URL for download).

Frontend wiring: `DocumentAnalysis.tsx` dropzone → real upload + real history table from DB. Mocks kept as fallback if function call fails.

## Phase 3 — PDF text extraction (`extract-text`, merged into pipeline)

- Edge function uses `unpdf` (Deno-native, ships pdfjs internally) to extract text page-by-page.
- Updates `documents.extracted_text` and `documents.pages`; sets status = `extracted`.
- Exposed as `GET /documents/{id}/text` via the `documents` function.

## Phase 4 — Clause extraction (`extract-clauses`)

- Calls Gemini 2.5 Flash with structured-output (JSON) prompt: return array of `{ clauseId, text, category, obligation, severity }`.
- Computes embeddings via `google/gemini-embedding-001` and stores in `clauses.embedding`.
- Sets `documents.status = analyzed`.

## Phase 5 — Change detection (`compare-documents`)

- Pulls clauses for old + new doc.
- Cosine similarity on embeddings (in SQL via pgvector `<=>`):
  - high similarity (>0.92) + text equal → unchanged
  - high similarity + text differs → **modified**
  - new clause with no match → **added**
  - old clause with no match in new → **removed**
- Persists to `comparisons.result_json`. Powers `ChangeDetection.tsx`.

## Phase 6 — Impact analysis (`impact-analysis`)

- Input: comparison id (or clause id list).
- For each changed clause, Gemini returns `{ department, impactScore (0-100), reason }` across the 6 fixed departments.
- Aggregated to a per-department matrix for `ImpactAnalysis.tsx`.

## Phase 7 — MAP generation (`generate-maps`)

- Input: comparison id.
- Gemini turns each changed clause into a MAP task `{ title, description, owner, severity, deadline }`.
- Inserts into `maps`. Powers `Maps.tsx` Kanban (drag-and-drop already wired; status updates write back via a small `update-map-status` function or direct supabase-js call from client).

## Phase 8 — AI Copilot (`copilot-chat`)

- RAG-lite: retrieves top-K relevant clauses by embedding similarity against the user's question + pulls latest comparison summary + open MAPs as context.
- Streams Gemini response via AI SDK (`streamText`) with citations to clause ids.
- Persists turns to `chat_history`. Powers `AIExplanation.tsx`.

## Phase 9 — Audit readiness (`audit-readiness`)

- Pure SQL aggregation on `maps`: total, completed, overdue, by-department.
- Readiness % = completed / total (per spec). Returns dataset shaped to feed `AuditReadiness.tsx` (overall score, department ranking, findings counts).

## Phase 10 — Report generation (`generate-report`)

- Inputs: `{ type: "executive"|"compliance"|"risk"|"audit" }`.
- Pulls live data, renders PDF with `pdf-lib` (Deno-friendly), uploads to `reports` bucket, inserts into `reports`, returns signed URL.
- `Reports.tsx` Export button calls this.

## Phase 11 — Regulatory intelligence (`regulations-latest`)

- Seed `regulations` table with ~20 realistic RBI / SEBI / NPCI / CERT-In items (title, date, source, link, summary).
- Function returns sorted list. Powers `Regulations.tsx`. No scraping.

## Phase 12 — Frontend wiring (no UI changes)

Page-by-page, replace each page's mock data import with a thin `useQuery` hook calling the corresponding function. Mock fallback preserved for offline demo. Pages touched: `DocumentAnalysis`, `ChangeDetection`, `ImpactAnalysis`, `Maps`, `AIExplanation`, `AuditReadiness`, `Reports`, `Regulations`, `Dashboard` (KPIs become live).

## Out of scope

No Python/FastAPI, no Docker, no Kubernetes, no RBAC beyond per-user RLS, no vector DB beyond pgvector, no live scraping. No UI redesign.

## Technical notes

- All AI calls server-side via Lovable AI Gateway using the AI SDK provider helper; `LOVABLE_API_KEY` never reaches the browser.
- Default model: `google/gemini-3-flash-preview` (current Gemini Flash on the gateway; spec says "Gemini 2.5 Flash" — equivalent or newer on Lovable AI). Embeddings: `google/gemini-embedding-001` (768-dim).
- Functions deployed with `verify_jwt = false` default; each function validates the caller via `supabase.auth.getClaims()` and scopes all queries by `auth.uid()`.
- Long-running pipelines (extract → embed → analyze) are split into per-stage function calls invoked sequentially from the client so each stays well within edge-function timeouts and the existing 6-stage pipeline UI keeps animating accurately.

## Execution order

Phases run strictly one per turn: 0 → 1 → 2 → 3 → … → 12. After each phase I verify (DB query, function invoke, or preview interaction) before moving on.
