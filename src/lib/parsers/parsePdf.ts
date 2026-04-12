// @ts-ignore
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
// @ts-ignore
import pdfWorker from "pdfjs-dist/legacy/build/pdf.worker.min.mjs?url";

import type { ParsedDocument } from "../../types/document";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

type PdfTextItem = {
  str?: string;
};

export async function parsePdfFile(file: File): Promise<ParsedDocument> {
  const arrayBuffer = await file.arrayBuffer();

  const pdf = await pdfjsLib.getDocument({
    data: arrayBuffer,
    useWorkerFetch: false,
    isEvalSupported: false,
    useSystemFonts: true,
  }).promise;

  const pages: string[] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const textContent = await page.getTextContent();

    const rawParts = textContent.items.map((item) => {
      const typedItem = item as PdfTextItem;
      return typedItem.str ?? "";
    });

    const pageText = rawParts.join(" ").replace(/\s+/g, " ").trim();

    if (pageText) {
      pages.push(pageText);
    }
  }

  const finalText = pages.join("\n\n").trim();

  if (!finalText) {
    throw new Error(
      "This PDF has no extractable text (likely scanned or unsupported)."
    );
  }

  return {
    source: "pdf",
    fileName: file.name,
    text: finalText,
  };
}