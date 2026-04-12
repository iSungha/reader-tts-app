import { useEffect, useRef } from "react";
import ReaderParagraph from "./ReaderParagraph";
import type { Paragraph } from "../../types/reader";
import type {
  HighlightColorOption,
  ReaderThemeOption,
  TextAlignOption,
  ThemeBackgroundOption,
} from "../../hooks/useReaderSettings";

type Props = {
  paragraphs: Paragraph[];
  currentParagraphIndex: number | null;
  currentSentenceIndex: number | null;
  fontSize: number;
  lineHeight: number;
  paragraphSpacing: number;
  maxWidth: number;
  textAlign: TextAlignOption;
  theme: ReaderThemeOption;
  backgroundTone: ThemeBackgroundOption;
  highlightColor: HighlightColorOption;
  onParagraphSelect?: (index: number) => void;
};

function getReaderSurfaceStyles(
  theme: ReaderThemeOption,
  backgroundTone: ThemeBackgroundOption
) {
  if (theme === "light") {
    return {
      readerBackground: "#ffffff",
      textColor: "#111111",
      borderColor: "#dddddd",
    };
  }

  switch (backgroundTone) {
    case "gray":
      return {
        readerBackground: "#2a2a2a",
        textColor: "#f5f5f5",
        borderColor: "#3a3a3a",
      };
    case "darkblue":
      return {
        readerBackground: "#172554",
        textColor: "#e5edff",
        borderColor: "#243b74",
      };
    case "darkgreen":
      return {
        readerBackground: "#0f2a1f",
        textColor: "#e9fff4",
        borderColor: "#1d4533",
      };
    case "darkbrown":
      return {
        readerBackground: "#2c2119",
        textColor: "#fff5eb",
        borderColor: "#4a3628",
      };
    case "darkpurple":
      return {
        readerBackground: "#2a183b",
        textColor: "#f5ebff",
        borderColor: "#493060",
      };
    case "black":
    default:
      return {
        readerBackground: "#0a0a0a",
        textColor: "#f5f5f5",
        borderColor: "#222222",
      };
  }
}

function getHighlightStyles(color: HighlightColorOption) {
  switch (color) {
    case "blue":
      return {
        paragraphBorderColor: "#60a5fa",
        sentenceHighlightColor: "#93c5fd",
      };
    case "purple":
      return {
        paragraphBorderColor: "#a78bfa",
        sentenceHighlightColor: "#c4b5fd",
      };
    case "orange":
      return {
        paragraphBorderColor: "#fb923c",
        sentenceHighlightColor: "#fdba74",
      };
    case "pink":
      return {
        paragraphBorderColor: "#f472b6",
        sentenceHighlightColor: "#f9a8d4",
      };
    case "gray":
      return {
        paragraphBorderColor: "#94a3b8",
        sentenceHighlightColor: "#cbd5e1",
      };
    case "green":
    default:
      return {
        paragraphBorderColor: "#4ade80",
        sentenceHighlightColor: "#86efac",
      };
  }
}

export default function ReaderView({
  paragraphs,
  currentParagraphIndex,
  currentSentenceIndex,
  fontSize,
  lineHeight,
  paragraphSpacing,
  maxWidth,
  textAlign,
  theme,
  backgroundTone,
  highlightColor,
  onParagraphSelect,
}: Props) {
  const paragraphRefs = useRef<(HTMLParagraphElement | null)[]>([]);
  const sentenceRefs = useRef<Record<string, HTMLSpanElement | null>>({});

  const surfaceStyles = getReaderSurfaceStyles(theme, backgroundTone);
  const highlightStyles = getHighlightStyles(highlightColor);

  useEffect(() => {
    if (currentParagraphIndex === null) {
      return;
    }

    const hasActiveSentence = currentSentenceIndex !== null;
    const sentenceKey = hasActiveSentence
      ? `${currentParagraphIndex}-${currentSentenceIndex}`
      : null;

    const activeSentence = sentenceKey
      ? sentenceRefs.current[sentenceKey]
      : null;

    if (activeSentence) {
      const rect = activeSentence.getBoundingClientRect();
      const absoluteTop = window.scrollY + rect.top;

      const targetTop = Math.max(
        0,
        absoluteTop - window.innerHeight * 0.3
      );

      window.scrollTo({
        top: targetTop,
        behavior: "smooth",
      });

      return;
    }

    const activeParagraph = paragraphRefs.current[currentParagraphIndex];

    if (activeParagraph) {
      const rect = activeParagraph.getBoundingClientRect();
      const absoluteTop = window.scrollY + rect.top;

      const targetTop = Math.max(
        0,
        absoluteTop - window.innerHeight * 0.3
      );

      window.scrollTo({
        top: targetTop,
        behavior: "smooth",
      });
    }
  }, [currentParagraphIndex, currentSentenceIndex]);

  return (
    <div
      style={{
        maxWidth: `${maxWidth}px`,
        margin: "0 auto",
        fontSize: `${fontSize}px`,
        lineHeight,
        textAlign,
        backgroundColor: surfaceStyles.readerBackground,
        color: surfaceStyles.textColor,
        border: `1px solid ${surfaceStyles.borderColor}`,
        borderRadius: "12px",
        padding: "20px",
        minHeight: "300px",
      }}
    >
      {paragraphs.map((paragraph, paragraphIndex) => (
        <div
          key={paragraph.id}
          style={{ marginBottom: `${paragraphSpacing}px` }}
        >
          <ReaderParagraph
            ref={(element) => {
              paragraphRefs.current[paragraphIndex] = element;
            }}
            paragraph={paragraph}
            isActive={currentParagraphIndex === paragraphIndex}
            activeSentenceIndex={
              currentParagraphIndex === paragraphIndex
                ? currentSentenceIndex
                : null
            }
            paragraphBorderColor={highlightStyles.paragraphBorderColor}
            sentenceHighlightColor={highlightStyles.sentenceHighlightColor}
            textColor={surfaceStyles.textColor}
            onClick={
              onParagraphSelect
                ? () => onParagraphSelect(paragraphIndex)
                : undefined
            }
            registerSentenceRef={(sentenceIndex, element) => {
              sentenceRefs.current[`${paragraphIndex}-${sentenceIndex}`] =
                element;
            }}
          />
        </div>
      ))}
    </div>
  );
}