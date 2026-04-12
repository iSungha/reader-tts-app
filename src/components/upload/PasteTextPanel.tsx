import { useState } from "react";

type Props = {
  onApply: (text: string) => void;
};

export default function PasteTextPanel({ onApply }: Props) {
  const [text, setText] = useState("");

  return (
    <div>
      <label
        htmlFor="paste-text"
        style={{
          display: "block",
          fontWeight: 600,
          marginBottom: "8px",
        }}
      >
        Paste text
      </label>

      <textarea
        id="paste-text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Paste your chapter or document text here..."
        style={{
          width: "100%",
          minHeight: "180px",
          padding: "12px",
          borderRadius: "10px",
          border: "1px solid #4b5563",
          backgroundColor: "#111827",
          color: "#f9fafb",
          resize: "vertical",
          marginBottom: "12px",
        }}
      />

      <button
        type="button"
        onClick={() => onApply(text)}
        style={buttonStyle}
      >
        Apply pasted text
      </button>
    </div>
  );
}

const buttonStyle: React.CSSProperties = {
  border: "1px solid #4b5563",
  backgroundColor: "#1f2937",
  color: "#f9fafb",
  borderRadius: "8px",
  padding: "10px 12px",
  cursor: "pointer",
  fontWeight: 600,
};