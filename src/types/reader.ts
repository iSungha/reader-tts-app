export type Paragraph = {
  id: string;
  text: string;
  sentences: string[];
};

export type ReaderState = {
  paragraphs: Paragraph[];
  currentParagraphIndex: number | null;
  currentSentenceIndex: number | null;
};