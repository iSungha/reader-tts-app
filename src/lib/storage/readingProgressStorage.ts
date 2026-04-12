export type ReadingProgress = {
  documentKey: string;
  paragraphIndex: number;
};

const READING_PROGRESS_KEY = "reader-tts-reading-progress";

type ProgressMap = Record<string, number>;

export function saveReadingProgress(
  documentKey: string,
  paragraphIndex: number
): void {
  try {
    const existing = loadAllReadingProgress();
    existing[documentKey] = paragraphIndex;
    localStorage.setItem(READING_PROGRESS_KEY, JSON.stringify(existing));
  } catch {
    // Ignore storage errors.
  }
}

export function loadReadingProgress(documentKey: string): number | null {
  try {
    const existing = loadAllReadingProgress();
    const value = existing[documentKey];

    return typeof value === "number" ? value : null;
  } catch {
    return null;
  }
}

export function clearReadingProgress(documentKey: string): void {
  try {
    const existing = loadAllReadingProgress();
    delete existing[documentKey];
    localStorage.setItem(READING_PROGRESS_KEY, JSON.stringify(existing));
  } catch {
    // Ignore storage errors.
  }
}

function loadAllReadingProgress(): ProgressMap {
  const raw = localStorage.getItem(READING_PROGRESS_KEY);

  if (!raw) {
    return {};
  }

  const parsed = JSON.parse(raw) as Record<string, unknown>;
  const result: ProgressMap = {};

  for (const [key, value] of Object.entries(parsed)) {
    if (typeof value === "number") {
      result[key] = value;
    }
  }

  return result;
}