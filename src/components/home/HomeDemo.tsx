import { useEffect, useRef, useState } from "react";
import { BookOpen, ChevronDown, Headphones, Pause, Play, RotateCcw, SkipBack, SkipForward, Square } from "lucide-react";
import type { VoiceOption } from "../../types/tts";

const sampleLines = [
  "A quieter way to read",
  "Some words are easier to take with you. They wait on the page while the rest of your day moves around them.",
  "Imagine finding a story in the morning, just before you leave. You read a few lines with your coffee, then the train arrives and the page has to close.",
  "You do not have to leave the story there. Press play, let a voice carry the next paragraph, and keep your place as the words move forward.",
  "When a sentence catches your attention, pause. Look back at it. Start again from the passage you want to hear.",
  "Choose a voice that feels comfortable. Slow the pace for a difficult idea, or let it run a little faster when you know the rhythm of the text.",
  "Later, when you have a quiet moment, return to reading. The words are still here, ready for your eyes or your ears.",
  "Keep the page close. Let the story move with you.",
];

const rateOptions = [0.7, 0.85, 1, 1.15, 1.2, 1.3, 1.5, 1.75, 2];
type DemoStatus = "idle" | "playing" | "paused" | "finished" | "unsupported";

type Props = {
  onStart: () => void;
  onActivityChange: (active: boolean) => void;
  voices: VoiceOption[];
  selectedVoiceId: string;
  onVoiceChange: (id: string) => void;
  rate: number;
  onRateChange: (rate: number) => void;
};

