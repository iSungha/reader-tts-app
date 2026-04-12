import type { ParsedDocument } from "../../types/document";

export async function parseTextFile(file: File): Promise<ParsedDocument> {
  const text = await file.text();

  return {
    source: "txt",
    fileName: file.name,
    text,
  };
}