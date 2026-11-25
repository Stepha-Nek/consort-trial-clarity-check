export type ChecklistCode = "consort-2010" | "consort-2025";

export interface ChecklistSummary {
  code: ChecklistCode;
  name: string;
  published_year: number;
}

export interface ChecklistItem {
  id: string;
  number: string;
  text: string;
  guidance: string;
  allows_na: boolean;
}

export interface ChecklistSection {
  code: string;
  title: string;
  items: ChecklistItem[];
}

export interface Checklist {
  code: ChecklistCode;
  name: string;
  sections: ChecklistSection[];
}

export interface CreateCheckRequest {
  checklist_code: ChecklistCode;
  file?: File;
  text?: string;
}

export interface CreateCheckResponse {
  check_id: string;
}

export type CheckStatus = "queued" | "parsing" | "checking" | "done" | "error";
export type ItemStatus = "reported" | "possible" | "not_found" | "na";

export interface Evidence {
  paragraph_id: string;
  start: number;
  end: number;
  quote: string;
}

export interface ItemResult {
  item_id: string;
  number: string;
  section_code: string;
  status: ItemStatus;
  evidence: Evidence[];
  rationale: string;
  suggestion: string | null;
  confidence: number;
  user_override: "na" | "reported" | null;
  user_location: string | null;
}

export interface CheckSummary {
  reported: number;
  possible: number;
  not_found: number;
  na: number;
  total: number;
}

export interface Check {
  check_id: string;
  checklist_code: ChecklistCode;
  filename: string;
  status: CheckStatus;
  error: string | null;
  created_at: string;
  delete_after: string;
  summary: CheckSummary | null;
  results: ItemResult[];
}

export type DocumentSectionKind =
  | "title"
  | "abstract"
  | "introduction"
  | "methods"
  | "results"
  | "discussion"
  | "declarations"
  | "other";

export interface Paragraph {
  id: string;
  text: string;
  page: number | null;
  start: number;
  end: number;
  subheading: string | null;
}

export interface DocumentSection {
  id: string;
  kind: DocumentSectionKind;
  heading: string;
  paragraphs: Paragraph[];
}

export interface CheckDocument {
  title: string;
  sections: DocumentSection[];
}

export interface PatchItemRequest {
  user_override: "na" | "reported" | null;
  user_location: string | null;
}

export type ExportFormat = "docx" | "pdf";

export interface ConsortApi {
  listChecklists(): Promise<ChecklistSummary[]>;
  getChecklist(code: ChecklistCode): Promise<Checklist>;
  createCheck(req: CreateCheckRequest): Promise<CreateCheckResponse>;
  getCheck(id: string): Promise<Check>;
  getDocument(id: string): Promise<CheckDocument>;
  patchItem(id: string, itemId: string, body: PatchItemRequest): Promise<ItemResult>;
  exportCheck(id: string, format: ExportFormat): Promise<{ blob: Blob; filename: string }>;
  deleteCheck(id: string): Promise<void>;
}
