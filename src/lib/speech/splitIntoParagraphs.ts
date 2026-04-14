import type { Paragraph } from "../../types/reader";

export function splitIntoParagraphs(raw: string): Paragraph[] {
  const parts = raw
    .split(/\n\s*\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  return parts.map((text, index) => ({
    id: `p-${index}`,
    text,
    sentences: splitIntoReadableUnits(text),
  }));
}

function splitIntoReadableUnits(text: string): string[] {
  if (text.includes("\n")) {
    return text
      .split("\n")
      .map((line) => line.replace(/\s+$/g, ""))
      .filter((line) => line.trim().length > 0);
  }

  return (
    text.match(/[^.!?]+[.!?]+|[^.!?]+$/g)?.map((s) => s.trim()) || [text]
  );
}