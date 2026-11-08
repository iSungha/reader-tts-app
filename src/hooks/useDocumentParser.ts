import { useState } from "react";
import { parseTextFile } from "../lib/parsers/parseText";
import type { ParsedDocument } from "../types/document";

type ParserStatus = "idle" | "loading" | "error";

export function useDocumentParser() {
  const [status, setStatus] = useState<ParserStatus>("idle");
  const [error, setError] = useState("");

  const parseFile = async (file: File): Promise<ParsedDocument | null> => {
    try {
      setStatus("loading");
      setError("");

      const extension = file.name.split(".").pop()?.toLowerCase();

      let result: ParsedDocument | null = null;

      if (extension === "txt") {
        result = await parseTextFile(file);
      } else if (extension === "docx") {
        const { parseDocxFile } = await import("../lib/parsers/parseDocx");
        result = await parseDocxFile(file);
      } else if (extension === "pdf") {
        const { parsePdfFile } = await import("../lib/parsers/parsePdf");
        result = await parsePdfFile(file);
      } else {
        throw new Error(
          "Unsupported file type. Please upload a .txt, .pdf, or .docx file."
        );
      }

      if (!result.text.trim()) {
        throw new Error(
          "The uploaded file was parsed, but no readable text was found."
        );
      }

      setStatus("idle");
      return result;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to parse file.";

      setStatus("error");
      setError(message);
      return null;
    }
  };

  return {
    status,
    error,
    parseFile,
  };
}
