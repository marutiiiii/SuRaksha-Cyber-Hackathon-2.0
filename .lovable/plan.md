# ReguFlow AI — Frontend Completion Plan

Frontend-only. No backend, APIs, DBs, auth, AI, OCR, or PDF parsing. All behavior driven by React state + centralized mock data + simulated workflows. Persist user prefs (theme, copilot mode) in `localStorage`.

## Cross-cutting foundations (built once, used by every phase)

- **Rebrand to ReguFlow AI** across `index.html`, `Sidebar`, `TopBar`, route titles, favicon text.
- **Design system reset** (`src/index.css`, `tailwind.config.ts`):
  - Remove `* { border-radius: 0 !important }` override; set `--radius: 6px` (buttons/inputs 4px via component classes).
  - Tokens: primary `#1E40AF`, secondary slate `#475569/#64748B`, success `#16A34A`, warning `#D97706`, error `#DC2626`, info `#2563EB`, light bg `#F8FAFC`, dark bg `#0F172A`. Full HSL token set for both `:root` and `.dark`.
  - Typography: Inter via Google Fonts; H1 28–32, H2 20–24, card 16–18, body 14–16, label 12–14.
  - Spacing: restrict to 8/16/24/32/48/64 grid in utilities; shadows limited to `shadow-sm`/`shadow-md`.
  - Animations: 200/250/300ms transitions; no flashy motion.
- **Dark mode**: add `ThemeProvider` (class strategy on `<html>`), toggle in TopBar, persist in `localStorage`.
- **Centralized mock data**: `src/mocks/index.ts` exporting `regulations`, `maps`, `audits`, `departments`, `clauses`, `reports`, `alerts`, `conversations`, `users`. Every page imports from here.
- **Shared UI primitives**: `PageHeader`, `KpiCard`, `DataTable`, `StatusBadge`, `RiskBadge`, `EmptyState`, `LoadingState`, `ErrorState`, `Drawer` wrapper, `SeverityPill`.
- **Adaptive Copilot context** (`src/state/CopilotContext.tsx`): `mode: 'beginner' | 'intermediate' | 'expert'`, persisted; pages read from it to toggle density, tooltips, guidance.

## Phase 1 — Audit & standardization
- Sweep all existing pages; standardize: page header, section spacing, table styles (`DataTable`), card styles, badge colors.
- Add Loading/Empty/Error states to every data view.
- Fix sidebar active state, broken links, responsive collapse, dark-mode contrast.
- Replace bespoke risk colors with tokens.

## Phase 2 — Regulatory Intelligence Center (`/regulations`)
- Source cards row: RBI, SEBI, NPCI, CERT-In, Internal Policies (latest update, risk, active count, status).
- Enterprise feed `DataTable`: ID, Title, Source, Published, Risk Score, Status, Impacted Depts; sort + filter + search.
- Row click → right-side `RegulationDrawer`: Executive Summary, Key Obligations, Risk Assessment, Affected Departments, Suggested Actions, Related Regulations.

## Phase 3 — Document Analysis Workspace (`/document-analysis`, new route)
- Drag-and-drop zone (accepts PDF/DOCX visually; no parsing), file list, upload history.
- Simulated pipeline with animated stage tracker: Uploading → Extracting Clauses → Comparing Versions → Impact Analysis → Generating MAPs → Preparing Report (setTimeout-driven).
- Results panel: Added/Removed/Modified clause cards (id, severity, dept impact, summary, confidence).

## Phase 4 — Clause Change Detection (`/change-detection`)
- Side-by-side old vs new regulation viewer; inline highlights (added green, removed red, modified amber via tokens).
- Toolbar: search, severity filter, department filter, clause filter.
- Summary strip: total changes, high-risk changes, impacted depts, audit exposure.

## Phase 5 — Impact Analysis (`/impact-analysis`)
- Department impact matrix table (Compliance, Legal, Operations, IT, Cybersecurity, Audit): Impact Score, Risk, Priority, Recommended Action.
- Risk distribution chart (recharts) Low/Med/High.
- Business impact cards: Operational, Financial, Regulatory, Audit Readiness.

## Phase 6 — AI Compliance Copilot (`/copilot`, rework of AI Explanation)
- Chat shell with preloaded mock conversations; user types → canned response from mock map.
- Quick-action buttons: Explain Simply, Explain Technically, Generate MAPs, Summarize Changes, Show Impact, Generate Audit Report.
- Right-side Citation Panel: clause references, confidence, traceability.

## Phase 7 — Measurable Action Points (`/maps`, new route)
- KPI strip: Total, Pending, Assigned, In Progress, Completed, Overdue.
- Kanban board (5 columns) with drag-and-drop via `@dnd-kit/core` (already-allowed lib; add if missing). Cards: name, owner, deadline, severity, dept.
- Task drawer: description, related regulation, impact, owner, deadline, evidence required.

## Phase 8 — Audit Readiness Center (`/audit-readiness`, new route)
- Large circular health score (92%).
- Department readiness bars.
- Interactive vertical audit timeline.
- Findings cards: Open, Critical, Closed, Missing Evidence.
- Executive audit summary block.

## Phase 9 — Report Generation (`/reports`)
- Report type cards: Executive, Compliance, Risk, Department, Audit.
- Preview pane with print-styled layout; Print (window.print), Export (toast simulation), Share (modal simulation).

## Phase 10 — Adaptive Compliance Copilot mode
- User profile widget in TopBar: name, role, dept, expertise score, mode selector (Beginner / Intermediate / Expert).
- Beginner: visible tooltips, expanded explanation blocks, simplified tables (fewer columns), guided action banners, expanded assistant panel.
- Expert: dense tables (all columns), bulk-select, quick filters, keyboard shortcuts (`g d`, `g r`, etc. via `useHotkeys`), compact spacing, minimized assistant.
- Mode change instantly re-renders affected pages; persisted in `localStorage`.

## Phase 11 — Executive Dashboard (`/`)
- KPI cards: Compliance Health, Active Regulations, Pending MAPs, High-Risk Alerts, Audit Readiness, Department Exposure.
- Charts: Compliance Trend (line), Risk Distribution (donut), Department Readiness (bar), MAP Progress (stacked bar).
- "Executive Insights" AI-style mock insight cards.

## Phase 12 — Demo polish
- Final pass focused on: Adaptive Copilot, PDF upload sim, Clause comparison, MAP Kanban, Audit Readiness.
- Verify end-to-end demo flow (Dashboard → mode switch → upload → processing → changes → impact → MAPs → kanban → audit → report).
- Responsive QA at 1280/1024/768; dark/light QA.

## Technical notes
- Routes added: `/document-analysis`, `/copilot` (replaces `/ai-explanation` or aliases it), `/maps`, `/audit-readiness`. Sidebar regrouped: Intelligence / Analysis / Actions / Governance.
- New deps: `@dnd-kit/core`, `@dnd-kit/sortable`, `react-hotkeys-hook`, `next-themes` (or hand-rolled provider).
- File layout additions: `src/mocks/`, `src/state/`, `src/components/shared/`, new pages under `src/pages/`.
- Execution order is strictly Phase 1 → 12; each phase delivered as a discrete build turn so we can verify before moving on.

## Out of scope
Backend, APIs, DBs, auth, real AI/OCR/PDF/scraping/RAG/vector/ML, cloud services. All workflows are simulated in the client.
