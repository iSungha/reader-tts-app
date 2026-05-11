export type InlineTextPart = {
  text: string;
  bold?: boolean;
};

export type RenderUnit = {
  text: string;
  parts: InlineTextPart[];
};

export type Paragraph = {
  id: string;
  text: string;
  sentences: string[];
  renderUnits: RenderUnit[];
};