import { forwardRef } from "react";
import type { Paragraph } from "../../types/reader";

type Props = {
  paragraph: Paragraph;
  isActive: boolean;
  activeSentenceIndex: number | null;
  activeUnitBorderColor: string;
  activeUnitHighlightColor: string;
  textColor: string;
  onClick?: () => void;
  registerSentenceRef?: (
    sentenceIndex: number,
    element: HTMLSpanElement | null
  ) => void;
};

const ReaderParagraph = forwardRef<HTMLParagraphElement, Props>(
  (
    {
      paragraph,
      isActive,
      activeSentenceIndex,
      activeUnitBorderColor,
      activeUnitHighlightColor,
      textColor,
      onClick,
      registerSentenceRef,
    },
    ref
  ) => {
    const isLineBasedParagraph = paragraph.text.includes("\n");

    return (
      <p
        ref={ref}
        onClick={onClick}
        onKeyDown={onClick ? (event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onClick(); } } : undefined}
        tabIndex={onClick ? 0 : undefined}
        role={onClick ? "button" : undefined}
        aria-label={onClick ? `Listen from: ${paragraph.text.slice(0, 80)}` : undefined}
        className="reader-paragraph"
        style={{
          color: textColor,
          whiteSpace: "pre-wrap",
        }}
      >
        {paragraph.renderUnits.map((unit, index) => {
          const isActiveUnit = isActive && activeSentenceIndex === index;

          const content = (
            <>
              {unit.parts.map((part, partIndex) => (
                <span
                  key={`${paragraph.id}-unit-${index}-part-${partIndex}`}
                  style={{
                    fontWeight: part.bold ? 700 : 400,
                  }}
                >
                  {part.text}
                </span>
              ))}
            </>
          );

          if (isLineBasedParagraph) {
            return (
              <span
                key={`${paragraph.id}-line-${index}`}
                ref={(element) => registerSentenceRef?.(index, element)}
                style={{
                  display: "block",
                  width: "fit-content",
                  maxWidth: "100%",
                  backgroundColor: isActiveUnit
                    ? activeUnitHighlightColor
                    : "transparent",
                  borderBottom: isActiveUnit ? `2px solid ${activeUnitBorderColor}` : "2px solid transparent",
                  borderRadius: "6px",
                  padding: "2px 0",
                  transition:
                    "background-color 0.2s ease, border-color 0.2s ease",
                  whiteSpace: "pre-wrap",
                }}
              >
                {content}
              </span>
            );
          }

          return (
            <span
              key={`${paragraph.id}-sentence-${index}`}
              ref={(element) => registerSentenceRef?.(index, element)}
              style={{
                backgroundColor: isActiveUnit
                  ? activeUnitHighlightColor
                  : "transparent",
                borderBottom: isActiveUnit ? `2px solid ${activeUnitBorderColor}` : "2px solid transparent",
                borderRadius: "6px",
                padding: "2px 0",
                transition:
                  "background-color 0.2s ease, border-color 0.2s ease",
                whiteSpace: "pre-wrap",
              }}
            >
              {content}
              {index < paragraph.renderUnits.length - 1 ? " " : ""}
            </span>
          );
        })}
      </p>
    );
  }
);

ReaderParagraph.displayName = "ReaderParagraph";

export default ReaderParagraph;
