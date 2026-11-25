# Consort Trial Clarity Check

Build "CONSORT Check", a web app where authors of randomised controlled trial (RCT) papers upload their manuscript, choose CONSORT 2010 or CONSORT 2025, and get an item-by-item report showing which checklist items passed, which failed, why, and how to fix them.




FRONTEND ONLY, WITH A MOCK API. A real FastAPI backend will be built later, so keep all data access behind one API layer:

- src/lib/api/types.ts: all request/response types (use snake_case field names exactly as below)

- src/lib/api/mock.ts: in-memory mock with realistic data; simulate processing (queued → parsing → checking → done over ~4 seconds)

- src/lib/api/http.ts: real implementation using fetch against import.meta.env.VITE_API_URL

- src/lib/api/index.ts: export mock or http depending on import.meta.env.VITE_USE_MOCK (default true)

Components must never call fetch directly. Use TanStack Query for all data fetching and polling.




ENDPOINTS (mock all of them, implement all in http.ts):

- GET /api/checklists → [{ code: "consort-2010"|"consort-2025", name, published_year }]

- GET /api/checklists/{code} → { code, name, sections: [{ code, title, items: [{ id, number, text, guidance, allows_na }] }] }

- POST /api/checks (multipart: file OR text, plus checklist code) → { check_id }

- GET /api/checks/{id} → { check_id, checklist_code, filename, status: "queued"|"parsing"|"checking"|"done"|"error", error: string|null, created_at, delete_after, summary: { reported, possible, not_found, na, total } | null, results: ItemResult[] }

- GET /api/checks/{id}/document → { title, sections: [{ id, kind: "title"|"abstract"|"introduction"|"methods"|"results"|"discussion"|"declarations"|"other", heading, paragraphs: [{ id, text, page: number|null, start, end, subheading: string|null }] }] }

- PATCH /api/checks/{id}/items/{item_id} body { user_override: "na"|"reported"|null, user_location: string|null } → updated ItemResult

- GET /api/checks/{id}/export?format=docx|pdf → file download (mock: download a small generated text file)

- DELETE /api/checks/{id} → 204




ItemResult = { item_id, number, section_code, status: "reported"|"possible"|"not_found"|"na", evidence: [{ paragraph_id, start, end, quote }], rationale, suggestion: string|null, confidence, user_override, user_location }

(evidence start/end are character offsets inside that paragraph's text, used for highlighting)




MOCK DATA: one realistic fake RCT manuscript (title, abstract, introduction, methods with subheadings Randomisation/Blinding/Sample size/Statistical analysis, results, discussion, declarations) with ~25 paragraphs. Include about 12 representative items per checklist version, mixing all four statuses, with evidence offsets that point at real text in the mock paper. Do not hardcode checklist items in components; always render what the API returns. Also include an "error" check (e.g. "Could not extract text — is this a scanned PDF?").




PAGES:

1. "/" Landing: headline, a 3-step "how it works" (Upload → Choose CONSORT version → Get your report), privacy note ("Your manuscript is deleted automatically after 24 hours and never used for training"), CTA button to /check.

2. "/check" Upload: drag-and-drop for PDF/DOCX (max 20 MB, validate type and size), a "Paste text" tab as an alternative, a CONSORT 2025 / CONSORT 2010 selector (default 2025), a Check button. On submit, go to /check/:id.

3. "/check/:id" Progress, then report. While processing, show steps Uploading → Parsing → Checking with the current one animated (poll every 1.5 s). On error, show the message and a "Try another file" button.




REPORT (when done):

- Header: filename, checklist version, summary score ("22 of 30 passed"), counts per status, buttons "Download checklist (DOCX)", "Download (PDF)", "Delete now" (with an in-page confirmation, not window.confirm), and "Deleted automatically in X hours".

- Two panes on desktop. LEFT: checklist grouped by section, filter tabs All / Passed / Failed / Check (with counts). Each row: status icon, item number, short item text. RIGHT: the paper's text by section with headings.

- Status styling (always icon + colour + label, never colour alone): green ✓ "Passed", amber ⚠ "Check", red ✗ "Failed", grey ➖ "N/A".

- Every item explains WHY. Passed: the evidence quote and its location (e.g. "Methods › Randomisation, p. 6"). Check: the related wording found and what may be missing. Failed: what was looked for and where, plus the fix suggestion.

- Clicking an item opens a side drawer (rationale, evidence quotes, "What CONSORT asks for" = guidance, "How to fix" = suggestion, "Mark as not applicable" if allows_na, "It's there, point to it" with a text field for its location; both call PATCH and update the counts) and scrolls the right pane to its evidence, highlighted green (passed) or amber (check). Failed items have no highlight; in the paper pane, underline the heading of the section where the text belongs in red.

- Clicking a highlight in the paper shows which items it supports.

- Mobile: tabs "Checklist" / "Paper" instead of two panes.




DESIGN: clean, professional, academic and trustworthy. Calm neutral palette with one accent colour, generous white space, readable serif or high-quality sans for the paper text. Light and dark mode. Accessible (keyboard navigation, focus states, good contrast). Footer disclaimer: "An automated aid, not a substitute for the official CONSORT checklist or editorial review."

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/23742ecd-25af-5250-9aab-f0e3b0e96587).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
