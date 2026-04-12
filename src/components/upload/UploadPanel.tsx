import { useState } from "react";
import { useDocumentParser } from "../../hooks/useDocumentParser";

type Props = {
  onApply: (text: string) => void;
};

export default function UploadPanel({ onApply }: Props) {
  const [fileName, setFileName] = useState("");
  const { status, error, parseFile } = useDocumentParser();

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setFileName(file.name);

    const parsed = await parseFile(file);

    if (parsed) {
      onApply(parsed.text);
    }

    event.target.value = "";
  };

  return (
    <div>
      <label
        htmlFor="upload-file"
        style={{
          display: "block",
          fontWeight: 600,
          marginBottom: "8px",
        }}
      >
        Upload file
      </label>

      <input
        id="upload-file"
        type="file"
        accept=".txt,.pdf,.docx"
        onChange={handleFileChange}
        style={{ marginBottom: "12px" }}
      />

      <p style={{ marginTop: 0 }}>
        Supported: <strong>.txt</strong>, <strong>.pdf</strong>, <strong>.docx</strong>
      </p>

      {fileName ? (
        <p>
          <strong>Selected file:</strong> {fileName}
        </p>
      ) : null}

      <p>
        <strong>Parser status:</strong> {status}
      </p>

      {status === "loading" ? (
        <p style={{ color: "#93c5fd" }}>
          Reading file...
        </p>
      ) : null}

      {error ? (
        <p style={{ color: "#f87171" }}>
          <strong>Error:</strong> {error}
        </p>
      ) : null}
    </div>
  );
}