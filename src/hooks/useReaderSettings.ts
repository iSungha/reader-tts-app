import { useEffect, useState } from "react";
import {
  loadReaderSettings,
  saveReaderSettings,
} from "../lib/storage/readerSettingsStorage";

export type TextAlignOption = "left" | "center" | "right" | "justify";
export type ReaderThemeOption = "light" | "dark";
export type ThemeBackgroundOption =
  | "black"
  | "gray"
  | "darkblue"
  | "darkgreen"
  | "darkbrown"
  | "darkpurple";
export type HighlightColorOption =
  | "green"
  | "blue"
  | "purple"
  | "orange"
  | "pink"
  | "gray";

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
  const [theme, setTheme] = useState<ReaderThemeOption>(
    storedSettings?.theme ?? "light"
  );
  const [backgroundTone, setBackgroundTone] = useState<ThemeBackgroundOption>(
    storedSettings?.backgroundTone ?? "black"
  );
  const [highlightColor, setHighlightColor] = useState<HighlightColorOption>(
    storedSettings?.highlightColor ?? "green"
  );

  useEffect(() => {
    saveReaderSettings({
      fontSize,
      lineHeight,
      paragraphSpacing,
      maxWidth,
      textAlign,
      theme,
      backgroundTone,
      highlightColor,
    });
  }, [
    fontSize,
    lineHeight,
    paragraphSpacing,
    maxWidth,
    textAlign,
    theme,
    backgroundTone,
    highlightColor,
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
    theme,
    setTheme,
    backgroundTone,
    setBackgroundTone,
    highlightColor,
    setHighlightColor,
  };
}