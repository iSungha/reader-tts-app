import { useEffect, useState } from "react";
import type { VoiceOption } from "../types/tts";

export function useVoices() {
  const [voices, setVoices] = useState<VoiceOption[]>([]);

  useEffect(() => {
    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();

      const mappedVoices: VoiceOption[] = availableVoices.map((voice, index) => ({
        id: `${voice.name}-${voice.lang}-${index}`,
        name: voice.name,
        lang: voice.lang,
        voice,
      }));

      setVoices(mappedVoices);
    };

    loadVoices();

    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  return voices;
}