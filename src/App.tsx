import { useEffect, useMemo, useState } from "react";
import SectionCard from "./components/common/SectionCard";
import ReaderView from "./components/reader/ReaderView";
import ReaderSettingsPanel from "./components/settings/ReaderSettingsPanel";
import MobileTtsBar from "./components/tts/MobileTtsBar";
import UploadPanel from "./components/upload/UploadPanel";
import PasteTextPanel from "./components/upload/PasteTextPanel";
import PlaybackRateSelect from "./components/tts/PlaybackRateSelect";
import TtsControls from "./components/tts/TtsControls";
import VoiceSelector from "./components/tts/VoiceSelector";
import type {
  ReaderThemeOption,
  ThemeBackgroundOption,
} from "./hooks/useReaderSettings";
import { useReaderSettings } from "./hooks/useReaderSettings";
import { useSpeechSynthesis } from "./hooks/useSpeechSynthesis";
import { useVoices } from "./hooks/useVoices";
import {
  clearReadingProgress,
  loadReadingProgress,
  saveReadingProgress,
} from "./lib/storage/readingProgressStorage";
import { splitIntoParagraphs } from "./lib/speech/splitIntoParagraphs";
import type { Paragraph } from "./types/reader";

function getPageColors(
  theme: ReaderThemeOption,
  backgroundTone: ThemeBackgroundOption
) {
  if (theme === "light") {
    return {
      pageBackground: "#f3f4f6",
      panelBackground: "#ffffff",
      panelBorder: "#d1d5db",
      textColor: "#111827",
      mutedColor: "#374151",
      softPanel: "#f9fafb",
    };
  }

  switch (backgroundTone) {
    case "gray":
      return {
        pageBackground: "#121212",
        panelBackground: "#1f1f1f",
        panelBorder: "#333333",
        textColor: "#f5f5f5",
        mutedColor: "#d1d5db",
        softPanel: "#181818",
      };
    case "darkblue":
      return {
        pageBackground: "#0b1120",
        panelBackground: "#101a35",
        panelBorder: "#243b74",
        textColor: "#e5edff",
        mutedColor: "#bfd0ff",
        softPanel: "#0f1730",
      };
    case "darkgreen":
      return {
        pageBackground: "#06110c",
        panelBackground: "#0d1f17",
        panelBorder: "#1d4533",
        textColor: "#eafff3",
        mutedColor: "#c4f5d7",
        softPanel: "#0a1711",
      };
    case "darkbrown":
      return {
        pageBackground: "#120d0a",
        panelBackground: "#211812",
        panelBorder: "#4a3628",
        textColor: "#fff4ea",
        mutedColor: "#f3d7be",
        softPanel: "#19120d",
      };
    case "darkpurple":
      return {
        pageBackground: "#100915",
        panelBackground: "#1c1127",
        panelBorder: "#493060",
        textColor: "#f7ecff",
        mutedColor: "#e0c8f5",
        softPanel: "#160d1e",
      };
    case "black":
    default:
      return {
        pageBackground: "#000000",
        panelBackground: "#111111",
        panelBorder: "#2a2a2a",
        textColor: "#fafafa",
        mutedColor: "#d4d4d4",
        softPanel: "#0b0b0b",
      };
  }
}

function createDocumentKey(text: string): string {
  const compact = text.replace(/\s+/g, " ").trim();
  return `${compact.length}:${compact.slice(0, 120)}`;
}

