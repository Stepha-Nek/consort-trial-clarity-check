import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Download, Trash2, Clock, X, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import type { Check, CheckDocument, ChecklistItem, ExportFormat, ItemResult, ItemStatus } from "@/lib/api/types";
import { effectiveStatus, statusMeta, targetSectionKind } from "@/lib/status";
import { StatusBadge, StatusIcon } from "./StatusBadge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type Filter = "all" | "reported" | "not_found" | "possible";
const filters: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "reported", label: "Passed" },
  { key: "not_found", label: "Failed" },
  { key: "possible", label: "Check" },
];

export function locationOf(doc: CheckDocument | undefined, paragraphId: string): string {
  if (!doc) return "";
  for (const s of doc.sections) {
    const p = s.paragraphs.find((x) => x.id === paragraphId);
    if (p) return [s.heading, p.subheading].filter(Boolean).join(" › ") + (p.page != null ? `, p. ${p.page}` : "");
  }
  return "";
}

export function Report({ check }: { check: Check }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const id = check.check_id;
  const checklist = useQuery({ queryKey: ["checklist", check.checklist_code], queryFn: () => api.getChecklist(check.checklist_code) });
  const doc = useQuery({ queryKey: ["document", id], queryFn: () => api.getDocument(id) });

  const [filter, setFilter] = useState<Filter>("all");
  const [selected, setSelected] = useState<string | null>(null);
  const [tab, setTab] = useState<"checklist" | "paper">("checklist");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const paperRef = useRef<HTMLDivElement>(null);

  const byId = useMemo(() => new Map(check.results.map((r) => [r.item_id, r])), [check.results]);
  const itemsById = useMemo(() => {
    const m = new Map<string, ChecklistItem>();
    checklist.data?.sections.forEach((s) => s.items.forEach((i) => m.set(i.id, i)));
    return m;
  }, [checklist.data]);

  const counts = useMemo(() => {
    const c: Record<ItemStatus, number> = { reported: 0, possible: 0, not_found: 0, na: 0 };
    check.results.forEach((r) => c[effectiveStatus(r)]++);
    return c;
  }, [check.results]);
  const applicable = check.results.length - counts.na;
  const hoursLeft = Math.max(0, Math.ceil((new Date(check.delete_after).getTime() - Date.now()) / 3_600_000));

  const patch = useMutation({
    mutationFn: (v: { itemId: string; user_override: "na" | "reported" | null; user_location: string | null }) =>
      api.patchItem(id, v.itemId, { user_override: v.user_override, user_location: v.user_location }),
    onSuccess: (updated) => {
      qc.setQueryData<Check>(["check", id], (old) => old && { ...old, results: old.results.map((r) => (r.item_id === updated.item_id ? updated : r)) });
      void qc.invalidateQueries({ queryKey: ["check", id] });
      toast.success("Report updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const exportMut = useMutation({
    mutationFn: (format: ExportFormat) => api.exportCheck(id, format),
    onSuccess: ({ blob, filename }) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = filename; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: () => api.deleteCheck(id),
    onSuccess: () => {
      qc.removeQueries({ queryKey: ["check", id] });
      toast.success("Your manuscript and report were deleted.");
      void navigate({ to: "/check" });
    },
  });

  const sel = selected ? byId.get(selected) : undefined;

  // Scroll paper to the evidence (or target section for failed items).
  useEffect(() => {
    if (!sel || !paperRef.current) return;
    const st = effectiveStatus(sel);
    const target =
      st === "reported" || st === "possible"
        ? paperRef.current.querySelector<HTMLElement>(`[data-ev~="${sel.item_id}"]`)
        : paperRef.current.querySelector<HTMLElement>(`#sec-${targetSectionKind(sel.section_code)}`);
    if (!target) return;
    target.scrollIntoView({ behavior: "smooth", block: "center" });
    target.classList.remove("flash-target");
    void target.offsetWidth;
    target.classList.add("flash-target");
  }, [sel, tab]);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6">
      {/* Header */}
      <section className="border-b border-border py-6">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="min-w-0">
            <p className="text-sm text-muted-foreground">
              {checklist.data?.name ?? check.checklist_code} · <span className="truncate">{check.filename}</span>
            </p>
            <h1 className="mt-1 text-3xl font-semibold text-foreground">
              {counts.reported} of {applicable} passed
            </h1>
            <ul className="mt-3 flex flex-wrap gap-2" aria-label="Counts by status">
              {(["reported", "possible", "not_found", "na"] as const).map((s) => (
                <li key={s} className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-sm font-medium", statusMeta[s].text, statusMeta[s].soft, statusMeta[s].border)}>
                  <span aria-hidden>{statusMeta[s].symbol}</span> {counts[s]} {statusMeta[s].label}
                </li>
              ))}
            </ul>
          </div>
          <div className="flex flex-col items-end gap-3">
            <div className="flex flex-wrap justify-end gap-2">
              <button onClick={() => exportMut.mutate("docx")} disabled={exportMut.isPending} className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
                <Download className="h-4 w-4" aria-hidden /> Download checklist (DOCX)
              </button>
              <button onClick={() => exportMut.mutate("pdf")} disabled={exportMut.isPending} className="inline-flex items-center gap-2 rounded-md border border-input bg-card px-3 py-2 text-sm font-semibold text-foreground hover:bg-muted disabled:opacity-60">
                <Download className="h-4 w-4" aria-hidden /> Download (PDF)
              </button>
              {!confirmDelete && (
                <button onClick={() => setConfirmDelete(true)} className="inline-flex items-center gap-2 rounded-md border border-input bg-card px-3 py-2 text-sm font-semibold text-danger hover:bg-danger-soft">
                  <Trash2 className="h-4 w-4" aria-hidden /> Delete now
                </button>
              )}
            </div>
            {confirmDelete && (
              <div role="alertdialog" aria-labelledby="del-q" className="flex flex-wrap items-center gap-3 rounded-md border border-danger bg-danger-soft px-3 py-2">
                <span id="del-q" className="text-sm font-medium text-foreground">Delete the manuscript and report permanently?</span>
                <button autoFocus onClick={() => del.mutate()} disabled={del.isPending} className="rounded-md bg-destructive px-3 py-1.5 text-sm font-semibold text-destructive-foreground">
                  {del.isPending ? "Deleting…" : "Yes, delete"}
                </button>
                <button onClick={() => setConfirmDelete(false)} className="rounded-md px-3 py-1.5 text-sm font-medium text-foreground hover:bg-card">Cancel</button>
              </div>
            )}
            <p className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" aria-hidden /> Deleted automatically in {hoursLeft} {hoursLeft === 1 ? "hour" : "hours"}
            </p>
          </div>
        </div>
      </section>

      {/* Mobile tabs */}
      <div role="tablist" className="mt-4 grid grid-cols-2 rounded-md bg-muted p-1 lg:hidden">
        {(["checklist", "paper"] as const).map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={cn("rounded px-3 py-2 text-sm font-semibold capitalize", tab === t ? "bg-card text-foreground shadow-sm" : "text-muted-foreground")}>
            {t}
          </button>
        ))}
      </div>

      <div className="grid gap-6 py-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        {/* LEFT */}
        <section aria-label="Checklist" className={cn("relative lg:block", tab === "paper" && "hidden")}>
          <div className="lg:sticky lg:top-4 lg:h-[calc(100vh-2rem)] lg:overflow-y-auto lg:pr-2">
            <div role="tablist" aria-label="Filter items" className="flex flex-wrap gap-1 border-b border-border pb-3">
              {filters.map((f) => {
                const n = f.key === "all" ? check.results.length : counts[f.key];
                return (
                  <button key={f.key} role="tab" aria-selected={filter === f.key} onClick={() => setFilter(f.key)} className={cn("rounded-md px-3 py-1.5 text-sm font-medium", filter === f.key ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-muted")}>
                    {f.label} <span className="ml-1 tabular-nums opacity-70">{n}</span>
                  </button>
                );
              })}
            </div>
            {checklist.isLoading && <p className="py-6 text-sm text-muted-foreground">Loading checklist…</p>}
            {checklist.data?.sections.map((sec) => {
              const rows = sec.items.filter((i) => {
                const r = byId.get(i.id);
                return r && (filter === "all" || effectiveStatus(r) === filter);
              });
              if (!rows.length) return null;
              return (
                <div key={sec.code} className="mt-5">
                  <h2 className="font-sans text-xs font-semibold uppercase tracking-wider text-muted-foreground">{sec.title}</h2>
                  <ul className="mt-2 space-y-1.5">
                    {rows.map((item) => {
                      const r = byId.get(item.id)!;
                      return (
                        <li key={item.id}>
                          <ItemRow item={item} result={r} doc={doc.data} active={selected === item.id} onClick={() => setSelected(item.id)} />
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
            {sel && itemsById.get(sel.item_id) && (
              <ItemDrawer
                key={sel.item_id}
                item={itemsById.get(sel.item_id)!}
                result={sel}
                doc={doc.data}
                pending={patch.isPending}
                onClose={() => setSelected(null)}
                onShowPaper={() => setTab("paper")}
                onPatch={(user_override, user_location) => patch.mutate({ itemId: sel.item_id, user_override, user_location })}
              />
            )}
          </div>
        </section>

        {/* RIGHT */}
        <section aria-label="Paper" className={cn("lg:block", tab === "checklist" && "hidden")}>
          <div ref={paperRef} className="rounded-lg border border-border bg-card px-5 py-8 sm:px-10 lg:sticky lg:top-4 lg:h-[calc(100vh-2rem)] lg:overflow-y-auto">
            {doc.data ? (
              <Paper
                doc={doc.data}
                results={check.results}
                itemsById={itemsById}
                selected={sel}
                onSelect={(itemId) => { setSelected(itemId); setTab("checklist"); }}
              />
            ) : (
              <p className="text-sm text-muted-foreground">Loading paper…</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function whyLine(r: ItemResult, doc: CheckDocument | undefined): string {
  const st = effectiveStatus(r);
  if (r.user_override === "reported") return `You marked this as reported${r.user_location ? `: ${r.user_location}` : ""}`;
  if (r.user_override === "na") return "You marked this as not applicable";
  const ev = r.evidence[0];
  if (st === "reported" && ev) return `“${ev.quote}” — ${locationOf(doc, ev.paragraph_id)}`;
  return r.rationale;
}

function ItemRow({ item, result, doc, active, onClick }: { item: ChecklistItem; result: ItemResult; doc: CheckDocument | undefined; active: boolean; onClick: () => void }) {
  const st = effectiveStatus(result);
  return (
    <button onClick={onClick} aria-current={active || undefined} className={cn("flex w-full items-start gap-3 rounded-md border p-3 text-left transition-colors", active ? "border-primary bg-accent" : "border-transparent hover:bg-muted")}>
      <StatusIcon status={st} className="mt-0.5" />
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline gap-2">
          <span className="font-semibold tabular-nums text-foreground">{item.number}</span>
          <span className="line-clamp-2 text-sm text-foreground">{item.text}</span>
        </span>
        <span className="mt-1 block line-clamp-2 text-xs text-muted-foreground">
          <span className={cn("font-semibold", statusMeta[st].text)}>{statusMeta[st].label}. </span>
          {whyLine(result, doc)}
        </span>
      </span>
    </button>
  );
}

function ItemDrawer({ item, result, doc, pending, onClose, onShowPaper, onPatch }: {
  item: ChecklistItem; result: ItemResult; doc: CheckDocument | undefined; pending: boolean;
  onClose: () => void; onShowPaper: () => void; onPatch: (o: "na" | "reported" | null, loc: string | null) => void;
}) {
  const st = effectiveStatus(result);
  const [pointing, setPointing] = useState(false);
  const [loc, setLoc] = useState(result.user_location ?? "");
  const headRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => { headRef.current?.focus(); }, []);
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  return (
    <aside role="dialog" aria-labelledby="drawer-title" className="absolute inset-0 z-10 overflow-y-auto rounded-lg border border-border bg-card p-5 shadow-xl lg:h-[calc(100vh-2rem)]">
      <div className="flex items-center justify-between">
        <button onClick={onClose} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm text-muted-foreground hover:bg-muted">
          <ArrowLeft className="h-4 w-4" aria-hidden /> All items
        </button>
        <button onClick={onClose} aria-label="Close" className="rounded-md p-1.5 text-muted-foreground hover:bg-muted"><X className="h-4 w-4" /></button>
      </div>
      <div className="mt-4 flex items-center gap-2">
        <StatusBadge status={st} />
        <span className="text-xs text-muted-foreground">Confidence {Math.round(result.confidence * 100)}%</span>
      </div>
      <h2 id="drawer-title" ref={headRef} tabIndex={-1} className="mt-3 text-xl font-semibold leading-snug text-foreground focus:outline-none">
        <span className="tabular-nums">{item.number}</span> · {item.text}
      </h2>

      {result.user_override && (
        <div className="mt-4 flex items-center justify-between gap-3 rounded-md bg-muted p-3 text-sm">
          <span>{result.user_override === "na" ? "You marked this as not applicable." : `You pointed to: ${result.user_location ?? "—"}`}</span>
          <button disabled={pending} onClick={() => onPatch(null, null)} className="font-semibold text-primary hover:underline">Undo</button>
        </div>
      )}

      <Block title="Why">
        <p>{result.rationale}</p>
      </Block>

      {result.evidence.length > 0 && (
        <Block title={st === "possible" ? "Related wording found" : "Evidence"}>
          <ul className="space-y-3">
            {result.evidence.map((e, i) => (
              <li key={i} className={cn("border-l-4 pl-3", result.status === "reported" ? "border-success" : "border-warning")}>
                <q className="font-serif">{e.quote}</q>
                <p className="mt-1 text-xs text-muted-foreground">{locationOf(doc, e.paragraph_id)}</p>
              </li>
            ))}
          </ul>
          <button onClick={onShowPaper} className="mt-3 text-sm font-semibold text-primary hover:underline lg:hidden">Show in paper →</button>
        </Block>
      )}

      <Block title="What CONSORT asks for"><p>{item.guidance}</p></Block>
      {result.suggestion && <Block title="How to fix"><p>{result.suggestion}</p></Block>}

      {!result.user_override && (st === "not_found" || st === "possible" || item.allows_na) && (
        <div className="mt-6 space-y-3 border-t border-border pt-5">
          {item.allows_na && (
            <button disabled={pending} onClick={() => onPatch("na", null)} className="w-full rounded-md border border-input px-3 py-2 text-sm font-semibold text-foreground hover:bg-muted disabled:opacity-60">
              ➖ Mark as not applicable
            </button>
          )}
          {st !== "reported" && (pointing ? (
            <form onSubmit={(e) => { e.preventDefault(); if (loc.trim()) onPatch("reported", loc.trim()); }} className="space-y-2">
              <label htmlFor="loc" className="text-sm font-medium text-foreground">Where is it reported?</label>
              <input id="loc" autoFocus value={loc} onChange={(e) => setLoc(e.target.value)} placeholder="e.g. Methods › Harms, p. 7, paragraph 2" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
              <div className="flex gap-2">
                <button type="submit" disabled={pending || !loc.trim()} className="rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60">Save</button>
                <button type="button" onClick={() => setPointing(false)} className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted">Cancel</button>
              </div>
            </form>
          ) : (
            <button onClick={() => setPointing(true)} className="w-full rounded-md border border-input px-3 py-2 text-sm font-semibold text-foreground hover:bg-muted">
              ✓ It's there, point to it
            </button>
          ))}
        </div>
      )}
    </aside>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-5">
      <h3 className="font-sans text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h3>
      <div className="mt-1.5 text-sm leading-relaxed text-foreground">{children}</div>
    </div>
  );
}

interface Mark { start: number; end: number; itemId: string; status: "reported" | "possible" }

function Paper({ doc, results, itemsById, selected, onSelect }: {
  doc: CheckDocument; results: ItemResult[]; itemsById: Map<string, ChecklistItem>; selected: ItemResult | undefined; onSelect: (id: string) => void;
}) {
  const marks = useMemo(() => {
    const m = new Map<string, Mark[]>();
    for (const r of results) {
      const st = effectiveStatus(r);
      if (st !== "reported" && st !== "possible") continue;
      for (const e of r.evidence) {
        if (e.start < 0) continue;
        const list = m.get(e.paragraph_id) ?? [];
        list.push({ start: e.start, end: e.end, itemId: r.item_id, status: st });
        m.set(e.paragraph_id, list);
      }
    }
    return m;
  }, [results]);
  const selSt = selected ? effectiveStatus(selected) : null;
  const failedTarget = selected && selSt === "not_found" ? targetSectionKind(selected.section_code) : null;

  return (
    <article className="mx-auto max-w-prose font-serif text-[1.05rem] leading-[1.75] text-foreground">
      {doc.sections.map((s) => {
        const isTitle = s.kind === "title";
        const underline = failedTarget === s.kind;
        let lastSub: string | null = null;
        return (
          <section key={s.id} className={isTitle ? "mb-8" : "mb-10"}>
            {!isTitle && (
              <h2 id={`sec-${s.kind}`} className={cn("mb-3 text-xl font-semibold", underline && "underline decoration-danger decoration-[3px] underline-offset-[6px]")}>
                {s.heading}
                {underline && <span className="ml-2 font-sans text-xs font-semibold text-danger">✗ Missing item belongs here</span>}
              </h2>
            )}
            {s.paragraphs.map((p) => {
              const showSub = !isTitle && s.kind !== "abstract" && p.subheading && p.subheading !== lastSub;
              lastSub = p.subheading;
              const text = <Highlighted text={p.text} marks={marks.get(p.id) ?? []} selectedId={selected?.item_id} itemsById={itemsById} onSelect={onSelect} />;
              return (
                <div key={p.id}>
                  {showSub && <h3 className="mb-2 mt-6 text-base font-semibold italic">{p.subheading}</h3>}
                  {isTitle ? <h1 className="text-2xl font-semibold leading-snug">{text}</h1> : <p className="mb-4">{text}</p>}
                </div>
              );
            })}
          </section>
        );
      })}
    </article>
  );
}

function Highlighted({ text, marks, selectedId, itemsById, onSelect }: {
  text: string; marks: Mark[]; selectedId: string | undefined; itemsById: Map<string, ChecklistItem>; onSelect: (id: string) => void;
}) {
  if (!marks.length) return <>{text}</>;
  const cuts = [...new Set([0, text.length, ...marks.flatMap((m) => [m.start, m.end])])].sort((a, b) => a - b);
  const out: React.ReactNode[] = [];
  for (let i = 0; i < cuts.length - 1; i++) {
    const a = cuts[i]!, b = cuts[i + 1]!;
    const seg = text.slice(a, b);
    const cover = marks.filter((m) => m.start <= a && m.end >= b);
    if (!cover.length) { out.push(seg); continue; }
    const status = cover.some((m) => m.status === "reported") ? "reported" : "possible";
    const isSel = cover.some((m) => m.itemId === selectedId);
    const ids = [...new Set(cover.map((m) => m.itemId))];
    out.push(
      <Popover key={a}>
        <PopoverTrigger asChild>
          <mark
            role="button"
            tabIndex={0}
            data-ev={ids.join(" ")}
            aria-label={`Evidence for item ${ids.map((x) => itemsById.get(x)?.number).join(", ")}`}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); (e.currentTarget as HTMLElement).click(); } }}
            className={cn("cursor-pointer text-inherit", status === "reported" ? "mark-reported" : "mark-possible", isSel && "ring-2 ring-ring")}
          >
            {seg}
          </mark>
        </PopoverTrigger>
        <PopoverContent className="w-80 font-sans">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Supports</p>
          <ul className="mt-2 space-y-1">
            {ids.map((x) => {
              const it = itemsById.get(x);
              const st = cover.find((m) => m.itemId === x)!.status;
              return (
                <li key={x}>
                  <button onClick={() => onSelect(x)} className="flex w-full items-start gap-2 rounded-md p-2 text-left text-sm hover:bg-muted">
                    <StatusIcon status={st} />
                    <span><span className="font-semibold">{it?.number}</span> {it?.text}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </PopoverContent>
      </Popover>,
    );
  }
  return <>{out}</>;
}
