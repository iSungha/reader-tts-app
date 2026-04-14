import type { ParsedDocument } from "../../types/document";

type PdfTextItem = {
  str?: string;
  transform?: number[];
  width?: number;
  height?: number;
};

type PdfPage = {
  getTextContent: () => Promise<{
    items: unknown[] | ArrayLike<unknown>;
  }>;
};

type PdfDocument = {
  numPages: number;
  getPage: (pageNumber: number) => Promise<PdfPage>;
};

type PdfLoadingTask = {
  promise: Promise<PdfDocument>;
  destroy?: () => Promise<void> | void;
};

type PdfJsLike = {
  getDocument: (options: Record<string, unknown>) => PdfLoadingTask;
  GlobalWorkerOptions: {
    workerSrc: string;
  };
};

declare global {
  interface Window {
    pdfjsLib?: PdfJsLike;
  }
}

type PositionedTextItem = {
  text: string;
  x: number;
  y: number;
  height: number;
};

type TextLine = {
  y: number;
  avgHeight: number;
  parts: PositionedTextItem[];
};

let pdfJsLoadPromise: Promise<PdfJsLike> | null = null;

function getPdfJsUrl(): string {
  return "/pdfjs/pdf.js";
}

function getPdfWorkerUrl(): string {
  return "/pdfjs/pdf.worker.js";
}

function isIPhoneMobileMode(): boolean {
  if (typeof navigator === "undefined" || typeof window === "undefined") {
    return false;
  }

  const ua = navigator.userAgent || "";

  const isIPhone =
    /iPhone/.test(ua) ||
    (/MacIntel/.test(navigator.platform) && navigator.maxTouchPoints > 1);

  const isTouchDevice = window.matchMedia("(pointer: coarse)").matches;
  const isNarrowViewport = window.innerWidth <= 900;

  return isIPhone && isTouchDevice && isNarrowViewport;
}

function loadPdfJs(): Promise<PdfJsLike> {
  if (window.pdfjsLib) {
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = getPdfWorkerUrl();
    return Promise.resolve(window.pdfjsLib);
  }

  if (pdfJsLoadPromise) {
    return pdfJsLoadPromise;
  }

  pdfJsLoadPromise = new Promise<PdfJsLike>((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[data-pdfjs-loader="true"]'
    );

    if (existingScript) {
      existingScript.addEventListener("load", () => {
        if (!window.pdfjsLib) {
          reject(new Error("pdf.js loaded, but window.pdfjsLib is missing."));
          return;
        }

        window.pdfjsLib.GlobalWorkerOptions.workerSrc = getPdfWorkerUrl();
        resolve(window.pdfjsLib);
      });

      existingScript.addEventListener("error", () => {
        reject(new Error("Failed to load pdf.js script."));
      });

      return;
    }

    const script = document.createElement("script");
    script.src = getPdfJsUrl();
    script.async = true;
    script.defer = true;
    script.setAttribute("data-pdfjs-loader", "true");

    script.onload = () => {
      if (!window.pdfjsLib) {
        reject(new Error("pdf.js loaded, but window.pdfjsLib is missing."));
        return;
      }

      window.pdfjsLib.GlobalWorkerOptions.workerSrc = getPdfWorkerUrl();
      resolve(window.pdfjsLib);
    };

    script.onerror = () => {
      reject(new Error("Failed to load pdf.js script."));
    };

    document.head.appendChild(script);
  });

  return pdfJsLoadPromise;
}

function normalizeItems(items: unknown[] | ArrayLike<unknown>): PositionedTextItem[] {
  const normalizedItems = Array.isArray(items) ? items : Array.from(items);

  return normalizedItems
    .map((item) => {
      const typedItem = item as PdfTextItem;
      const text = (typedItem.str ?? "").trim();

      if (!text) {
        return null;
      }

      const transform = typedItem.transform ?? [];
      const x = typeof transform[4] === "number" ? transform[4] : 0;
      const y = typeof transform[5] === "number" ? transform[5] : 0;
      const height =
        typeof typedItem.height === "number" && typedItem.height > 0
          ? typedItem.height
          : typeof transform[0] === "number"
          ? Math.abs(transform[0])
          : 12;

      return {
        text,
        x,
        y,
        height,
      };
    })
    .filter((item): item is PositionedTextItem => item !== null);
}

function groupItemsIntoLines(items: PositionedTextItem[]): TextLine[] {
  const sorted = [...items].sort((a, b) => {
    if (Math.abs(b.y - a.y) > 1) {
      return b.y - a.y;
    }

    return a.x - b.x;
  });

  const lines: TextLine[] = [];
  const yTolerance = 3;

  for (const item of sorted) {
    const existingLine = lines.find((line) => Math.abs(line.y - item.y) <= yTolerance);

    if (existingLine) {
      existingLine.parts.push(item);

      const totalHeight =
        existingLine.parts.reduce((sum, part) => sum + part.height, 0) /
        existingLine.parts.length;

      existingLine.avgHeight = totalHeight;
      existingLine.y = existingLine.parts.reduce((sum, part) => sum + part.y, 0) / existingLine.parts.length;
    } else {
      lines.push({
        y: item.y,
        avgHeight: item.height,
        parts: [item],
      });
    }
  }

  return lines
    .map((line) => ({
      ...line,
      parts: [...line.parts].sort((a, b) => a.x - b.x),
    }))
    .sort((a, b) => b.y - a.y);
}

