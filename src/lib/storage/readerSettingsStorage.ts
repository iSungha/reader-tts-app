import type { TextAlignOption } from "../../hooks/useReaderSettings";

export type StoredReaderSettings = {
  fontSize: number;
  lineHeight: number;
  paragraphSpacing: number;
  maxWidth: number;
  textAlign: TextAlignOption;
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
      !isValidTextAlign(parsed.textAlign)
    ) {
      return null;
    }

    return {
      fontSize: parsed.fontSize,
      lineHeight: parsed.lineHeight,
      paragraphSpacing: parsed.paragraphSpacing,
      maxWidth: parsed.maxWidth,
      textAlign: parsed.textAlign,
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
