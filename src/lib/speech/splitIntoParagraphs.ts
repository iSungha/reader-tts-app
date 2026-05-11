import type { InlineTextPart, Paragraph, RenderUnit } from "../../types/reader";

type RawParagraph = {
  text: string;
  parts: InlineTextPart[];
};

export function splitIntoParagraphs(raw: string): Paragraph[] {
  const source = raw ?? "";

  const rawParagraphs = containsHtml(source)
    ? extractParagraphsFromHtml(source)
    : extractParagraphsFromPlainText(source);

  return rawParagraphs
    .filter((paragraph) => paragraph.text.trim().length > 0)
    .map((paragraph, index) => {
      const renderUnits = buildRenderUnits(paragraph.parts, paragraph.text);

      return {
        id: `p-${index}`,
        text: paragraph.text,
        sentences: renderUnits.map((unit) => unit.text),
        renderUnits,
      };
    });
}

function containsHtml(value: string): boolean {
  return /<\/?[a-z][\s\S]*>/i.test(value);
}

function extractParagraphsFromPlainText(raw: string): RawParagraph[] {
  return raw
    .split(/\n\s*\n+/)
    .map((paragraphText) => paragraphText.trim())
    .filter(Boolean)
    .map((paragraphText) => ({
      text: paragraphText,
      parts: [{ text: paragraphText }],
    }));
}

function extractParagraphsFromHtml(raw: string): RawParagraph[] {
  if (typeof window === "undefined") {
    return extractParagraphsFromPlainText(stripHtml(raw));
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(raw, "text/html");
  const body = doc.body;

  const paragraphs: RawParagraph[] = [];
  let looseTextBuffer: InlineTextPart[] = [];

  const flushLooseBuffer = () => {
    const normalized = normalizeParts(looseTextBuffer);
    const text = partsToText(normalized).trim();

    if (text) {
      paragraphs.push({
        text,
        parts: normalized,
      });
    }

    looseTextBuffer = [];
  };

  for (const node of Array.from(body.childNodes)) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent?.trim();
      if (text) {
        looseTextBuffer.push({ text });
      }
      continue;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
      continue;
    }

    const element = node as HTMLElement;
    const tag = element.tagName.toLowerCase();

    if (tag === "p" || tag === "div" || tag === "blockquote" || tag === "h1" || tag === "h2" || tag === "h3") {
      flushLooseBuffer();

      const parts = normalizeParts(extractInlineParts(element));
      const text = partsToText(parts).trim();

      if (text) {
        paragraphs.push({
          text,
          parts,
        });
      }

      continue;
    }

    if (tag === "br") {
      flushLooseBuffer();
      continue;
    }

    const parts = normalizeParts(extractInlineParts(element));
    const text = partsToText(parts).trim();

    if (text) {
      looseTextBuffer.push(...parts);
    }
  }

  flushLooseBuffer();

  if (paragraphs.length === 0) {
    return extractParagraphsFromPlainText(stripHtml(raw));
  }

  return paragraphs;
}

function extractInlineParts(node: Node, inheritedBold = false): InlineTextPart[] {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = normalizeWhitespace(node.textContent ?? "");

    if (!text) {
      return [];
    }

    return [
      {
        text,
        bold: inheritedBold || undefined,
      },
    ];
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return [];
  }

  const element = node as HTMLElement;
  const tag = element.tagName.toLowerCase();

  if (tag === "br") {
    return [{ text: "\n" }];
  }

  const nextBold = inheritedBold || tag === "strong" || tag === "b";

  const parts: InlineTextPart[] = [];

  for (const child of Array.from(element.childNodes)) {
    parts.push(...extractInlineParts(child, nextBold));
  }

  return parts;
}

function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, " ");
}

function normalizeParts(parts: InlineTextPart[]): InlineTextPart[] {
  const cleaned = parts
    .map((part) => ({
      text: part.text,
      bold: part.bold,
    }))
    .filter((part) => part.text.length > 0);

  const merged: InlineTextPart[] = [];

  for (const part of cleaned) {
    const previous = merged[merged.length - 1];

    if (previous && !!previous.bold === !!part.bold) {
      previous.text += part.text;
    } else {
      merged.push({ ...part });
    }
  }

  return merged;
}

function partsToText(parts: InlineTextPart[]): string {
  return parts.map((part) => part.text).join("");
}

function buildRenderUnits(parts: InlineTextPart[], text: string): RenderUnit[] {
  if (!text.trim()) {
    return [];
  }

  if (text.includes("\n")) {
    return buildLineUnits(parts, text);
  }

  return buildSentenceUnits(parts, text);
}

function buildLineUnits(parts: InlineTextPart[], text: string): RenderUnit[] {
  const units: RenderUnit[] = [];
  let cursor = 0;

  const lines = text.split("\n");

  for (const rawLine of lines) {
    const lineLength = rawLine.length;
    const start = cursor;
    const end = cursor + lineLength;
    cursor = end + 1;

    const trimmedRange = trimRange(text, start, end);

    if (!trimmedRange) {
      continue;
    }

    units.push({
      text: text.slice(trimmedRange.start, trimmedRange.end),
      parts: sliceParts(parts, trimmedRange.start, trimmedRange.end),
    });
  }

  return units;
}

function buildSentenceUnits(parts: InlineTextPart[], text: string): RenderUnit[] {
  const regex = /[^.!?]+[.!?]+|[^.!?]+$/g;
  const units: RenderUnit[] = [];

  for (const match of text.matchAll(regex)) {
    const matchText = match[0];
    const matchIndex = match.index ?? 0;
    const start = matchIndex;
    const end = start + matchText.length;

    const trimmedRange = trimRange(text, start, end);

    if (!trimmedRange) {
      continue;
    }

    units.push({
      text: text.slice(trimmedRange.start, trimmedRange.end),
      parts: sliceParts(parts, trimmedRange.start, trimmedRange.end),
    });
  }

  if (units.length === 0) {
    return [
      {
        text,
        parts,
      },
    ];
  }

  return units;
}

function trimRange(
  source: string,
  start: number,
  end: number
): { start: number; end: number } | null {
  let nextStart = start;
  let nextEnd = end;

  while (nextStart < nextEnd && /\s/.test(source[nextStart])) {
    nextStart += 1;
  }

  while (nextEnd > nextStart && /\s/.test(source[nextEnd - 1])) {
    nextEnd -= 1;
  }

  if (nextStart >= nextEnd) {
    return null;
  }

  return { start: nextStart, end: nextEnd };
}

function sliceParts(
  parts: InlineTextPart[],
  start: number,
  end: number
): InlineTextPart[] {
  const sliced: InlineTextPart[] = [];
  let cursor = 0;

  for (const part of parts) {
    const partStart = cursor;
    const partEnd = cursor + part.text.length;
    cursor = partEnd;

    if (partEnd <= start || partStart >= end) {
      continue;
    }

    const localStart = Math.max(start, partStart) - partStart;
    const localEnd = Math.min(end, partEnd) - partStart;
    const text = part.text.slice(localStart, localEnd);

    if (!text) {
      continue;
    }

    sliced.push({
      text,
      bold: part.bold,
    });
  }

  return normalizeParts(sliced);
}

function stripHtml(value: string): string {
  return value.replace(/<[^>]+>/g, " ");
}