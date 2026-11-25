export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;

export function validateFile(f: { name: string; size: number }): string | null {
  if (!/\.(pdf|docx)$/i.test(f.name)) return "Please upload a PDF or Word (.docx) file.";
  if (f.size > MAX_UPLOAD_BYTES) return "That file is larger than 20 MB.";
  return null;
}
