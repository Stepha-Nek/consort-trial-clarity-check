import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { FileUp, X } from "lucide-react";
import { api, type ChecklistCode } from "@/lib/api";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { validateFile } from "@/lib/validate";

export const Route = createFileRoute("/check/")({
  head: () => ({
    meta: [
      { title: "Upload your manuscript — CONSORT Check" },
      { name: "description", content: "Upload a PDF or DOCX of your RCT manuscript, or paste the text, and choose CONSORT 2025 or 2010." },
      { property: "og:title", content: "Upload your manuscript — CONSORT Check" },
      { property: "og:description", content: "Check your trial report against CONSORT 2025 or 2010." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: UploadPage,
});

function UploadPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"file" | "text">("file");
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);
  const [code, setCode] = useState<ChecklistCode>("consort-2025");
  const inputRef = useRef<HTMLInputElement>(null);

  const lists = useQuery({ queryKey: ["checklists"], queryFn: () => api.listChecklists() });
  const create = useMutation({
    mutationFn: () => api.createCheck(mode === "file" && file ? { checklist_code: code, file } : { checklist_code: code, text }),
    onSuccess: ({ check_id }) => navigate({ to: "/check/$id", params: { id: check_id } }),
    onError: (e: Error) => setError(e.message),
  });

  const pick = (f: File | undefined) => {
    if (!f) return;
    const err = validateFile(f);
    setError(err);
    setFile(err ? null : f);
  };

  const canSubmit = mode === "file" ? !!file : text.trim().length > 0;

  return (
    <div className="mx-auto max-w-2xl px-4 py-14 sm:px-6">
      <h1 className="text-3xl font-semibold text-foreground">Check a manuscript</h1>
      <p className="mt-2 text-muted-foreground">Deleted automatically after 24 hours. Never used for training.</p>

      <form
        className="mt-10 space-y-10"
        onSubmit={(e) => { e.preventDefault(); if (canSubmit) { setError(null); create.mutate(); } }}
      >
        <fieldset>
          <legend className="mb-3 text-sm font-semibold text-foreground">1. Your manuscript</legend>
          <Tabs value={mode} onValueChange={(v) => { setMode(v as "file" | "text"); setError(null); }}>
            <TabsList>
              <TabsTrigger value="file">Upload file</TabsTrigger>
              <TabsTrigger value="text">Paste text</TabsTrigger>
            </TabsList>
            <TabsContent value="file" className="mt-4">
              {file ? (
                <div className="flex items-center justify-between rounded-lg border border-border bg-card p-4">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">{file.name}</p>
                    <p className="text-sm text-muted-foreground">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
                  </div>
                  <button type="button" onClick={() => setFile(null)} className="rounded-md p-2 text-muted-foreground hover:bg-muted" aria-label="Remove file">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
                  onDragLeave={() => setDrag(false)}
                  onDrop={(e) => { e.preventDefault(); setDrag(false); pick(e.dataTransfer.files[0]); }}
                  className={cn(
                    "flex w-full flex-col items-center gap-3 rounded-lg border-2 border-dashed px-6 py-14 text-center transition-colors",
                    drag ? "border-primary bg-accent" : "border-input bg-card hover:border-primary",
                  )}
                >
                  <FileUp className="h-8 w-8 text-primary" aria-hidden />
                  <span className="font-medium text-foreground">Drag your PDF or DOCX here, or click to browse</span>
                  <span className="text-sm text-muted-foreground">Max 20 MB</span>
                </button>
              )}
              <input ref={inputRef} type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" className="sr-only" onChange={(e) => pick(e.target.files?.[0])} />
            </TabsContent>
            <TabsContent value="text" className="mt-4">
              <label htmlFor="ms-text" className="sr-only">Manuscript text</label>
              <Textarea id="ms-text" value={text} onChange={(e) => setText(e.target.value)} rows={12} placeholder="Paste the full text of your manuscript…" className="font-serif" />
            </TabsContent>
          </Tabs>
          {error && <p role="alert" className="mt-3 text-sm font-medium text-danger">✗ {error}</p>}
        </fieldset>

        <fieldset>
          <legend className="mb-3 text-sm font-semibold text-foreground">2. CONSORT version</legend>
          <div role="radiogroup" className="grid gap-3 sm:grid-cols-2">
            {(lists.data ?? [{ code: "consort-2025", name: "CONSORT 2025", published_year: 2025 }, { code: "consort-2010", name: "CONSORT 2010", published_year: 2010 }]).map((c) => (
              <label key={c.code} className={cn("flex cursor-pointer items-center gap-3 rounded-lg border bg-card p-4 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring", code === c.code ? "border-primary bg-accent" : "border-border")}>
                <input type="radio" name="checklist" value={c.code} checked={code === c.code} onChange={() => setCode(c.code)} className="accent-primary" />
                <span>
                  <span className="block font-semibold text-foreground">{c.name}</span>
                  <span className="text-sm text-muted-foreground">{c.code === "consort-2025" ? "Latest update (recommended)" : "Previous version"}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <button type="submit" disabled={!canSubmit || create.isPending} className="w-full rounded-md bg-primary px-6 py-3 font-semibold text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50">
          {create.isPending ? "Uploading…" : "Check"}
        </button>
      </form>
    </div>
  );
}
