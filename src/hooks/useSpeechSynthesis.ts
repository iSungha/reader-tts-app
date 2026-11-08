import { useEffect, useRef, useState } from "react";
import type { Paragraph } from "../types/reader";
import type { SpeechStatus, VoiceOption } from "../types/tts";

type Props = { paragraphs: Paragraph[]; voices: VoiceOption[]; selectedVoiceId: string; rate: number };

function removeSpokenQuotationMarks(text: string): string {
  return text.replace(/["“”„‟«»‹›「」『』〝〞〟＂‘’']/gu, (mark, index: number, source: string) => {
    if (mark === "’" || mark === "'") {
      const previous = source[index - 1] ?? "";
      const next = source[index + 1] ?? "";
      const isWordCharacter = (character: string) => /[\p{L}\p{N}]/u.test(character);

      // Keep apostrophes in contractions and possessives, but drop quote marks.
      return isWordCharacter(previous) && isWordCharacter(next) ? mark : "";
    }

    return "";
  }).trim();
}

export function useSpeechSynthesis({ paragraphs, voices, selectedVoiceId, rate }: Props) {
  const [status, setStatus] = useState<SpeechStatus>("idle");
  const [currentParagraphIndex, setCurrentParagraphIndex] = useState<number | null>(null);
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [completionTick, setCompletionTick] = useState(0);
  const cursor = useRef({ paragraph: 0, sentence: 0 });
  const generation = useRef(0);
  const active = useRef(false);
  const statusRef = useRef<SpeechStatus>("idle");
  const options = useRef({ paragraphs, voices, selectedVoiceId, rate });
  options.current = { paragraphs, voices, selectedVoiceId, rate };

  const setPlaybackStatus = (next: SpeechStatus) => { statusRef.current = next; setStatus(next); };
  const cancel = () => {
    generation.current += 1;
    active.current = false;
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  };
  const playUnit = (paragraphIndex: number, sentenceIndex: number, token: number) => {
    if (token !== generation.current) return;
    const { paragraphs: items, voices: available, selectedVoiceId: voiceId, rate: speed } = options.current;
    if (paragraphIndex >= items.length) { active.current = false; setPlaybackStatus("idle"); setCompletionTick(value => value + 1); return; }
    const units = items[paragraphIndex].sentences.filter(Boolean);
    if (!units.length || sentenceIndex >= units.length) { playUnit(paragraphIndex + 1, 0, token); return; }
    const spokenText = removeSpokenQuotationMarks(units[sentenceIndex]);
    if (!spokenText) {
      if (sentenceIndex + 1 < units.length) playUnit(paragraphIndex, sentenceIndex + 1, token);
      else playUnit(paragraphIndex + 1, 0, token);
      return;
    }
    cursor.current = { paragraph: paragraphIndex, sentence: sentenceIndex };
    setCurrentParagraphIndex(paragraphIndex);
    setCurrentSentenceIndex(sentenceIndex);
    const utterance = new SpeechSynthesisUtterance(spokenText);
    const voice = available.find(item => item.id === voiceId)?.voice;
    if (voice) { utterance.voice = voice; utterance.lang = voice.lang; }
    utterance.rate = speed;
    utterance.onstart = () => { if (token === generation.current) setPlaybackStatus("speaking"); };
    utterance.onend = () => {
      if (token !== generation.current || !active.current) return;
      if (sentenceIndex + 1 < units.length) playUnit(paragraphIndex, sentenceIndex + 1, token);
      else playUnit(paragraphIndex + 1, 0, token);
    };
    utterance.onerror = event => {
      if (token !== generation.current) return;
      if (event.error === "interrupted" || event.error === "canceled") return;
      active.current = false; setPlaybackStatus("idle");
      setError("Speech stopped. Try Play again or select another browser voice.");
    };
    window.speechSynthesis.speak(utterance);
  };
  const playFromPosition = (paragraphIndex: number, sentenceIndex = 0) => {
    if (!("speechSynthesis" in window)) { setError("Speech is unavailable in this browser."); return; }
    const items = options.current.paragraphs;
    if (paragraphIndex < 0 || paragraphIndex >= items.length) return;
    cancel(); setError(""); active.current = true;
    const safeSentence = Math.max(0, Math.min(sentenceIndex, Math.max(0, items[paragraphIndex].sentences.length - 1)));
    playUnit(paragraphIndex, safeSentence, generation.current);
  };
  const playFromParagraph = (index: number) => playFromPosition(index, 0);
  const speak = () => {
    if (statusRef.current === "paused" && "speechSynthesis" in window) {
      window.speechSynthesis.resume(); setPlaybackStatus("speaking"); return;
    }
    playFromPosition(cursor.current.paragraph, cursor.current.sentence);
  };
  const pause = () => {
    if (statusRef.current === "speaking" && "speechSynthesis" in window) {
      window.speechSynthesis.pause(); setPlaybackStatus("paused");
    }
  };
  const stop = () => { cancel(); setPlaybackStatus("idle"); };
  const restorePosition = (paragraphIndex: number, sentenceIndex = 0) => {
    stop(); cursor.current = { paragraph: paragraphIndex, sentence: sentenceIndex };
    setCurrentParagraphIndex(paragraphIndex); setCurrentSentenceIndex(sentenceIndex);
  };
  const goToPreviousParagraph = () => playFromParagraph(Math.max(0, cursor.current.paragraph - 1));
  const goToNextParagraph = () => playFromParagraph(Math.min(options.current.paragraphs.length - 1, cursor.current.paragraph + 1));
  useEffect(() => {
    if (statusRef.current === "speaking") playFromPosition(cursor.current.paragraph, cursor.current.sentence);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedVoiceId, rate]);
  useEffect(() => () => { generation.current += 1; window.speechSynthesis?.cancel(); }, []);
  return { status, error, completionTick, currentParagraphIndex, currentSentenceIndex, speak, pause, stop,
    playFromParagraph, playFromPosition, restorePosition, goToPreviousParagraph, goToNextParagraph };
}
