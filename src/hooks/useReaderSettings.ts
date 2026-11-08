import { useEffect, useState } from "react";
import {
  loadReaderSettings,
  saveReaderSettings,
} from "../lib/storage/readerSettingsStorage";

export type TextAlignOption = "left" | "center" | "right" | "justify";

export function useReaderSettings() {
  const storedSettings = loadReaderSettings();

  const [fontSize, setFontSize] = useState(storedSettings?.fontSize ?? 18);
  const [lineHeight, setLineHeight] = useState(storedSettings?.lineHeight ?? 1.7);
  const [paragraphSpacing, setParagraphSpacing] = useState(
    storedSettings?.paragraphSpacing ?? 16
  );
  const [maxWidth, setMaxWidth] = useState(storedSettings?.maxWidth ?? 800);
  const [textAlign, setTextAlign] = useState<TextAlignOption>(
    storedSettings?.textAlign ?? "left"
  );
  useEffect(() => {
    saveReaderSettings({
      fontSize,
      lineHeight,
      paragraphSpacing,
      maxWidth,
      textAlign,
    });
  }, [
    fontSize,
    lineHeight,
    paragraphSpacing,
    maxWidth,
    textAlign,
  ]);

  return {
    fontSize,
    setFontSize,
    lineHeight,
    setLineHeight,
    paragraphSpacing,
    setParagraphSpacing,
    maxWidth,
    setMaxWidth,
    textAlign,
    setTextAlign,
  };
}
