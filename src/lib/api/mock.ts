import { mockDocument, sectionsFor, specsFor } from "./mock-data";
import type { Check, CheckSummary, ChecklistCode, ConsortApi, ItemResult } from "./types";

const delay = (ms = 250) => new Promise((r) => setTimeout(r, ms));
const DAY = 24 * 3600 * 1000;

interface Stored { check: Check; createdMs: number; failWith: string | null }
const store = new Map<string, Stored>();

function paragraphText(id: string) {
  for (const s of mockDocument.sections) for (const p of s.paragraphs) if (p.id === id) return p.text;
  return "";
}

export function buildResults(code: ChecklistCode): ItemResult[] {
  return specsFor(code).map((s) => ({
    item_id: `${code}-${s.number}`,
    number: s.number,
    section_code: s.section,
    status: s.status,
    evidence: s.quotes.map(([pid, quote]) => {
      const start = paragraphText(pid).indexOf(quote);
      if (start < 0) console.warn(`[mock] quote not found in ${pid}: ${quote}`);
      return { paragraph_id: pid, start, end: start + quote.length, quote };
    }),
    rationale: s.rationale,
    suggestion: s.suggestion,
    confidence: s.confidence,
    user_override: null,
    user_location: null,
  }));
}

export function summarise(results: ItemResult[]): CheckSummary {
  const sum: CheckSummary = { reported: 0, possible: 0, not_found: 0, na: 0, total: results.length };
  for (const r of results) sum[r.user_override ?? r.status]++;
  return sum;
}

function create(code: ChecklistCode, filename: string, failWith: string | null, id = crypto.randomUUID().slice(0, 8), createdMs = Date.now()) {
  store.set(id, {
    createdMs,
    failWith,
    check: {
      check_id: id, checklist_code: code, filename, status: "queued", error: null,
      created_at: new Date(createdMs).toISOString(), delete_after: new Date(createdMs + DAY).toISOString(),
      summary: null, results: buildResults(code),
    },
  });
  return id;
}

// Seeded demos: a finished report and a failed upload.
create("consort-2025", "telephone-coaching-rct.docx", null, "demo", Date.now() - 2 * 3600 * 1000);
create("consort-2010", "scanned-manuscript.pdf", "Could not extract text — is this a scanned PDF?", "demo-error", Date.now() - 60_000);

function advance(s: Stored): Check {
  const t = Date.now() - s.createdMs;
  const c = s.check;
  if (c.status === "done" || c.status === "error") return c;
  if (t < 800) c.status = "queued";
  else if (t < 2000) c.status = "parsing";
  else if (s.failWith) { c.status = "error"; c.error = s.failWith; }
  else if (t < 4000) c.status = "checking";
  else { c.status = "done"; c.summary = summarise(c.results); }
  return c;
}

function get(id: string): Stored {
  const s = store.get(id);
  if (!s) throw new Error("This check was not found. It may have been deleted.");
  return s;
}

const clone = <T,>(x: T): T => structuredClone(x);

export const mockApi: ConsortApi = {
  async listChecklists() {
    await delay();
    return [
      { code: "consort-2025", name: "CONSORT 2025", published_year: 2025 },
      { code: "consort-2010", name: "CONSORT 2010", published_year: 2010 },
    ];
  },
  async getChecklist(code) {
    await delay();
    return { code, name: code === "consort-2025" ? "CONSORT 2025" : "CONSORT 2010", sections: sectionsFor(code) };
  },
  async createCheck(req) {
    await delay(600);
    const filename = req.file?.name ?? "pasted-text.txt";
    const fail = /scan/i.test(filename)
      ? "Could not extract text — is this a scanned PDF?"
      : req.text !== undefined && req.text.trim().length < 200
        ? "The pasted text is too short to check. Paste the full manuscript."
        : null;
    return { check_id: create(req.checklist_code, filename, fail) };
  },
  async getCheck(id) {
    await delay(150);
    return clone(advance(get(id)));
  },
  async getDocument(id) {
    await delay();
    get(id);
    return clone(mockDocument);
  },
  async patchItem(id, itemId, body) {
    await delay(300);
    const s = get(id);
    const r = s.check.results.find((x) => x.item_id === itemId);
    if (!r) throw new Error("Item not found");
    r.user_override = body.user_override;
    r.user_location = body.user_location;
    if (s.check.summary) s.check.summary = summarise(s.check.results);
    return clone(r);
  },
  async exportCheck(id, format) {
    await delay(400);
    const c = get(id).check;
    const lines = [
      `CONSORT Check report — ${c.filename}`, `Checklist: ${c.checklist_code}`, "",
      ...c.results.map((r) => `${r.number}\t${(r.user_override ?? r.status).toUpperCase()}\t${r.user_location ?? r.evidence[0]?.quote ?? r.suggestion ?? ""}`),
    ];
    return { blob: new Blob([lines.join("\n")], { type: "text/plain" }), filename: `consort-check-${id}.${format}.txt` };
  },
  async deleteCheck(id) {
    await delay(300);
    store.delete(id);
  },
};
