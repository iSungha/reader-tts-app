import * as pdfjsLib from "pdfjs-dist";
import type { ParsedDocument } from "../../types/document";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";

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
      "This PDF does not appear to contain selectable text. It may be image-based/scanned, encrypted, or use unsupported font encoding."
    );
  }

  return {
    source: "pdf",
    fileName: file.name,
    text: finalText,
  };
}