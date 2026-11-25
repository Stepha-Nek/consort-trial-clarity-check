import { describe, expect, it } from "vitest";
import { buildResults, summarise } from "@/lib/api/mock";
import { mockDocument } from "@/lib/api/mock-data";
import { validateFile } from "@/lib/validate";

describe("upload validation", () => {
  it("rejects files over 20 MB", () => {
    expect(validateFile({ name: "a.pdf", size: 20 * 1024 * 1024 + 1 })).not.toBeNull();
  });
  it("accepts a 20 MB docx", () => {
    expect(validateFile({ name: "a.docx", size: 20 * 1024 * 1024 })).toBeNull();
  });
  it("rejects non PDF/DOCX", () => {
    expect(validateFile({ name: "a.txt", size: 10 })).not.toBeNull();
  });
});

describe("mock evidence", () => {
  it.each(["consort-2010", "consort-2025"] as const)("offsets point at the quoted text (%s)", (code) => {
    const texts = new Map(mockDocument.sections.flatMap((s) => s.paragraphs.map((p) => [p.id, p.text] as const)));
    for (const r of buildResults(code)) for (const e of r.evidence) {
      expect(texts.get(e.paragraph_id)?.slice(e.start, e.end)).toBe(e.quote);
    }
  });
  it("user override changes the summary counts", () => {
    const rs = buildResults("consort-2010");
    const failed = rs.find((r) => r.status === "not_found")!;
    const before = summarise(rs).reported;
    failed.user_override = "reported";
    expect(summarise(rs).reported).toBe(before + 1);
  });
});