export default function App() {
  const [paragraphs, setParagraphs] = useState<Paragraph[]>([]);
  const [selectedVoiceId, setSelectedVoiceId] = useState("");
  const [rate, setRate] = useState(1);
  const [sourceText, setSourceText] = useState("");
  const [savedParagraphIndex, setSavedParagraphIndex] = useState<number | null>(
    null
  );
  const [jumpParagraphInput, setJumpParagraphInput] = useState("");

  const settings = useReaderSettings();
  const voices = useVoices();

  const {
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
  } = useSpeechSynthesis({
    paragraphs,
    voices,
    selectedVoiceId,
    rate,
  });

  const pageColors = useMemo(
    () => getPageColors(settings.theme, settings.backgroundTone),
    [settings.theme, settings.backgroundTone]
  );

  const selectedVoiceLabel = useMemo(() => {
    if (!selectedVoiceId) {
      return "No voice selected";
    }

    return (
      voices.find((voice) => voice.id === selectedVoiceId)?.name ?? "Voice"
    );
  }, [voices, selectedVoiceId]);

  const documentKey = useMemo(() => {
    if (!sourceText.trim()) {
      return "";
    }

    return createDocumentKey(sourceText);
  }, [sourceText]);

  const applyRawText = (text: string) => {
    stop();

    const parsedParagraphs = splitIntoParagraphs(text);
    const nextDocumentKey = createDocumentKey(text);
    const previousSavedIndex = loadReadingProgress(nextDocumentKey);

    const safeSavedIndex =
      previousSavedIndex !== null &&
      previousSavedIndex >= 0 &&
      previousSavedIndex < parsedParagraphs.length
        ? previousSavedIndex
        : null;

    setSourceText(text);
    setParagraphs(parsedParagraphs);
    setSavedParagraphIndex(safeSavedIndex);
    setJumpParagraphInput("");

    // Important: do NOT auto-restore current paragraph on load.
    // This avoids the bad restart/jump loop.
    setCurrentParagraph(null);
  };

  useEffect(() => {
    if (voices.length > 0 && !selectedVoiceId) {
      const samanthaVoice = voices.find((voice) =>
        voice.name.toLowerCase().includes("samantha")
      );

      if (samanthaVoice) {
        setSelectedVoiceId(samanthaVoice.id);
      } else {
        setSelectedVoiceId(voices[0].id);
      }
    }
  }, [voices, selectedVoiceId]);

  useEffect(() => {
    if (!documentKey) {
      return;
    }

    if (currentParagraphIndex !== null) {
      saveReadingProgress(documentKey, currentParagraphIndex);
      setSavedParagraphIndex(currentParagraphIndex);
    }
  }, [documentKey, currentParagraphIndex]);

  const handleResumeSavedProgress = () => {
    if (
      savedParagraphIndex !== null &&
      savedParagraphIndex >= 0 &&
      savedParagraphIndex < paragraphs.length
    ) {
      playFromParagraph(savedParagraphIndex);
    }
  };

  const handleClearSavedProgress = () => {
    if (!documentKey) {
      return;
    }

    stop();
    clearReadingProgress(documentKey);
    setSavedParagraphIndex(null);
    setJumpParagraphInput("");
    setCurrentParagraph(null);
  };

  const handleJumpToParagraph = () => {
    const parsedValue = Number(jumpParagraphInput);

    if (!Number.isInteger(parsedValue)) {
      return;
    }

    const targetIndex = parsedValue - 1;

    if (targetIndex < 0 || targetIndex >= paragraphs.length) {
      return;
    }

    // Important: jump only, do not autoplay.
    // This avoids the crash/reload path you were seeing.
    stop();
    setCurrentParagraph(targetIndex);
  };

  const handleJumpInputKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (event.key === "Enter") {
      event.preventDefault();
      handleJumpToParagraph();
    }
  };

  return (
    <div
      style={{
        padding: "20px",
        paddingBottom: "120px",
        minHeight: "100vh",
        backgroundColor: pageColors.pageBackground,
        color: pageColors.textColor,
      }}
    >
      <div
        style={{
          maxWidth: "1100px",
          margin: "0 auto",
        }}
      >
        <div
          style={{
            marginBottom: "18px",
            padding: "20px",
            backgroundColor: pageColors.panelBackground,
            border: `1px solid ${pageColors.panelBorder}`,
            borderRadius: "14px",
          }}
        >
          <h1 style={{ marginTop: 0, marginBottom: "8px" }}>Reader TTS App</h1>
          <p style={{ margin: 0, color: pageColors.mutedColor }}>
            PDF / DOCX / TXT / pasted text • built-in browser voices • sentence
            highlight • auto-scroll
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gap: "20px",
            alignItems: "start",
          }}
        >
          <div
            style={{
              backgroundColor: pageColors.panelBackground,
              border: `1px solid ${pageColors.panelBorder}`,
              borderRadius: "14px",
              padding: "16px",
            }}
          >
            <SectionCard
              title="Content input"
              subtitle="Paste text or upload a document"
              defaultOpen={true}
            >
              <PasteTextPanel onApply={applyRawText} />
              <div style={{ height: "16px" }} />
              <UploadPanel onApply={applyRawText} />
            </SectionCard>

            <SectionCard
              title="Playback controls"
              subtitle="Voice, speed, play, pause, stop"
              defaultOpen={true}
            >
              <VoiceSelector
                voices={voices}
                selectedVoiceId={selectedVoiceId}
                onChange={setSelectedVoiceId}
              />

              <PlaybackRateSelect value={rate} onChange={setRate} />

              <TtsControls
                status={status}
                onPlay={speak}
                onPause={pause}
                onStop={stop}
              />
            </SectionCard>

            <SectionCard
              title="Jump to paragraph"
              subtitle="Type a paragraph number and jump there"
              defaultOpen={true}
            >
              <div
                style={{
                  display: "flex",
                  gap: "10px",
                  flexWrap: "wrap",
                  alignItems: "center",
                }}
              >
                <input
                  type="number"
                  min={1}
                  max={paragraphs.length || 1}
                  value={jumpParagraphInput}
                  onChange={(e) => setJumpParagraphInput(e.target.value)}
                  onKeyDown={handleJumpInputKeyDown}
                  placeholder="Paragraph number"
                  style={{
                    border: "1px solid #4b5563",
                    backgroundColor: "#111827",
                    color: "#f9fafb",
                    borderRadius: "8px",
                    padding: "10px 12px",
                    width: "180px",
                  }}
                />

                <button
                  type="button"
                  onClick={handleJumpToParagraph}
                  style={panelButtonStyle}
                  disabled={paragraphs.length === 0}
                >
                  Jump
                </button>
              </div>

              <p style={{ marginTop: "10px", color: pageColors.mutedColor }}>
                Total paragraphs: {paragraphs.length}
              </p>
            </SectionCard>

            <SectionCard
              title="Reader settings"
              subtitle="Theme, layout, spacing, highlight color"
              defaultOpen={false}
            >
              <ReaderSettingsPanel
                fontSize={settings.fontSize}
                setFontSize={settings.setFontSize}
                lineHeight={settings.lineHeight}
                setLineHeight={settings.setLineHeight}
                paragraphSpacing={settings.paragraphSpacing}
                setParagraphSpacing={settings.setParagraphSpacing}
                maxWidth={settings.maxWidth}
                setMaxWidth={settings.setMaxWidth}
                textAlign={settings.textAlign}
                setTextAlign={settings.setTextAlign}
                theme={settings.theme}
                setTheme={settings.setTheme}
                backgroundTone={settings.backgroundTone}
                setBackgroundTone={settings.setBackgroundTone}
                highlightColor={settings.highlightColor}
                setHighlightColor={settings.setHighlightColor}
              />
            </SectionCard>

            <SectionCard
              title="Reading progress"
              subtitle="Resume or clear saved progress for current document"
              defaultOpen={savedParagraphIndex !== null}
            >
              {savedParagraphIndex !== null && paragraphs.length > 0 ? (
                <div>
                  <p style={{ marginTop: 0 }}>
                    Saved progress found at paragraph {savedParagraphIndex + 1}.
                  </p>

                  <div
                    style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}
                  >
                    <button
                      type="button"
                      onClick={handleResumeSavedProgress}
                      style={panelButtonStyle}
                    >
                      Resume from saved progress
                    </button>

                    <button
                      type="button"
                      onClick={handleClearSavedProgress}
                      style={panelButtonStyle}
                    >
                      Clear saved progress
                    </button>
                  </div>
                </div>
              ) : (
                <p style={{ margin: 0, color: pageColors.mutedColor }}>
                  No saved progress for the current document yet.
                </p>
              )}
            </SectionCard>
          </div>

          <div
            style={{
              backgroundColor: pageColors.softPanel,
              border: `1px solid ${pageColors.panelBorder}`,
              borderRadius: "14px",
              padding: "16px",
            }}
          >
            <div
              style={{
                marginBottom: "12px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "12px",
                flexWrap: "wrap",
              }}
            >
              <h2 style={{ margin: 0 }}>Reader</h2>

              <div
                style={{
                  color: pageColors.mutedColor,
                  fontSize: "14px",
                }}
              >
                {paragraphs.length} paragraphs • {selectedVoiceLabel} • {rate}x
              </div>
            </div>

            <ReaderView
              paragraphs={paragraphs}
              currentParagraphIndex={currentParagraphIndex}
              currentSentenceIndex={currentSentenceIndex}
              fontSize={settings.fontSize}
              lineHeight={settings.lineHeight}
              paragraphSpacing={settings.paragraphSpacing}
              maxWidth={settings.maxWidth}
              textAlign={settings.textAlign}
              theme={settings.theme}
              backgroundTone={settings.backgroundTone}
              highlightColor={settings.highlightColor}
              onParagraphSelect={playFromParagraph}
            />
          </div>
        </div>
      </div>

      <MobileTtsBar
        status={status}
        currentParagraphIndex={currentParagraphIndex}
        totalParagraphs={paragraphs.length}
        selectedVoiceId={selectedVoiceId}
        selectedVoiceLabel={selectedVoiceLabel}
        voices={voices}
        rate={rate}
        onRateChange={setRate}
        onVoiceChange={setSelectedVoiceId}
        onPlay={speak}
        onPause={pause}
        onStop={stop}
        onPrevious={goToPreviousParagraph}
        onNext={goToNextParagraph}
        fontSize={settings.fontSize}
        onFontSizeChange={settings.setFontSize}
        lineHeight={settings.lineHeight}
        onLineHeightChange={settings.setLineHeight}
        paragraphSpacing={settings.paragraphSpacing}
        onParagraphSpacingChange={settings.setParagraphSpacing}
        theme={settings.theme}
        onThemeChange={settings.setTheme}
        backgroundTone={settings.backgroundTone}
        onBackgroundToneChange={settings.setBackgroundTone}
        highlightColor={settings.highlightColor}
        onHighlightColorChange={settings.setHighlightColor}
      />
    </div>
  );
}

const panelButtonStyle: React.CSSProperties = {
  border: "1px solid #4b5563",
  backgroundColor: "#1f2937",
  color: "#f9fafb",
  borderRadius: "8px",
  padding: "10px 12px",
  cursor: "pointer",
  fontWeight: 600,
};