import { useCallback, useEffect, useRef, useState } from "react";
import { nextSpeechChunk } from "../lib/speech/nextSpeechChunk";
import type { Paragraph } from "../types/reader";
import type { SpeechStatus, VoiceOption } from "../types/tts";

type Props = { paragraphs: Paragraph[]; voices: VoiceOption[]; selectedVoiceId: string; rate: number; joinPdfLines: boolean };
type SpeechAttempt = {
  utterance: SpeechSynthesisUtterance;
  timeoutMs: number;
  onTimeout: () => void;
};

export function useSpeechSynthesis({ paragraphs, voices, selectedVoiceId, rate, joinPdfLines }: Props) {
  const [status, setStatus] = useState<SpeechStatus>("idle");
  const [currentParagraphIndex, setCurrentParagraphIndex] = useState<number | null>(null);
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState<number | null>(null);
  const [currentSentenceEndIndex, setCurrentSentenceEndIndex] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [completionTick, setCompletionTick] = useState(0);
  const cursor = useRef({ paragraph: 0, sentence: 0 });
  const attempt = useRef<SpeechAttempt | null>(null);
  const timeout = useRef<number | undefined>(undefined);
  const statusRef = useRef<SpeechStatus>("idle");
  const options = useRef({ paragraphs, voices, selectedVoiceId, rate, joinPdfLines });
  options.current = { paragraphs, voices, selectedVoiceId, rate, joinPdfLines };

  const setPlaybackStatus = (next: SpeechStatus) => { statusRef.current = next; setStatus(next); };
  const clearWatchdog = useCallback(() => {
    window.clearTimeout(timeout.current);
    timeout.current = undefined;
  }, []);
  const watchSpeech = useCallback(() => {
    clearWatchdog();
    const current = attempt.current;
    // Background tabs can be suspended by the OS. Start a fresh timer when visible.
    if (!current || statusRef.current !== "speaking" || document.hidden) return;
    timeout.current = window.setTimeout(() => {
      if (attempt.current === current && statusRef.current === "speaking" && !document.hidden) current.onTimeout();
    }, current.timeoutMs);
  }, [clearWatchdog]);
  const cancel = useCallback(() => {
    clearWatchdog();
    attempt.current = null;
    window.speechSynthesis?.cancel();
  }, [clearWatchdog]);

  const playUnit = (fromParagraph: number, fromSentence: number) => {
    const { paragraphs: items, voices: available, selectedVoiceId: voiceId, rate: speed, joinPdfLines: joinLines } = options.current;
    for (let paragraphIndex = fromParagraph; paragraphIndex < items.length; paragraphIndex += 1) {
      const paragraph = items[paragraphIndex];
      const chunk = nextSpeechChunk(paragraph.sentences, paragraphIndex === fromParagraph ? fromSentence : 0, joinLines && paragraph.text.includes("\n"));
      if (!chunk) continue;

      cursor.current = { paragraph: paragraphIndex, sentence: chunk.start };
      setCurrentParagraphIndex(paragraphIndex);
      setCurrentSentenceIndex(chunk.start);
      setCurrentSentenceEndIndex(chunk.end);

      const utterance = new SpeechSynthesisUtterance(chunk.text);
      const voice = available.find(item => item.id === voiceId)?.voice;
      if (voice) { utterance.voice = voice; utterance.lang = voice.lang; }
      utterance.rate = speed;

      function fail(message: string) {
        if (attempt.current?.utterance !== utterance) return;
        cancel();
        setPlaybackStatus("idle");
        setError(message);
      }

      attempt.current = {
        utterance,
        timeoutMs: 12_000,
        onTimeout: () => fail("Speech stopped responding. Tap Play to try again from here."),
      };
      utterance.onstart = () => {
        const current = attempt.current;
        if (current?.utterance !== utterance) return;
        // Give slow voices time to finish, including voices without boundary events.
        current.timeoutMs = Math.max(15_000, 8000 + 140 * chunk.text.length / speed);
        watchSpeech();
      };
      utterance.onend = () => {
        if (attempt.current?.utterance !== utterance) return;
        attempt.current = null;
        clearWatchdog();
        playUnit(paragraphIndex, chunk.end + 1);
      };
      utterance.onerror = event => fail(event.error === "interrupted" || event.error === "canceled"
        ? "Speech was interrupted. Tap Play to continue from here."
        : "Speech stopped. Tap Play to try again or select another browser voice.");

      watchSpeech();
      try {
        window.speechSynthesis.speak(utterance);
      } catch {
        fail("Speech could not start. Tap Play to try again or select another browser voice.");
      }
      return;
    }

    setPlaybackStatus("idle");
    setCompletionTick(value => value + 1);
  };
  const playFromPosition = (paragraphIndex: number, sentenceIndex = 0) => {
    if (!window.speechSynthesis || typeof SpeechSynthesisUtterance === "undefined") {
      setError("Speech is unavailable in this browser.");
      return;
    }
    const items = options.current.paragraphs;
    if (paragraphIndex < 0 || paragraphIndex >= items.length) return;
    cancel();
    setError("");
    setPlaybackStatus("speaking");
    const safeSentence = Math.max(0, Math.min(sentenceIndex, Math.max(0, items[paragraphIndex].sentences.length - 1)));
    playUnit(paragraphIndex, safeSentence);
  };
  const playFromParagraph = (index: number) => playFromPosition(index, 0);
  const speak = () => {
    if (statusRef.current === "paused" && "speechSynthesis" in window) {
      setPlaybackStatus("speaking");
      window.speechSynthesis.resume();
      watchSpeech();
      return;
    }
    playFromPosition(cursor.current.paragraph, cursor.current.sentence);
  };
  const pause = () => {
    if (statusRef.current === "speaking" && "speechSynthesis" in window) {
      setPlaybackStatus("paused");
      clearWatchdog();
      window.speechSynthesis.pause();
    }
  };
  const stop = () => { cancel(); setPlaybackStatus("idle"); };
  const restorePosition = (paragraphIndex: number, sentenceIndex = 0) => {
    stop(); cursor.current = { paragraph: paragraphIndex, sentence: sentenceIndex };
    setCurrentParagraphIndex(paragraphIndex); setCurrentSentenceIndex(sentenceIndex);
    setCurrentSentenceEndIndex(sentenceIndex);
  };
  const goToPreviousParagraph = () => playFromParagraph(Math.max(0, cursor.current.paragraph - 1));
  const goToNextParagraph = () => playFromParagraph(Math.min(options.current.paragraphs.length - 1, cursor.current.paragraph + 1));
  useEffect(() => {
    if (statusRef.current === "speaking") playFromPosition(cursor.current.paragraph, cursor.current.sentence);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedVoiceId, rate]);
  useEffect(() => {
    document.addEventListener("visibilitychange", watchSpeech);
    return () => {
      document.removeEventListener("visibilitychange", watchSpeech);
      cancel();
    };
  }, [watchSpeech, cancel]);
  return { status, error, completionTick, currentParagraphIndex, currentSentenceIndex, currentSentenceEndIndex, speak, pause, stop,
    playFromParagraph, playFromPosition, restorePosition, goToPreviousParagraph, goToNextParagraph };
}
