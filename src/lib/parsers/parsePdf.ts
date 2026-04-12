import * as pdfjsLib from "pdfjs-dist";
import type { ParsedDocument } from "../../types/document";

// Vite needs the worker file URL.
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

type PdfTextItem = {
  str?: string;
};

export async function parsePdfFile(file: File): Promise<ParsedDocument> {
  const arrayBuffer = await file.arrayBuffer();

  const pdf = await pdfjsLib.getDocument({
    data: arrayBuffer,
  }).promise;

  const pages: string[] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const textContent = await page.getTextContent();

    const pageText = textContent.items
      .map((item) => {
        const typedItem = item as PdfTextItem;
        return typedItem.str ?? "";
      })
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();

    if (pageText) {
      pages.push(pageText);
    }
  }

  return {
    source: "pdf",
    fileName: file.name,
    text: pages.join("\n\n"),
  };
}