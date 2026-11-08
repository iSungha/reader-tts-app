import { useEffect, useRef, useState } from "react";
import ReaderParagraph from "./ReaderParagraph";
import type { Paragraph } from "../../types/reader";
import type { HighlightColorOption, ReaderThemeOption, TextAlignOption, ThemeBackgroundOption } from "../../hooks/useReaderSettings";

type Props = {
  paragraphs: Paragraph[]; currentParagraphIndex: number | null; currentSentenceIndex: number | null;
  fontSize: number; lineHeight: number; paragraphSpacing: number; maxWidth: number; textAlign: TextAlignOption;
  theme: ReaderThemeOption; backgroundTone: ThemeBackgroundOption; highlightColor: HighlightColorOption;
  readingIndex: number; followSpeech: boolean; isFinished: boolean; onParagraphSelect?: (index: number) => void; onReadingIndexChange: (index: number) => void; onMarkFinished: () => void;
};
const colorMap: Record<HighlightColorOption, [string, string]> = {
  green: ["#6b8468", "#dce8cf"], blue: ["#637c99", "#dce8f3"], purple: ["#89739a", "#eee4f4"],
  orange: ["#a66e48", "#f3e4d5"], pink: ["#ad7489", "#f6e5ec"], gray: ["#777c7e", "#e7e8e6"],
};
const WINDOW_SIZE = 180;

export default function ReaderView({ paragraphs, currentParagraphIndex, currentSentenceIndex, fontSize, lineHeight, paragraphSpacing, maxWidth, textAlign, theme, highlightColor, readingIndex, followSpeech, isFinished, onParagraphSelect, onReadingIndexChange, onMarkFinished }: Props) {
  const [start, setStart] = useState(() => Math.max(0, readingIndex - 40));
  const callback = useRef(onReadingIndexChange);
  useEffect(() => { callback.current = onReadingIndexChange; }, [onReadingIndexChange]);
  const end = Math.min(paragraphs.length, start + WINDOW_SIZE);
  const colors = theme === "dark" ? ["#f0be45", "#514423"] : colorMap[highlightColor];

  useEffect(() => {
    if (currentParagraphIndex === null) return;
    if (currentParagraphIndex < start || currentParagraphIndex >= end) {
      const frame = requestAnimationFrame(() => setStart(Math.max(0, currentParagraphIndex - 40)));
      return () => cancelAnimationFrame(frame);
    }
  }, [currentParagraphIndex, start, end]);
  useEffect(() => {
    if (!followSpeech || currentParagraphIndex === null) return;
    const target = document.getElementById(`paragraph-${currentParagraphIndex}`);
    if (!target) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    target.scrollIntoView({ block: "center", behavior: reduced ? "instant" : "smooth" });
  }, [currentParagraphIndex, currentSentenceIndex, start, followSpeech]);
  useEffect(() => {
    if (readingIndex === 0) return;
    const frame = requestAnimationFrame(() => document.getElementById(`paragraph-${readingIndex}`)?.scrollIntoView({ block: "start", behavior: "instant" }));
    return () => cancelAnimationFrame(frame);
    // Initial restoration only; normal scrolling must not be pulled back.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const nodes = document.querySelectorAll<HTMLElement>("[data-paragraph-index]");
        let visible: number | null = null;
        for (const node of nodes) {
          if (node.getBoundingClientRect().bottom > 112) { visible = Number(node.dataset.paragraphIndex); break; }
        }
        if (visible !== null) callback.current(visible);
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { window.removeEventListener("scroll", onScroll); cancelAnimationFrame(frame); };
  }, [start, end, paragraphs.length]);

  return <article className="reading-surface" style={{ maxWidth: `${maxWidth}px`, fontSize: `${fontSize}px`, lineHeight, textAlign, marginInline: "auto", ["--paragraph-space" as string]: `${paragraphSpacing}px`, ["--highlight-bg" as string]: colors[1], ["--highlight-border" as string]: colors[0] }} aria-label="Book text">
    {start > 0 ? <button className="page-window-button" onClick={() => setStart(Math.max(0, start - WINDOW_SIZE))}>Show earlier paragraphs</button> : null}
    {paragraphs.slice(start, end).map((paragraph, offset) => {
      const index = start + offset;
      return <div id={`paragraph-${index}`} data-paragraph-index={index} key={paragraph.id} className={/^(chapter|part|prologue|epilogue)\b|^第.{1,12}章/i.test(paragraph.text.trim()) && paragraph.text.length < 110 ? "chapter-paragraph" : undefined}>
        <ReaderParagraph paragraph={paragraph} isActive={currentParagraphIndex === index} activeSentenceIndex={currentParagraphIndex === index ? currentSentenceIndex : null} activeUnitBorderColor={colors[0]} activeUnitHighlightColor={colors[1]} textColor="inherit" onClick={onParagraphSelect ? () => onParagraphSelect(index) : undefined}/>
      </div>;
    })}
    {end < paragraphs.length ? <button className="page-window-button" onClick={() => setStart(Math.min(paragraphs.length - WINDOW_SIZE, start + WINDOW_SIZE))}>Continue reading <span aria-hidden="true">→</span></button> : <div className="end-mark">{isFinished ? <span className="finished-label">Finished</span> : <button className="finish-button" onClick={onMarkFinished}>Mark this file finished</button>}</div>}
  </article>;
}
