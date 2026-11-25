import { Link } from "@tanstack/react-router";
import { Check as CheckIcon, Loader2 } from "lucide-react";
import type { Check } from "@/lib/api/types";
import { cn } from "@/lib/utils";

const steps = [
  { key: "queued", label: "Uploading", hint: "Receiving your manuscript" },
  { key: "parsing", label: "Parsing", hint: "Extracting text and sections" },
  { key: "checking", label: "Checking", hint: "Going through each CONSORT item" },
] as const;

export function Progress({ check }: { check: Check | undefined }) {
  if (check?.status === "error") {
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center">
        <span aria-hidden className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-danger bg-danger-soft text-xl font-bold text-danger">✗</span>
        <h1 className="mt-6 text-2xl font-semibold text-foreground">We couldn't check this file</h1>
        <p role="alert" className="mt-3 text-muted-foreground">{check.error}</p>
        <p className="mt-1 text-sm text-muted-foreground">{check.filename}</p>
        <Link to="/check" className="mt-8 inline-block rounded-md bg-primary px-5 py-2.5 font-semibold text-primary-foreground hover:bg-primary/90">Try another file</Link>
      </div>
    );
  }
  const current = Math.max(0, steps.findIndex((s) => s.key === (check?.status ?? "queued")));
  return (
    <div className="mx-auto max-w-md px-4 py-24">
      <h1 className="text-2xl font-semibold text-foreground">Checking your manuscript…</h1>
      {check && <p className="mt-2 truncate text-sm text-muted-foreground">{check.filename}</p>}
      <ol className="mt-10 space-y-6" aria-live="polite">
        {steps.map((s, i) => {
          const done = i < current, active = i === current;
          return (
            <li key={s.key} className="flex items-center gap-4" aria-current={active ? "step" : undefined}>
              <span className={cn("flex h-9 w-9 items-center justify-center rounded-full border", done ? "border-success bg-success-soft text-success" : active ? "border-primary bg-accent text-primary" : "border-border text-muted-foreground")}>
                {done ? <CheckIcon className="h-4 w-4" aria-hidden /> : active ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <span className="text-sm">{i + 1}</span>}
              </span>
              <div>
                <p className={cn("font-semibold", active || done ? "text-foreground" : "text-muted-foreground")}>
                  {s.label} {done && <span className="sr-only">(done)</span>}{active && <span className="sr-only">(in progress)</span>}
                </p>
                <p className="text-sm text-muted-foreground">{s.hint}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
