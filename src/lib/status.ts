import type { ItemResult, ItemStatus } from "@/lib/api/types";

export const statusMeta: Record<ItemStatus, { label: string; symbol: string; text: string; soft: string; border: string }> = {
  reported: { label: "Passed", symbol: "✓", text: "text-success", soft: "bg-success-soft", border: "border-success" },
  possible: { label: "Check", symbol: "⚠", text: "text-warning", soft: "bg-warning-soft", border: "border-warning" },
  not_found: { label: "Failed", symbol: "✗", text: "text-danger", soft: "bg-danger-soft", border: "border-danger" },
  na: { label: "N/A", symbol: "➖", text: "text-neutral", soft: "bg-neutral-soft", border: "border-neutral" },
};

export const effectiveStatus = (r: ItemResult): ItemStatus => r.user_override ?? r.status;

/** Which paper section an item belongs in, keyed by checklist section code. */
export function targetSectionKind(sectionCode: string): string {
  if (sectionCode === "title_abstract") return "abstract";
  if (sectionCode === "open_science" || sectionCode === "other") return "declarations";
  return sectionCode;
}
