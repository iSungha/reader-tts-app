import { useState } from "react";
import type { VoiceOption, SpeechStatus } from "../../types/tts";
import type {
  HighlightColorOption,
  ReaderThemeOption,
  ThemeBackgroundOption,
} from "../../hooks/useReaderSettings";

type Props = {
  status: SpeechStatus;
  currentParagraphIndex: number | null;
  totalParagraphs: number;
  selectedVoiceId: string;
  selectedVoiceLabel: string;
  voices: VoiceOption[];
  rate: number;
  onRateChange: (value: number) => void;
  onVoiceChange: (voiceId: string) => void;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  onPrevious: () => void;
  onNext: () => void;
  fontSize: number;
  onFontSizeChange: (value: number) => void;
  lineHeight: number;
  onLineHeightChange: (value: number) => void;
  paragraphSpacing: number;
  onParagraphSpacingChange: (value: number) => void;
  theme: ReaderThemeOption;
  onThemeChange: (value: ReaderThemeOption) => void;
  backgroundTone: ThemeBackgroundOption;
  onBackgroundToneChange: (value: ThemeBackgroundOption) => void;
  highlightColor: HighlightColorOption;
  onHighlightColorChange: (value: HighlightColorOption) => void;
};

const RATE_OPTIONS = [0.6, 0.7, 0.8, 0.9, 1, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 2];

const BACKGROUND_TONES: ThemeBackgroundOption[] = [
  "black",
  "gray",
  "darkblue",
  "darkgreen",
  "darkbrown",
  "darkpurple",
];

const HIGHLIGHT_COLORS: HighlightColorOption[] = [
  "gray",
  "blue",
  "purple",
  "green",
  "orange",
  "pink",
];

function swatchColor(value: ThemeBackgroundOption | HighlightColorOption): string {
  switch (value) {
    case "black":
      return "#111111";
    case "gray":
      return "#3f3f46";
    case "darkblue":
      return "#1e3a8a";
    case "darkgreen":
      return "#14532d";
    case "darkbrown":
      return "#4a2c1d";
    case "darkpurple":
      return "#4c1d95";
    case "blue":
      return "#2563eb";
    case "purple":
      return "#7c3aed";
    case "green":
      return "#16a34a";
    case "orange":
      return "#ea580c";
    case "pink":
      return "#c026d3";
    default:
      return "#6b7280";
  }
}

