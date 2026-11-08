import { useEffect, useRef, useState } from "react";
import { LocateFixed } from "lucide-react";
import ReaderParagraph from "./ReaderParagraph";
import type { Paragraph } from "../../types/reader";
import type { TextAlignOption } from "../../hooks/useReaderSettings";

type Props = {
  paragraphs: Paragraph[]; currentParagraphIndex: number | null; currentSentenceIndex: number | null;
  fontSize: number; lineHeight: number; paragraphSpacing: number; maxWidth: number; textAlign: TextAlignOption;
  readingIndex: number; followSpeech: boolean; isFinished: boolean; isQuickListen: boolean; onParagraphSelect?: (index: number) => void; onReadingIndexChange: (index: number) => void; onMarkFinished: () => void;
};
const WINDOW_SIZE = 180;
const colors = ["#e7b992", "#594031"] as const;

export default function ReaderView({ paragraphs, currentParagraphIndex, currentSentenceIndex, fontSize, lineHeight, paragraphSpacing, maxWidth, textAlign, readingIndex, followSpeech, isFinished, isQuickListen, onParagraphSelect, onReadingIndexChange, onMarkFinished }: Props) {
  const [start, setStart] = useState(() => Math.max(0, readingIndex - 40));
  const [followPaused, setFollowPaused] = useState(false);
  const scrollIntentUntil = useRef(0);
  const callback = useRef(onReadingIndexChange);
  useEffect(() => { callback.current = onReadingIndexChange; }, [onReadingIndexChange]);
  const end = Math.min(paragraphs.length, start + WINDOW_SIZE);

  useEffect(() => {
    if (currentParagraphIndex === null) return;
    if (currentParagraphIndex < start || currentParagraphIndex >= end) {
      const frame = requestAnimationFrame(() => setStart(Math.max(0, currentParagraphIndex - 40)));
      return () => cancelAnimationFrame(frame);
    }
  }, [currentParagraphIndex, start, end]);
  useEffect(() => {
    if (!followSpeech || followPaused || currentParagraphIndex === null) return;
    const target = document.getElementById(`paragraph-${currentParagraphIndex}`);
    if (!target) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    target.scrollIntoView({ block: "center", behavior: reduced ? "instant" : "smooth" });
  }, [currentParagraphIndex, start, followSpeech, followPaused]);
  useEffect(() => {
    if (readingIndex === 0) return;
    const frame = requestAnimationFrame(() => document.getElementById(`paragraph-${readingIndex}`)?.scrollIntoView({ block: "start", behavior: "instant" }));
    return () => cancelAnimationFrame(frame);
    // Initial restoration only; normal scrolling must not be pulled back.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " "].includes(event.key)) return;
      if (event.target instanceof HTMLElement && event.target.closest("input, select, textarea, button")) return;
      scrollIntentUntil.current = performance.now() + 2000;
      if (followSpeech) setFollowPaused(true);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [followSpeech]);
  useEffect(() => {
    let frame = 0;
    const onScroll = () => {
      if (performance.now() > scrollIntentUntil.current) return;
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        if (performance.now() > scrollIntentUntil.current) return;
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

  function markUserScroll() {
    scrollIntentUntil.current = performance.now() + 2000;
    if (followSpeech) setFollowPaused(true);
  }

  function returnToAudio() {
    if (currentParagraphIndex === null) return;
    scrollIntentUntil.current = 0;
    callback.current(currentParagraphIndex);
    setFollowPaused(false);
    document.getElementById(`paragraph-${currentParagraphIndex}`)?.scrollIntoView({ block: "center", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
  }

  return <article className="reading-surface" onWheel={markUserScroll} onTouchMove={markUserScroll} style={{ maxWidth: `${maxWidth}px`, fontSize: `${fontSize}px`, lineHeight, textAlign, marginInline: "auto", ["--paragraph-space" as string]: `${paragraphSpacing}px`, ["--highlight-bg" as string]: colors[1], ["--highlight-border" as string]: colors[0] }} aria-label="Book text">
    {followSpeech && followPaused ? <button className="reader-follow-button" type="button" onClick={returnToAudio}><LocateFixed size={17} aria-hidden="true"/> Follow audio</button> : null}
    {start > 0 ? <button className="page-window-button" onClick={() => setStart(Math.max(0, start - WINDOW_SIZE))}>Show earlier paragraphs</button> : null}
    {paragraphs.slice(start, end).map((paragraph, offset) => {
      const index = start + offset;
      return <div id={`paragraph-${index}`} data-paragraph-index={index} key={paragraph.id} className={!isQuickListen && /^(chapter|part|prologue|epilogue)\b|^第.{1,12}章/i.test(paragraph.text.trim()) && paragraph.text.length < 110 ? "chapter-paragraph" : undefined}>
        <ReaderParagraph paragraph={paragraph} isActive={currentParagraphIndex === index} activeSentenceIndex={currentParagraphIndex === index ? currentSentenceIndex : null} activeUnitBorderColor={colors[0]} activeUnitHighlightColor={colors[1]} textColor="inherit" onClick={onParagraphSelect ? () => onParagraphSelect(index) : undefined}/>
      </div>;
    })}
    {end < paragraphs.length ? <button className="page-window-button" onClick={() => setStart(Math.min(paragraphs.length - WINDOW_SIZE, start + WINDOW_SIZE))}>Continue reading <span aria-hidden="true">→</span></button> : <div className="end-mark">{isFinished ? <span className="finished-label">Finished</span> : <button className="finish-button" onClick={onMarkFinished}>Mark this file finished</button>}</div>}
  </article>;
}
