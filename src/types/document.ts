export type DocumentSource = "paste" | "txt" | "pdf" | "docx";

export type ParsedDocument = {
  source: DocumentSource;
  fileName: string;
  text: string;
};