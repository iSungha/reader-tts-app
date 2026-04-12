import type { VoiceOption } from "../../types/tts";

type Props = {
  voices: VoiceOption[];
  selectedVoiceId: string;
  onChange: (voiceId: string) => void;
};

export default function VoiceSelector({
  voices,
  selectedVoiceId,
  onChange,
}: Props) {
  return (
    <div>
      <h3>Voice</h3>

      <select
        value={selectedVoiceId}
        onChange={(e) => onChange(e.target.value)}
        style={{ width: "100%", padding: "8px", marginBottom: "12px" }}
      >
        <option value="">Select a voice</option>

        {voices.map((voice) => (
          <option key={voice.id} value={voice.id}>
            {voice.name} ({voice.lang})
          </option>
        ))}
      </select>
    </div>
  );
}