function joinLineParts(parts: PositionedTextItem[]): string {
  if (parts.length === 0) {
    return "";
  }

  let result = parts[0].text;
  let previous = parts[0];

  for (let i = 1; i < parts.length; i += 1) {
    const current = parts[i];
    const estimatedPreviousWidth = previous.text.length * Math.max(previous.height * 0.45, 4);
    const previousRightEdge = previous.x + estimatedPreviousWidth;
    const gap = current.x - previousRightEdge;

    const shouldAddSpace =
      gap > Math.max(previous.height * 0.15, 2) &&
      !result.endsWith("-") &&
      !current.text.startsWith(",") &&
      !current.text.startsWith(".") &&
      !current.text.startsWith(";") &&
      !current.text.startsWith(":") &&
      !current.text.startsWith("!") &&
      !current.text.startsWith("?");

    result += shouldAddSpace ? ` ${current.text}` : current.text;
    previous = current;
  }

  return result.replace(/\s+/g, " ").trim();
}

function buildStructuredPageText(items: unknown[] | ArrayLike<unknown>): string {
  const positionedItems = normalizeItems(items);

  if (positionedItems.length === 0) {
    return "";
  }

  const lines = groupItemsIntoLines(positionedItems);

  if (lines.length === 0) {
    return "";
  }

  const lineTexts = lines.map((line) => ({
    text: joinLineParts(line.parts),
    y: line.y,
    avgHeight: line.avgHeight,
  }));

  const gaps: number[] = [];

  for (let i = 1; i < lineTexts.length; i += 1) {
    gaps.push(Math.abs(lineTexts[i - 1].y - lineTexts[i].y));
  }

  const averageGap =
    gaps.length > 0 ? gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length : 0;

  const output: string[] = [];

  for (let i = 0; i < lineTexts.length; i += 1) {
    const currentLine = lineTexts[i];
    output.push(currentLine.text);

    const nextLine = lineTexts[i + 1];

    if (!nextLine) {
      continue;
    }

    const verticalGap = Math.abs(currentLine.y - nextLine.y);
    const paragraphBreakThreshold = Math.max(
      currentLine.avgHeight * 1.25,
      averageGap * 1.35
    );

    if (verticalGap > paragraphBreakThreshold) {
      output.push("");
    }
  }

  return output
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function extractText(
  pdfjsLib: PdfJsLike,
  data: Uint8Array,
  options: Record<string, unknown>
): Promise<string> {
  const loadingTask = pdfjsLib.getDocument({
    data,
    useWorkerFetch: false,
    isEvalSupported: false,
    stopAtErrors: false,
    ...options,
  });

  try {
    const pdf = await loadingTask.promise;
    const pages: string[] = [];

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const textContent = await page.getTextContent();
      const pageText = buildStructuredPageText(textContent.items);

      if (pageText) {
        pages.push(pageText);
      }

      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    const finalText = pages.join("\n\n").trim();

    if (!finalText) {
      throw new Error(
        "This PDF has no extractable text. It may be scanned/image-based or use unsupported encoding."
      );
    }

    return finalText;
  } finally {
    try {
      await loadingTask.destroy?.();
    } catch {
      // Ignore cleanup failure.
    }
  }
}

export async function parsePdfFile(file: File): Promise<ParsedDocument> {
  const pdfjsLib = await loadPdfJs();
  const arrayBuffer = await file.arrayBuffer();
  const data = new Uint8Array(arrayBuffer);

  const isIPhoneMobile = isIPhoneMobileMode();

  try {
    if (isIPhoneMobile) {
      const text = await extractText(pdfjsLib, data, {
        disableWorker: true,
        useSystemFonts: false,
        disableFontFace: true,
        isOffscreenCanvasSupported: false,
        cMapPacked: false,
      });

      return {
        source: "pdf",
        fileName: file.name,
        text,
      };
    }

    const text = await extractText(pdfjsLib, data, {
      disableWorker: false,
      useSystemFonts: true,
      disableFontFace: false,
      isOffscreenCanvasSupported: false,
    });

    return {
      source: "pdf",
      fileName: file.name,
      text,
    };
  } catch {
    const text = await extractText(pdfjsLib, data, {
      disableWorker: true,
      useSystemFonts: false,
      disableFontFace: true,
      isOffscreenCanvasSupported: false,
      cMapPacked: false,
    });

    return {
      source: "pdf",
      fileName: file.name,
      text,
    };
  }
}