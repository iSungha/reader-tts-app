import { useState } from "react";
import { parseDocxFile } from "../lib/parsers/parseDocx";
import { parsePdfFile } from "../lib/parsers/parsePdf";
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

      if (extension === "txt") {
        const result = await parseTextFile(file);
        setStatus("idle");
        return result;
      }

      if (extension === "docx") {
        const result = await parseDocxFile(file);
        setStatus("idle");
        return result;
      }

      if (extension === "pdf") {
        const result = await parsePdfFile(file);
        setStatus("idle");
        return result;
      }

      throw new Error("Unsupported file type. Please upload a .txt, .pdf, or .docx file.");
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