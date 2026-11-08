import type { Paragraph } from "../types/reader";

/** Progress counts readable characters, not the number of paragraphs. */
export function paragraphOffsets(paragraphs: Paragraph[]): number[] {
  const offsets = new Array<number>(paragraphs.length + 1);
  offsets[0] = 0;
  for (let index = 0; index < paragraphs.length; index += 1) {
    offsets[index + 1] = offsets[index] + paragraphs[index].text.length;
  }
  return offsets;
}

export function textPosition(paragraphs: Paragraph[], offsets: number[], paragraphIndex: number, sentenceIndex = 0): number {
  if (!paragraphs.length) return 0;
  const index = Math.max(0, Math.min(paragraphIndex, paragraphs.length - 1));
  const paragraph = paragraphs[index];
  let cursor = 0;
  for (let sentence = 0; sentence < Math.min(sentenceIndex, paragraph.sentences.length); sentence += 1) {
    const found = paragraph.text.indexOf(paragraph.sentences[sentence], cursor);
    cursor = found < 0 ? cursor + paragraph.sentences[sentence].length : found + paragraph.sentences[sentence].length;
  }
  return Math.min(offsets[offsets.length - 1], offsets[index] + cursor);
}

export function percentOfText(coveredChars: number, textLength: number): number {
  if (textLength <= 0) return 0;
  return Math.min(100, Math.max(0, Math.floor(100 * coveredChars / textLength)));
}
