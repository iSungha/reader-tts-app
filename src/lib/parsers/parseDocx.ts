import mammoth from "mammoth";
import type { ParsedDocument } from "../../types/document";

export async function parseDocxFile(file: File): Promise<ParsedDocument> {
  const arrayBuffer = await file.arrayBuffer();

  const result = await mammoth.extractRawText({
    arrayBuffer,
  });

  return {
    source: "docx",
    fileName: file.name,
    text: result.value,
  };
}