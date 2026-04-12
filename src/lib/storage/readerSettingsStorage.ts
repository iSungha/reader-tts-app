import type {
  HighlightColorOption,
  ReaderThemeOption,
  TextAlignOption,
  ThemeBackgroundOption,
} from "../../hooks/useReaderSettings";

export type StoredReaderSettings = {
  fontSize: number;
  lineHeight: number;
  paragraphSpacing: number;
  maxWidth: number;
  textAlign: TextAlignOption;
  theme: ReaderThemeOption;
  backgroundTone: ThemeBackgroundOption;
  highlightColor: HighlightColorOption;
};

const READER_SETTINGS_KEY = "reader-tts-settings";

export function loadReaderSettings(): StoredReaderSettings | null {
  try {
    const raw = localStorage.getItem(READER_SETTINGS_KEY);

    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<StoredReaderSettings>;

    if (
      typeof parsed.fontSize !== "number" ||
      typeof parsed.lineHeight !== "number" ||
      typeof parsed.paragraphSpacing !== "number" ||
      typeof parsed.maxWidth !== "number" ||
      !isValidTextAlign(parsed.textAlign) ||
      !isValidTheme(parsed.theme) ||
      !isValidBackgroundTone(parsed.backgroundTone) ||
      !isValidHighlightColor(parsed.highlightColor)
    ) {
      return null;
    }

    return {
      fontSize: parsed.fontSize,
      lineHeight: parsed.lineHeight,
      paragraphSpacing: parsed.paragraphSpacing,
      maxWidth: parsed.maxWidth,
      textAlign: parsed.textAlign,
      theme: parsed.theme,
      backgroundTone: parsed.backgroundTone,
      highlightColor: parsed.highlightColor,
    };
  } catch {
    return null;
  }
}

export function saveReaderSettings(settings: StoredReaderSettings): void {
  try {
    localStorage.setItem(READER_SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Ignore storage failures.
  }
}

function isValidTextAlign(value: unknown): value is TextAlignOption {
  return (
    value === "left" ||
    value === "center" ||
    value === "right" ||
    value === "justify"
  );
}

function isValidTheme(value: unknown): value is ReaderThemeOption {
  return value === "light" || value === "dark";
}

function isValidBackgroundTone(value: unknown): value is ThemeBackgroundOption {
  return (
    value === "black" ||
    value === "gray" ||
    value === "darkblue" ||
    value === "darkgreen" ||
    value === "darkbrown" ||
    value === "darkpurple"
  );
}

function isValidHighlightColor(value: unknown): value is HighlightColorOption {
  return (
    value === "green" ||
    value === "blue" ||
    value === "purple" ||
    value === "orange" ||
    value === "pink" ||
    value === "gray"
  );
}