import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import type { useReaderSettings } from "../../hooks/useReaderSettings";

type Props = {
  settings: ReturnType<typeof useReaderSettings>;
  onClose: () => void;
};

export default function ReaderAppearanceSheet({ settings, onClose }: Props) {
  const closeButton = useRef<HTMLButtonElement>(null);
  const sheet = useRef<HTMLElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeButton.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCloseRef.current();
      if (event.key !== "Tab" || !sheet.current) return;
      const focusable = Array.from(sheet.current.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled)')).filter(element => element.getClientRects().length > 0);
      const first = focusable[0]; const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => { window.removeEventListener("keydown", onKeyDown); previousFocus?.focus(); };
  }, []);

  function resetAppearance() {
    settings.setFontSize(18);
    settings.setLineHeight(1.7);
    settings.setParagraphSpacing(16);
    settings.setMaxWidth(800);
    settings.setTextAlign("left");
  }

  return <div className="modal-backdrop" onClick={onClose}>
    <section ref={sheet} className="sheet settings-sheet" role="dialog" aria-modal="true" aria-labelledby="settings-title" aria-describedby="settings-description" onClick={event => event.stopPropagation()}>
      <div className="sheet-header"><h2 id="settings-title">Reading appearance</h2><button ref={closeButton} className="icon-button" type="button" onClick={onClose} aria-label="Close reading appearance"><X size={20}/></button></div>
      <p id="settings-description" className="appearance-intro">Set a comfortable pace for your eyes. Changes appear on the page as you adjust them.</p>
      <div className="appearance-control">
        <div className="appearance-control-label"><label htmlFor="reader-font-size">Text size</label><strong>{settings.fontSize}px</strong></div>
        <div className="appearance-stepper"><button type="button" onClick={() => settings.setFontSize(Math.max(15, settings.fontSize - 1))} disabled={settings.fontSize <= 15} aria-label="Decrease text size">A−</button><input id="reader-font-size" type="range" min="15" max="30" value={settings.fontSize} onChange={event => settings.setFontSize(Number(event.target.value))}/><button type="button" onClick={() => settings.setFontSize(Math.min(30, settings.fontSize + 1))} disabled={settings.fontSize >= 30} aria-label="Increase text size">A+</button></div>
      </div>
      <div className="appearance-control"><div className="appearance-control-label"><label htmlFor="reader-line-height">Line spacing</label><strong>{settings.lineHeight.toFixed(1)}</strong></div><input id="reader-line-height" type="range" min="1.3" max="2.2" step="0.1" value={settings.lineHeight} onChange={event => settings.setLineHeight(Number(event.target.value))}/></div>
      <div className="appearance-control"><div className="appearance-control-label"><label htmlFor="reader-paragraph-space">Paragraph spacing</label><strong>{settings.paragraphSpacing}px</strong></div><input id="reader-paragraph-space" type="range" min="8" max="36" step="2" value={settings.paragraphSpacing} onChange={event => settings.setParagraphSpacing(Number(event.target.value))}/></div>
      <div className="appearance-control appearance-width"><div className="appearance-control-label"><label htmlFor="reader-width">Reading width</label><strong>{settings.maxWidth}px</strong></div><input id="reader-width" type="range" min="480" max="900" step="20" value={settings.maxWidth} onChange={event => settings.setMaxWidth(Number(event.target.value))}/></div>
      <div className="appearance-actions"><button className="secondary-button" type="button" onClick={resetAppearance}>Reset</button><button className="primary-button" type="button" onClick={onClose}>Done</button></div>
    </section>
  </div>;
}