export default function MobileTtsBar({
  status,
  currentParagraphIndex,
  totalParagraphs,
  selectedVoiceId,
  selectedVoiceLabel,
  voices,
  rate,
  onRateChange,
  onVoiceChange,
  onPlay,
  onPause,
  onStop,
  onPrevious,
  onNext,
  fontSize,
  onFontSizeChange,
  lineHeight,
  onLineHeightChange,
  paragraphSpacing,
  onParagraphSpacingChange,
  theme,
  onThemeChange,
  backgroundTone,
  onBackgroundToneChange,
  highlightColor,
  onHighlightColorChange,
}: Props) {
  const [isExpanded, setIsExpanded] = useState(false);

  const currentDisplay =
    currentParagraphIndex !== null ? currentParagraphIndex + 1 : "-";

  return (
    <div
      style={{
        position: "fixed",
        left: "12px",
        right: "12px",
        bottom: "12px",
        zIndex: 1000,
        maxWidth: "760px",
        margin: "0 auto",
      }}
    >
      <div
        style={{
          border: "1px solid #2a2a2a",
          backgroundColor: "#0b0b0f",
          color: "#f5f5f5",
          borderRadius: "16px",
          boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
          overflow: "hidden",
        }}
      >
        <button
          type="button"
          onClick={() => setIsExpanded((prev) => !prev)}
          style={{
            width: "100%",
            border: "none",
            background: "transparent",
            color: "inherit",
            padding: "12px 14px",
            textAlign: "left",
            cursor: "pointer",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "12px",
            }}
          >
            <div>
              <div style={{ fontWeight: 700, fontSize: "14px" }}>
                {status === "speaking"
                  ? "Reading now"
                  : status === "paused"
                  ? "Paused"
                  : "Ready"}
              </div>
              <div style={{ fontSize: "12px", opacity: 0.85, marginTop: "2px" }}>
                Paragraph {currentDisplay} / {totalParagraphs || "-"} • {selectedVoiceLabel} • {rate}x
              </div>
            </div>

            <div
              style={{
                fontSize: "12px",
                opacity: 0.8,
                whiteSpace: "nowrap",
              }}
            >
              {isExpanded ? "Hide controls" : "Show controls"}
            </div>
          </div>
        </button>

        {isExpanded ? (
          <div
            style={{
              borderTop: "1px solid #2a2a2a",
              padding: "12px 14px 14px",
              maxHeight: "68vh",
              overflowY: "auto",
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(5, 1fr)",
                gap: "10px",
                marginBottom: "14px",
              }}
            >
              <button
                type="button"
                onClick={onPrevious}
                disabled={totalParagraphs === 0}
                style={{
                  ...buttonStyle,
                  opacity: totalParagraphs === 0 ? 0.5 : 1,
                }}
              >
                Prev
              </button>

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

              <button
                type="button"
                onClick={onNext}
                disabled={totalParagraphs === 0}
                style={{
                  ...buttonStyle,
                  opacity: totalParagraphs === 0 ? 0.5 : 1,
                }}
              >
                Next
              </button>
            </div>

            <SectionTitle title="Text to Speech" />

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "110px 1fr",
                gap: "10px",
                marginBottom: "14px",
              }}
            >
              <select
                value={String(rate)}
                onChange={(e) => onRateChange(Number(e.target.value))}
                style={selectStyle}
              >
                {RATE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}x
                  </option>
                ))}
              </select>

              <select
                value={selectedVoiceId}
                onChange={(e) => onVoiceChange(e.target.value)}
                style={selectStyle}
              >
                <option value="">Select voice</option>
                {voices.map((voice) => (
                  <option key={voice.id} value={voice.id}>
                    {voice.name} ({voice.lang})
                  </option>
                ))}
              </select>
            </div>

            <SectionTitle title="Reading Settings" />

            <div style={{ marginBottom: "12px" }}>
              <div style={sliderHeaderStyle}>
                <span>A-</span>
                <span>{fontSize}px</span>
                <span>A+</span>
              </div>
              <input
                type="range"
                min={14}
                max={34}
                step={2}
                value={fontSize}
                onChange={(e) => onFontSizeChange(Number(e.target.value))}
                style={{ width: "100%" }}
              />
            </div>

            <div style={{ marginBottom: "12px" }}>
              <label style={labelStyle}>Line Height: {lineHeight}</label>
              <input
                type="range"
                min={1}
                max={2.5}
                step={0.1}
                value={lineHeight}
                onChange={(e) => onLineHeightChange(Number(e.target.value))}
                style={{ width: "100%" }}
              />
            </div>

            <div style={{ marginBottom: "14px" }}>
              <label style={labelStyle}>
                Paragraph Height: {paragraphSpacing}px
              </label>
              <input
                type="range"
                min={0}
                max={40}
                value={paragraphSpacing}
                onChange={(e) => onParagraphSpacingChange(Number(e.target.value))}
                style={{ width: "100%" }}
              />
            </div>

            <SectionTitle title="Theme" />

            <div style={{ marginBottom: "14px" }}>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={() => onThemeChange("light")}
                  style={{
                    ...chipButtonStyle,
                    borderColor: theme === "light" ? "#93c5fd" : "#3a3a3a",
                    backgroundColor: theme === "light" ? "#1e3a8a" : "#111827",
                  }}
                >
                  Light
                </button>
                <button
                  type="button"
                  onClick={() => onThemeChange("dark")}
                  style={{
                    ...chipButtonStyle,
                    borderColor: theme === "dark" ? "#93c5fd" : "#3a3a3a",
                    backgroundColor: theme === "dark" ? "#1e3a8a" : "#111827",
                  }}
                >
                  Dark
                </button>
              </div>
            </div>

            <div style={{ marginBottom: "14px" }}>
              <label style={labelStyle}>Background (Dark mode only)</label>
              <div style={swatchGridStyle}>
                {BACKGROUND_TONES.map((tone) => {
                  const selected = backgroundTone === tone;

                  return (
                    <button
                      key={tone}
                      type="button"
                      onClick={() => onBackgroundToneChange(tone)}
                      disabled={theme !== "dark"}
                      title={tone}
                      style={{
                        ...swatchButtonStyle,
                        opacity: theme !== "dark" ? 0.45 : 1,
                        borderColor: selected ? "#f8fafc" : "#475569",
                        backgroundColor: swatchColor(tone),
                      }}
                    >
                      {selected ? "✓" : ""}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label style={labelStyle}>Highlight</label>
              <div style={swatchGridStyle}>
                {HIGHLIGHT_COLORS.map((color) => {
                  const selected = highlightColor === color;

                  return (
                    <button
                      key={color}
                      type="button"
                      onClick={() => onHighlightColorChange(color)}
                      title={color}
                      style={{
                        ...swatchButtonStyle,
                        borderColor: selected ? "#f8fafc" : "#475569",
                        backgroundColor: swatchColor(color),
                      }}
                    >
                      {selected ? "✓" : ""}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function SectionTitle({ title }: { title: string }) {
  return (
    <div
      style={{
        fontSize: "13px",
        fontWeight: 700,
        marginBottom: "10px",
        opacity: 0.95,
      }}
    >
      {title}
    </div>
  );
}

const buttonStyle: React.CSSProperties = {
  border: "1px solid #3a3a3a",
  backgroundColor: "#1f1f1f",
  color: "#f5f5f5",
  borderRadius: "10px",
  padding: "10px 12px",
  cursor: "pointer",
  fontWeight: 600,
};

const selectStyle: React.CSSProperties = {
  border: "1px solid #3a3a3a",
  backgroundColor: "#1f1f1f",
  color: "#f5f5f5",
  borderRadius: "10px",
  padding: "10px 12px",
  width: "100%",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "12px",
  marginBottom: "6px",
  opacity: 0.9,
};

const sliderHeaderStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  fontSize: "12px",
  marginBottom: "6px",
  opacity: 0.9,
};

const chipButtonStyle: React.CSSProperties = {
  border: "1px solid #3a3a3a",
  color: "#f8fafc",
  borderRadius: "8px",
  padding: "8px 12px",
  cursor: "pointer",
  fontWeight: 600,
};

const swatchGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(6, 1fr)",
  gap: "8px",
};

const swatchButtonStyle: React.CSSProperties = {
  border: "2px solid #475569",
  color: "#ffffff",
  borderRadius: "8px",
  height: "32px",
  cursor: "pointer",
  fontWeight: 700,
};