import { forwardRef } from "react";
import type { Paragraph } from "../../types/reader";

type Props = {
  paragraph: Paragraph;
  isActive: boolean;
  activeSentenceIndex: number | null;
  paragraphBorderColor: string;
  sentenceHighlightColor: string;
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
      paragraphBorderColor,
      sentenceHighlightColor,
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
        style={{
          padding: "10px",
          borderRadius: "10px",
          border: isActive
            ? `2px solid ${paragraphBorderColor}`
            : "2px solid transparent",
          backgroundColor: "transparent",
          transition: "border-color 0.2s ease",
          marginBottom: "16px",
          lineHeight: 1.7,
          color: textColor,
          cursor: onClick ? "pointer" : "default",
          whiteSpace: "pre-wrap",
        }}
      >
        {paragraph.sentences.map((sentence, index) => {
          const isActiveSentence = isActive && activeSentenceIndex === index;

          if (isLineBasedParagraph) {
            return (
              <span
                key={`${paragraph.id}-line-${index}`}
                ref={(element) => registerSentenceRef?.(index, element)}
                style={{
                  display: "block",
                  width: "fit-content",
                  maxWidth: "100%",
                  backgroundColor: isActiveSentence
                    ? sentenceHighlightColor
                    : "transparent",
                  borderRadius: "4px",
                  padding: isActiveSentence ? "2px 4px" : "0",
                  transition: "background-color 0.2s ease",
                  whiteSpace: "pre-wrap",
                }}
              >
                {sentence}
              </span>
            );
          }

          return (
            <span
              key={`${paragraph.id}-sentence-${index}`}
              ref={(element) => registerSentenceRef?.(index, element)}
              style={{
                backgroundColor: isActiveSentence
                  ? sentenceHighlightColor
                  : "transparent",
                borderRadius: "4px",
                padding: isActiveSentence ? "2px 4px" : "0",
                transition: "background-color 0.2s ease",
                whiteSpace: "pre-wrap",
              }}
            >
              {sentence}
              {index < paragraph.sentences.length - 1 ? " " : ""}
            </span>
          );
        })}
      </p>
    );
  }
);

ReaderParagraph.displayName = "ReaderParagraph";

export default ReaderParagraph;