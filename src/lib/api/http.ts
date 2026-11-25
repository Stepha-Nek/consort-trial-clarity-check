import type {
  Check, CheckDocument, Checklist, ChecklistCode, ChecklistSummary, ConsortApi,
  CreateCheckRequest, CreateCheckResponse, ExportFormat, ItemResult, PatchItemRequest,
} from "./types";

const BASE = (import.meta.env["VITE_API_URL"] as string | undefined)?.replace(/\/$/, "") ?? "";

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, init);
  if (!res.ok) {
    let msg = `Request failed (${res.status})`;
    try {
      const body = (await res.json()) as { detail?: string };
      if (body.detail) msg = body.detail;
    } catch { /* ignore */ }
    throw new Error(msg);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const httpApi: ConsortApi = {
  listChecklists: () => req<ChecklistSummary[]>("/api/checklists"),
  getChecklist: (code: ChecklistCode) => req<Checklist>(`/api/checklists/${code}`),
  createCheck: (r: CreateCheckRequest) => {
    const fd = new FormData();
    fd.append("checklist_code", r.checklist_code);
    if (r.file) fd.append("file", r.file);
    if (r.text) fd.append("text", r.text);
    return req<CreateCheckResponse>("/api/checks", { method: "POST", body: fd });
  },
  getCheck: (id) => req<Check>(`/api/checks/${id}`),
  getDocument: (id) => req<CheckDocument>(`/api/checks/${id}/document`),
  patchItem: (id, itemId, body: PatchItemRequest) =>
    req<ItemResult>(`/api/checks/${id}/items/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  exportCheck: async (id, format: ExportFormat) => {
    const res = await fetch(`${BASE}/api/checks/${id}/export?format=${format}`);
    if (!res.ok) throw new Error(`Export failed (${res.status})`);
    const cd = res.headers.get("Content-Disposition") ?? "";
    const m = /filename="?([^";]+)"?/.exec(cd);
    return { blob: await res.blob(), filename: m?.[1] ?? `consort-check.${format}` };
  },
  deleteCheck: (id) => req<void>(`/api/checks/${id}`, { method: "DELETE" }),
};
