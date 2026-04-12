export type VoiceOption = {
  id: string;
  name: string;
  lang: string;
  voice: SpeechSynthesisVoice;
};

export type SpeechStatus = "idle" | "speaking" | "paused";