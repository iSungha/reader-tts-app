import type { ParsedDocument } from "../../types/document";

type PdfTextItem = {
  str?: string;
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

function getTextFromItems(items: unknown[] | ArrayLike<unknown>): string {
  const normalizedItems = Array.isArray(items) ? items : Array.from(items);

  return normalizedItems
    .map((item) => {
      const typedItem = item as PdfTextItem;
      return typedItem.str ?? "";
    })
    .join(" ")
    .replace(/\s+/g, " ")
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
      const pageText = getTextFromItems(textContent.items);

      if (pageText) {
        pages.push(pageText);
      }

      // Helps mobile Safari breathe between pages.
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
    // On iPhone mobile mode, skip worker entirely.
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

    // Desktop / larger environments
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
  } catch (firstError) {
    // Universal fallback
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