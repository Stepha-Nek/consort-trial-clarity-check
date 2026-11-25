import { createFileRoute, Link } from "@tanstack/react-router";
import { FileUp, ListChecks, ShieldCheck, FileText } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CONSORT Check — item-by-item reporting check for RCT papers" },
      { name: "description", content: "Upload your randomised trial manuscript and see which CONSORT 2010 or 2025 items pass, fail, why, and how to fix them." },
      { property: "og:title", content: "CONSORT Check — reporting check for RCT papers" },
      { property: "og:description", content: "Item-by-item CONSORT 2010 / 2025 report for your trial manuscript, with evidence and fixes." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const steps = [
  { icon: FileUp, title: "Upload", body: "Drop in your manuscript as PDF or Word, or paste the text." },
  { icon: ListChecks, title: "Choose CONSORT version", body: "Check against CONSORT 2025 or the 2010 statement." },
  { icon: FileText, title: "Get your report", body: "See each item as passed, failed or to check — with the evidence and a suggested fix." },
];

function Landing() {
  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6">
      <section className="py-20 sm:py-28">
        <p className="text-sm font-semibold uppercase tracking-widest text-primary">For authors of randomised trials</p>
        <h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-tight text-foreground sm:text-5xl">
          Know which CONSORT items your manuscript reports — before the reviewers do.
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
          CONSORT Check reads your paper and goes through the checklist item by item, showing where each one is reported, what's missing, and how to fix it.
        </p>
        <div className="mt-10 flex flex-wrap items-center gap-4">
          <Link to="/check" className="rounded-md bg-primary px-6 py-3 text-base font-semibold text-primary-foreground shadow-sm hover:bg-primary/90">
            Check my manuscript
          </Link>
          <Link to="/check/$id" params={{ id: "demo" }} className="rounded-sm px-2 py-3 font-medium text-primary underline-offset-4 hover:underline">
            See a sample report →
          </Link>
        </div>
      </section>

      <section aria-labelledby="how" className="border-t border-border py-16">
        <h2 id="how" className="text-2xl font-semibold text-foreground">How it works</h2>
        <ol className="mt-8 grid gap-6 sm:grid-cols-3">
          {steps.map((s, i) => (
            <li key={s.title} className="rounded-lg border border-border bg-card p-6">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-accent-foreground">
                  <s.icon className="h-4 w-4" aria-hidden />
                </span>
                <span className="text-sm font-semibold text-muted-foreground">Step {i + 1}</span>
              </div>
              <h3 className="mt-4 text-lg font-semibold text-foreground">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mb-20 flex items-start gap-4 rounded-lg bg-accent p-6 text-accent-foreground">
        <ShieldCheck className="mt-0.5 h-6 w-6 shrink-0" aria-hidden />
        <div>
          <h2 className="font-sans text-base font-semibold">Your manuscript stays private</h2>
          <p className="mt-1 text-sm leading-relaxed">Your manuscript is deleted automatically after 24 hours and never used for training.</p>
        </div>
      </section>
    </div>
  );
}
