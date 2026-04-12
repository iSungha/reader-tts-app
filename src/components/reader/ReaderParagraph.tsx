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
    },
    ref
  ) => {
    return (
      <p
        ref={ref}
        onClick={onClick}
        style={{
          padding: "10px",
          borderRadius: "10px",
          border: isActive ? `2px solid ${paragraphBorderColor}` : "2px solid transparent",
          backgroundColor: "transparent",
          transition: "border-color 0.2s ease",
          marginBottom: "16px",
          lineHeight: 1.7,
          color: textColor,
          cursor: onClick ? "pointer" : "default",
        }}
      >
        {paragraph.sentences.map((sentence, index) => {
          const isActiveSentence = isActive && activeSentenceIndex === index;

          return (
            <span
              key={`${paragraph.id}-sentence-${index}`}
              style={{
                backgroundColor: isActiveSentence
                  ? sentenceHighlightColor
                  : "transparent",
                borderRadius: "4px",
                padding: isActiveSentence ? "2px 4px" : "0",
                transition: "background-color 0.2s ease",
              }}
            >
              {sentence}{" "}
            </span>
          );
        })}
      </p>
    );
  }
);

ReaderParagraph.displayName = "ReaderParagraph";

export default ReaderParagraph;