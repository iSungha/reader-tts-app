import type { Paragraph } from "../../types/reader";

export function splitIntoParagraphs(raw: string): Paragraph[] {
  const parts = raw
    .split(/\n\s*\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  return parts.map((text, index) => ({
    id: `p-${index}`,
    text,
    sentences: splitIntoSentences(text),
  }));
}

function splitIntoSentences(text: string): string[] {
  return (
    text.match(/[^.!?]+[.!?]+|[^.!?]+$/g)?.map((s) => s.trim()) || [text]
  );
}