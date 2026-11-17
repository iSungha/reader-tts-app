const PDF_CHUNK_TARGET = 220;
const sentenceEnd = /[.!?…。！？][)\]}]*$/u;
const wordCharacter = /[\p{L}\p{N}]/u;

function removeSpokenQuotationMarks(text: string): string {
  return text.replace(/["“”„‟«»‹›「」『』〝〞〟＂‘’']/gu, (mark, index: number, source: string) => {
    if (mark === "’" || mark === "'") {
      // A quote between letters or digits is usually an apostrophe.
      return wordCharacter.test(source[index - 1] ?? "") && wordCharacter.test(source[index + 1] ?? "") ? mark : "";
    }
    return "";
  }).trim();
}

export function nextSpeechChunk(units: readonly string[], from: number, joinPdfLines: boolean) {
  let text = "";
  let start = from;
  let end = from;

  for (let index = from; index < units.length; index += 1) {
    const line = removeSpokenQuotationMarks(units[index]);
    if (!line) continue;
    if (text && text.length + 1 + line.length > PDF_CHUNK_TARGET) break;

    if (!text) start = index;
    text = text ? text + " " + line : line;
    end = index;

    if (!joinPdfLines || sentenceEnd.test(line)) break;
  }

  return text ? { text, start, end } : null;
}
