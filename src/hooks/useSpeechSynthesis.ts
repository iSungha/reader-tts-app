import { useEffect, useMemo, useRef, useState } from "react";
import type { Paragraph } from "../types/reader";
import type { SpeechStatus, VoiceOption } from "../types/tts";

type UseSpeechSynthesisProps = {
  paragraphs: Paragraph[];
  voices: VoiceOption[];
  selectedVoiceId: string;
  rate: number;
};

function getSentenceIndexFromCharIndex(
  sentences: string[],
  charIndex: number
): number {
  let runningLength = 0;

  for (let i = 0; i < sentences.length; i += 1) {
    const sentenceLength = sentences[i].length;
    const sentenceStart = runningLength;
    const sentenceEnd = runningLength + sentenceLength;

    if (charIndex >= sentenceStart && charIndex <= sentenceEnd) {
      return i;
    }

    runningLength = sentenceEnd + 1;
  }

  return 0;
}

export function useSpeechSynthesis({
  paragraphs,
  voices,
  selectedVoiceId,
  rate,
}: UseSpeechSynthesisProps) {
  const [status, setStatus] = useState<SpeechStatus>("idle");
  const [currentParagraphIndex, setCurrentParagraphIndex] = useState<number | null>(null);
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState<number | null>(null);

  const currentParagraphIndexRef = useRef<number | null>(null);
  const isManualStopRef = useRef(false);
  const previousVoiceIdRef = useRef(selectedVoiceId);
  const previousRateRef = useRef(rate);

  const selectedVoice = useMemo(() => {
    return voices.find((voice) => voice.id === selectedVoiceId)?.voice ?? null;
  }, [voices, selectedVoiceId]);

  useEffect(() => {
    currentParagraphIndexRef.current = currentParagraphIndex;
  }, [currentParagraphIndex]);

  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  const speakParagraphAtIndex = (index: number) => {
    if (index >= paragraphs.length) {
      setStatus("idle");
      setCurrentParagraphIndex(null);
      setCurrentSentenceIndex(null);
      return;
    }

    const paragraph = paragraphs[index];
    const utterance = new SpeechSynthesisUtterance(paragraph.text);

    if (selectedVoice) {
      utterance.voice = selectedVoice;
      utterance.lang = selectedVoice.lang;
    }

    utterance.rate = rate;
    utterance.pitch = 1;
    utterance.volume = 1;

    utterance.onstart = () => {
      setStatus("speaking");
      setCurrentParagraphIndex(index);
      setCurrentSentenceIndex(0);
    };

    utterance.onboundary = (event) => {
      if (typeof event.charIndex !== "number") {
        return;
      }

      const sentenceIndex = getSentenceIndexFromCharIndex(
        paragraph.sentences,
        event.charIndex
      );

      setCurrentParagraphIndex(index);
      setCurrentSentenceIndex(sentenceIndex);
    };

    utterance.onend = () => {
      if (isManualStopRef.current) {
        return;
      }

      speakParagraphAtIndex(index + 1);
    };

    utterance.onerror = () => {
      setStatus("idle");
      setCurrentParagraphIndex(null);
      setCurrentSentenceIndex(null);
    };

    window.speechSynthesis.speak(utterance);
  };

  const playFromParagraph = (startIndex: number) => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      return;
    }

    if (paragraphs.length === 0) {
      return;
    }

    if (startIndex < 0 || startIndex >= paragraphs.length) {
      return;
    }

    isManualStopRef.current = false;
    window.speechSynthesis.cancel();
    setCurrentParagraphIndex(startIndex);
    setCurrentSentenceIndex(0);
    speakParagraphAtIndex(startIndex);
  };

  const speak = () => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      return;
    }

    if (paragraphs.length === 0) {
      return;
    }

    if (status === "paused") {
      window.speechSynthesis.resume();
      setStatus("speaking");
      return;
    }

    const startIndex =
      currentParagraphIndexRef.current !== null ? currentParagraphIndexRef.current : 0;

    playFromParagraph(startIndex);
  };

  const pause = () => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      return;
    }

    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.pause();
      setStatus("paused");
    }
  };

  const stop = () => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      return;
    }

    isManualStopRef.current = true;
    window.speechSynthesis.cancel();
    setStatus("idle");
    setCurrentParagraphIndex(null);
    setCurrentSentenceIndex(null);
  };

  const setCurrentParagraph = (index: number | null) => {
    setCurrentParagraphIndex(index);
    setCurrentSentenceIndex(index === null ? null : 0);
  };

  const goToPreviousParagraph = () => {
    if (paragraphs.length === 0) {
      return;
    }

    const currentIndex = currentParagraphIndexRef.current ?? 0;
    const previousIndex = Math.max(0, currentIndex - 1);
    playFromParagraph(previousIndex);
  };

  const goToNextParagraph = () => {
    if (paragraphs.length === 0) {
      return;
    }

    const currentIndex = currentParagraphIndexRef.current ?? 0;
    const nextIndex = Math.min(paragraphs.length - 1, currentIndex + 1);
    playFromParagraph(nextIndex);
  };

  useEffect(() => {
    const voiceChanged = previousVoiceIdRef.current !== selectedVoiceId;
    const rateChanged = previousRateRef.current !== rate;

    previousVoiceIdRef.current = selectedVoiceId;
    previousRateRef.current = rate;

    if (!voiceChanged && !rateChanged) {
      return;
    }

    if (paragraphs.length === 0) {
      return;
    }

    const activeIndex = currentParagraphIndexRef.current;

    if (activeIndex === null) {
      return;
    }

    if (status === "speaking" || status === "paused") {
      playFromParagraph(activeIndex);
    }
  }, [selectedVoiceId, rate, paragraphs.length, status]);

  return {
    status,
    currentParagraphIndex,
    currentSentenceIndex,
    speak,
    pause,
    stop,
    playFromParagraph,
    setCurrentParagraph,
    goToPreviousParagraph,
    goToNextParagraph,
  };
}