export default function HomeDemo({ onStart, onActivityChange, voices, selectedVoiceId, onVoiceChange, rate, onRateChange }: Props) {
  const [status, setStatus] = useState<DemoStatus>("idle");
  const [activeLine, setActiveLine] = useState<number | null>(null);
  const [controlsOpen, setControlsOpen] = useState(false);
  const generation = useRef(0);
  const ownsSpeech = useRef(false);
  const settingsChangedWhilePaused = useRef(false);
  const speechSettings = useRef({ voice: voices.find(item => item.id === selectedVoiceId)?.voice, rate });
  const pageRef = useRef<HTMLDivElement>(null);
  const lineRefs = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    speechSettings.current = { voice: voices.find(item => item.id === selectedVoiceId)?.voice, rate };
  }, [voices, selectedVoiceId, rate]);

  useEffect(() => () => {
    generation.current += 1;
    if (ownsSpeech.current) window.speechSynthesis?.cancel();
    onActivityChange(false);
  }, [onActivityChange]);

  useEffect(() => {
    if (activeLine === null || !pageRef.current) return;
    const line = lineRefs.current[activeLine];
    if (!line) return;
    pageRef.current.scrollTo({ top: Math.max(0, line.offsetTop - 30), behavior: "smooth" });
  }, [activeLine]);

  function playLine(index: number, token: number) {
    if (token !== generation.current) return;
    if (index >= sampleLines.length) {
      ownsSpeech.current = false;
      onActivityChange(false);
      setActiveLine(null);
      setStatus("finished");
      return;
    }

    const utterance = new SpeechSynthesisUtterance(sampleLines[index]);
    const { voice, rate: currentRate } = speechSettings.current;
    if (voice) { utterance.voice = voice; utterance.lang = voice.lang; }
    utterance.rate = currentRate;
    utterance.onstart = () => {
      if (token === generation.current) { setActiveLine(index); setStatus("playing"); }
    };
    utterance.onend = () => playLine(index + 1, token);
    utterance.onerror = () => {
      if (token !== generation.current) return;
      ownsSpeech.current = false;
      onActivityChange(false);
      setActiveLine(null);
      setStatus("idle");
    };
    window.speechSynthesis.speak(utterance);
  }

  function startFrom(index: number) {
    if (!("speechSynthesis" in window) || !("SpeechSynthesisUtterance" in window)) {
      setStatus("unsupported");
      return;
    }
    if (!ownsSpeech.current) onStart();
    generation.current += 1;
    window.speechSynthesis.cancel();
    ownsSpeech.current = true;
    settingsChangedWhilePaused.current = false;
    onActivityChange(true);
    setActiveLine(index);
    setStatus("playing");
    playLine(index, generation.current);
  }

  function stop() {
    generation.current += 1;
    window.speechSynthesis.cancel();
    ownsSpeech.current = false;
    settingsChangedWhilePaused.current = false;
    onActivityChange(false);
    setActiveLine(null);
    setStatus("idle");
  }

  function togglePlayback() {
    if (status === "playing") {
      window.speechSynthesis.pause();
      setStatus("paused");
    } else if (status === "paused" && !settingsChangedWhilePaused.current) {
      window.speechSynthesis.resume();
      setStatus("playing");
    } else {
      startFrom(status === "paused" ? activeLine ?? 0 : 0);
    }
  }

  function changeVoice(id: string) {
    speechSettings.current.voice = voices.find(item => item.id === id)?.voice;
    onVoiceChange(id);
    if (status === "playing") startFrom(activeLine ?? 0);
    if (status === "paused") settingsChangedWhilePaused.current = true;
  }

  function changeRate(nextRate: number) {
    speechSettings.current.rate = nextRate;
    onRateChange(nextRate);
    if (status === "playing") startFrom(activeLine ?? 0);
    if (status === "paused") settingsChangedWhilePaused.current = true;
  }

  const buttonLabel = status === "playing" ? "Pause sample" : status === "paused" ? "Resume sample" : status === "finished" ? "Replay sample" : "Play sample";
  const statusLabel = status === "playing" ? "Playing sample" : status === "paused" ? "Sample paused" : status === "finished" ? "Sample finished" : status === "unsupported" ? "Speech is unavailable in this browser" : "Tap play to try it";
  const currentIndex = activeLine ?? 0;

  return <section className="home-preview" aria-label="Try a sample quick listen">
    <div className="home-preview-top"><span><BookOpen size={15} aria-hidden="true"/> folio.</span><span>Listening preview</span></div>
    <div className="home-preview-page" ref={pageRef}>
      <h2 ref={element => { lineRefs.current[0] = element; }} className={activeLine === 0 ? "sample-active" : ""}>{sampleLines[0]}</h2>
      {sampleLines.slice(1).map((line, index) => <p ref={element => { lineRefs.current[index + 1] = element; }} key={line} className={activeLine === index + 1 ? "sample-active" : ""}>{line}</p>)}
    </div>
    <div className="home-preview-progress" aria-hidden="true"><span style={{ width: `${activeLine === null ? status === "finished" ? 100 : 0 : ((activeLine + 1) / sampleLines.length) * 100}%` }}/></div>
    <div className="home-preview-controls" id="sample-controls" hidden={!controlsOpen}>
      <div className="home-preview-controls-heading"><strong>Playback controls</strong><span>Passage {currentIndex + 1} of {sampleLines.length}</span></div>
      <div className="home-preview-transport">
        <button type="button" onClick={() => startFrom(Math.max(0, currentIndex - 1))} aria-label="Previous passage" disabled={status === "unsupported"}><SkipBack size={21}/></button>
        <button className="home-preview-transport-main" type="button" onClick={togglePlayback} aria-label={buttonLabel} disabled={status === "unsupported"}>{status === "playing" ? <Pause size={23} fill="currentColor"/> : <Play size={23} fill="currentColor"/>}</button>
        <button type="button" onClick={() => startFrom(Math.min(sampleLines.length - 1, currentIndex + 1))} aria-label="Next passage" disabled={status === "unsupported"}><SkipForward size={21}/></button>
        <button type="button" onClick={stop} aria-label="Stop sample" disabled={status !== "playing" && status !== "paused"}><Square size={17}/></button>
      </div>
      <div className="home-preview-options">
        <label>Voice<select value={selectedVoiceId} onChange={event => changeVoice(event.target.value)}><option value="">Browser default</option>{voices.map(item => <option key={item.id} value={item.id}>{item.name} ({item.lang})</option>)}</select></label>
        <label>Speed<select value={rate} onChange={event => changeRate(Number(event.target.value))}>{rateOptions.map(value => <option key={value} value={value}>{value}×</option>)}</select></label>
      </div>
    </div>
    <div className="home-preview-player">
      <button className="home-preview-expand" type="button" onClick={() => setControlsOpen(value => !value)} aria-expanded={controlsOpen} aria-controls="sample-controls" aria-label={controlsOpen ? "Collapse sample controls" : "Expand sample controls"}>
        <span className="home-preview-audio"><Headphones size={17} aria-hidden="true"/></span>
        <span><strong>A quieter way to read</strong><small role="status">{statusLabel}</small></span>
        <ChevronDown className={controlsOpen ? "chevron-open" : ""} size={17} aria-hidden="true"/>
      </button>
      <button className="home-preview-play" type="button" onClick={togglePlayback} aria-label={buttonLabel} title={buttonLabel}>
        {status === "playing" ? <Pause size={17} fill="currentColor" aria-hidden="true"/> : status === "finished" ? <RotateCcw size={17} aria-hidden="true"/> : <Play size={17} fill="currentColor" aria-hidden="true"/>}
      </button>
    </div>
  </section>;
}
