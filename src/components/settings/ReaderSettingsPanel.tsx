import type {
  HighlightColorOption,
  ReaderThemeOption,
  TextAlignOption,
  ThemeBackgroundOption,
} from "../../hooks/useReaderSettings";

type Props = {
  fontSize: number;
  setFontSize: (value: number) => void;
  lineHeight: number;
  setLineHeight: (value: number) => void;
  paragraphSpacing: number;
  setParagraphSpacing: (value: number) => void;
  maxWidth: number;
  setMaxWidth: (value: number) => void;
  textAlign: TextAlignOption;
  setTextAlign: (value: TextAlignOption) => void;
  theme: ReaderThemeOption;
  setTheme: (value: ReaderThemeOption) => void;
  backgroundTone: ThemeBackgroundOption;
  setBackgroundTone: (value: ThemeBackgroundOption) => void;
  highlightColor: HighlightColorOption;
  setHighlightColor: (value: HighlightColorOption) => void;
};

const backgroundToneOptions: ThemeBackgroundOption[] = [
  "black",
  "gray",
  "darkblue",
  "darkgreen",
  "darkbrown",
  "darkpurple",
];

const highlightColorOptions: HighlightColorOption[] = [
  "green",
  "blue",
  "purple",
  "orange",
  "pink",
  "gray",
];

export default function ReaderSettingsPanel({
  fontSize,
  setFontSize,
  lineHeight,
  setLineHeight,
  paragraphSpacing,
  setParagraphSpacing,
  maxWidth,
  setMaxWidth,
  textAlign,
  setTextAlign,
  theme,
  setTheme,
  backgroundTone,
  setBackgroundTone,
  highlightColor,
  setHighlightColor,
}: Props) {
  return (
    <div style={{ marginBottom: "20px" }}>
      <h3>Reader Settings</h3>

      <div style={{ marginBottom: "12px" }}>
        <label
          style={{
            display: "block",
            marginBottom: "6px",
            fontWeight: 600,
          }}
        >
          Theme
        </label>
        <select
          value={theme}
          onChange={(e) => setTheme(e.target.value as ReaderThemeOption)}
          style={{ width: "100%", padding: "8px" }}
        >
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </select>
      </div>

      <div style={{ marginBottom: "12px" }}>
        <label
          style={{
            display: "block",
            marginBottom: "6px",
            fontWeight: 600,
          }}
        >
          Background Tone
        </label>
        <select
          value={backgroundTone}
          onChange={(e) =>
            setBackgroundTone(e.target.value as ThemeBackgroundOption)
          }
          style={{ width: "100%", padding: "8px" }}
          disabled={theme !== "dark"}
        >
          {backgroundToneOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>

      <div style={{ marginBottom: "12px" }}>
        <label
          style={{
            display: "block",
            marginBottom: "6px",
            fontWeight: 600,
          }}
        >
          Highlight Color
        </label>
        <select
          value={highlightColor}
          onChange={(e) =>
            setHighlightColor(e.target.value as HighlightColorOption)
          }
          style={{ width: "100%", padding: "8px" }}
        >
          {highlightColorOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>

      <div style={{ marginBottom: "12px" }}>
        <label
          style={{
            display: "block",
            marginBottom: "6px",
            fontWeight: 600,
          }}
        >
          Font Size: {fontSize}px
        </label>
        <input
          type="range"
          min={14}
          max={30}
          value={fontSize}
          onChange={(e) => setFontSize(Number(e.target.value))}
          style={{ width: "100%" }}
        />
      </div>

      <div style={{ marginBottom: "12px" }}>
        <label
          style={{
            display: "block",
            marginBottom: "6px",
            fontWeight: 600,
          }}
        >
          Line Height: {lineHeight}
        </label>
        <input
          type="range"
          min={1}
          max={2.5}
          step={0.1}
          value={lineHeight}
          onChange={(e) => setLineHeight(Number(e.target.value))}
          style={{ width: "100%" }}
        />
      </div>

      <div style={{ marginBottom: "12px" }}>
        <label
          style={{
            display: "block",
            marginBottom: "6px",
            fontWeight: 600,
          }}
        >
          Paragraph Spacing: {paragraphSpacing}px
        </label>
        <input
          type="range"
          min={0}
          max={40}
          value={paragraphSpacing}
          onChange={(e) => setParagraphSpacing(Number(e.target.value))}
          style={{ width: "100%" }}
        />
      </div>

      <div style={{ marginBottom: "12px" }}>
        <label
          style={{
            display: "block",
            marginBottom: "6px",
            fontWeight: 600,
          }}
        >
          Width: {maxWidth}px
        </label>
        <input
          type="range"
          min={400}
          max={1000}
          value={maxWidth}
          onChange={(e) => setMaxWidth(Number(e.target.value))}
          style={{ width: "100%" }}
        />
      </div>

      <div style={{ marginBottom: "12px" }}>
        <label
          style={{
            display: "block",
            marginBottom: "6px",
            fontWeight: 600,
          }}
        >
          Alignment
        </label>
        <select
          value={textAlign}
          onChange={(e) => setTextAlign(e.target.value as TextAlignOption)}
          style={{ width: "100%", padding: "8px" }}
        >
          <option value="left">Left</option>
          <option value="center">Center</option>
          <option value="right">Right</option>
          <option value="justify">Justify</option>
        </select>
      </div>
    </div>
  );
}