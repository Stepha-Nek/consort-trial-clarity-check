import { cn } from "@/lib/utils";
import { statusMeta } from "@/lib/status";
import type { ItemStatus } from "@/lib/api/types";

export function StatusIcon({ status, className }: { status: ItemStatus; className?: string }) {
  const m = statusMeta[status];
  return (
    <span aria-hidden className={cn("inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-bold", m.text, m.soft, m.border, className)}>
      {m.symbol}
    </span>
  );
}

export function StatusBadge({ status, className }: { status: ItemStatus; className?: string }) {
  const m = statusMeta[status];
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold", m.text, m.soft, m.border, className)}>
      <span aria-hidden>{m.symbol}</span>
      {m.label}
    </span>
  );
}
