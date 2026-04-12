import type { SpeechStatus } from "../../types/tts";

type Props = {
  status: SpeechStatus;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
};

export default function TtsControls({
  status,
  onPlay,
  onPause,
  onStop,
}: Props) {
  return (
    <div
      style={{
        display: "flex",
        gap: "10px",
        marginBottom: "16px",
        flexWrap: "wrap",
      }}
    >
      <button type="button" onClick={onPlay} style={buttonStyle}>
        {status === "paused" ? "Resume" : "Play"}
      </button>

      <button
        type="button"
        onClick={onPause}
        disabled={status !== "speaking"}
        style={{
          ...buttonStyle,
          opacity: status !== "speaking" ? 0.5 : 1,
        }}
      >
        Pause
      </button>

      <button
        type="button"
        onClick={onStop}
        disabled={status === "idle"}
        style={{
          ...buttonStyle,
          opacity: status === "idle" ? 0.5 : 1,
        }}
      >
        Stop
      </button>
    </div>
  );
}

const buttonStyle: React.CSSProperties = {
  border: "1px solid #4b5563",
  backgroundColor: "#1f2937",
  color: "#f9fafb",
  borderRadius: "8px",
  padding: "10px 14px",
  cursor: "pointer",
  fontWeight: 600,
};