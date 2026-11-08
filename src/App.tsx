import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, BookOpen, ChevronDown, ChevronRight, FolderClosed, FolderInput, Headphones, MoreHorizontal, Pause, Play, Plus, Settings2, SkipBack, SkipForward, Square, Trash2, Upload, X } from "lucide-react";
import ReaderView from "./components/reader/ReaderView";
import { useDocumentParser } from "./hooks/useDocumentParser";
import { useReaderSettings } from "./hooks/useReaderSettings";
import { useSpeechSynthesis } from "./hooks/useSpeechSynthesis";
import { useVoices } from "./hooks/useVoices";
import { addBook, createFolder, deleteBook, getBookContent, hashBlob, listBooks, listFolders, removeFolder, renameFolder, requestPersistentStorage, updateBook, type Book, type BookFolder } from "./lib/storage/libraryStorage";
import { loadReadingProgress } from "./lib/storage/readingProgressStorage";
import { splitIntoParagraphs } from "./lib/speech/splitIntoParagraphs";
import { paragraphOffsets, percentOfText, textPosition } from "./lib/textProgress";
import type { DocumentSource } from "./types/document";
import type { Paragraph } from "./types/reader";
import "./styles.css";
import "./premium.css";

const defaultProgress = { readingIndex: 0, paragraphIndex: 0, sentenceIndex: 0, voiceId: "", rate: 1, percent: 0, coveredChars: 0 };
const typeLabels: Record<DocumentSource, string> = { txt: "Text", pdf: "PDF", docx: "Word", paste: "Pasted text" };

function cleanTitle(name: string) { return name.replace(/\.(txt|pdf|docx)$/i, "").replace(/[_-]+/g, " ").trim() || "Untitled"; }
function dateLabel(timestamp: number) { return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(timestamp); }
function storageMessage(error: unknown) {
  if (error instanceof DOMException && error.name === "QuotaExceededError") return "Browser storage is full. Free some site storage, then try again. Your existing files are still here.";
  return error instanceof Error ? error.message : "The library could not be saved. Please try again.";
}

function folderPercent(items: Book[]): number {
  return percentOfText(items.reduce((total, item) => total + (item.progress.coveredChars ?? 0), 0),
    items.reduce((total, item) => total + (item.textLength ?? 0), 0));
}

function BookRow({ item, busy, onOpen, onRename, onMove, onDelete }: {
  item: Book; busy: boolean; onOpen: () => void; onRename: () => void; onMove?: () => void; onDelete: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  return <article className="book-row"><button className="book-open" onClick={onOpen} disabled={busy}>
    <span className={`book-cover ${item.kind === "quick" ? "quick-cover" : `cover-${item.source}`}`}>{item.kind === "quick" ? <Headphones size={23} strokeWidth={1.5}/> : <BookOpen size={23} strokeWidth={1.5}/>}</span>
    <span className="book-details"><strong>{item.title}</strong><span>{item.kind === "quick" ? "Quick listen" : typeLabels[item.source]} · Opened {dateLabel(item.lastOpenedAt)}</span>
      <span className="row-progress"><span style={{ width: `${item.progress.percent}%` }}/></span><small>{item.progress.percent}% of text</small></span>
  </button><div className="book-actions"><button className="icon-button" onClick={() => setMenuOpen(value => !value)} aria-label={`More options for ${item.title}`} aria-expanded={menuOpen}><MoreHorizontal size={20}/></button>{menuOpen ? <div className="book-menu">{onMove ? <button onClick={() => { setMenuOpen(false); onMove(); }}><FolderInput size={17}/> Move to folder</button> : null}<button onClick={() => { setMenuOpen(false); onRename(); }}><MoreHorizontal size={17}/> Rename</button><button className="danger" onClick={() => { setMenuOpen(false); onDelete(); }}><Trash2 size={17}/> Delete</button></div> : null}</div></article>;
}

export default function App() {
  const [books, setBooks] = useState<Book[]>([]);
  const [folders, setFolders] = useState<BookFolder[]>([]);
  const [book, setBook] = useState<Book | null>(null);
  const [paragraphs, setParagraphs] = useState<Paragraph[]>([]);
  const [screen, setScreen] = useState<"home" | "library" | "folder" | "reader">("home");
  const [folderId, setFolderId] = useState<string | null>(null);
  const [returnFolderId, setReturnFolderId] = useState<string | null>(null);
  const [returnScreen, setReturnScreen] = useState<"home" | "library" | "folder">("home");
  const [uploadFolderId, setUploadFolderId] = useState<string | null>(null);
  const [uploadKind, setUploadKind] = useState<"book" | "quick">("book");
  const [folderDialog, setFolderDialog] = useState<"create" | "rename" | null>(null);
  const [folderName, setFolderName] = useState("");
  const [moveBookId, setMoveBookId] = useState<string | null>(null);
  const [moveFolderId, setMoveFolderId] = useState("");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [playerOpen, setPlayerOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [selectedVoiceId, setSelectedVoiceId] = useState("");
  const [rate, setRate] = useState(1);
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameTitle, setRenameTitle] = useState("");
  const [readingIndex, setReadingIndex] = useState(0);
  const fileInput = useRef<HTMLInputElement>(null);
  const activeBookId = useRef<string | null>(null);
  const completionSeen = useRef(0);
  const settings = useReaderSettings();
  const voices = useVoices();
  const parser = useDocumentParser();
  const speech = useSpeechSynthesis({ paragraphs, voices, selectedVoiceId, rate });
  const offsets = useMemo(() => paragraphOffsets(paragraphs), [paragraphs]);
  const textLength = offsets[offsets.length - 1];
  const selectedFolder = folders.find(folder => folder.id === folderId);
  const libraryBooks = books.filter(item => item.kind !== "quick");
  const quickItems = books.filter(item => item.kind === "quick");
  const unfiledBooks = libraryBooks.filter(item => !item.folderId);
  const chapters = useMemo(() => paragraphs.flatMap((paragraph, index) => /^(chapter|part|prologue|epilogue)\b|^第.{1,12}章/i.test(paragraph.text.trim()) && paragraph.text.length < 110 ? [{ index, title: paragraph.text.trim() }] : []), [paragraphs]);

  const refreshBooks = async () => setBooks(await listBooks());
  const refreshFolders = async () => setFolders(await listFolders());
  useEffect(() => {
    let mounted = true;
    void listBooks().then(items => { if (mounted) setBooks(items); }).catch(error => { if (mounted) setNotice(storageMessage(error)); });
    void listFolders().then(items => { if (mounted) setFolders(items); }).catch(error => { if (mounted) setNotice(storageMessage(error)); });
    void requestPersistentStorage();
    return () => { mounted = false; };
  }, []);
  useEffect(() => {
    if (voices.length && !selectedVoiceId) setSelectedVoiceId(voices.find(voice => voice.name.toLowerCase().includes("samantha"))?.id ?? voices[0].id);
  }, [voices, selectedVoiceId]);
  useEffect(() => {
    if (book && selectedVoiceId && book.progress.voiceId !== selectedVoiceId) {
      void updateBook(book.id, { progress: { voiceId: selectedVoiceId } }).catch(error => setNotice(storageMessage(error)));
    }
  }, [book, selectedVoiceId]);
  useEffect(() => {
    const id = activeBookId.current;
    if (!id || speech.currentParagraphIndex === null) return;
    const coveredChars = textPosition(paragraphs, offsets, speech.currentParagraphIndex, speech.currentSentenceIndex ?? 0);
    void updateBook(id, { progress: { paragraphIndex: speech.currentParagraphIndex, sentenceIndex: speech.currentSentenceIndex ?? 0, coveredChars } }).then(updated => setBooks(items => items.map(item => item.id === id ? updated : item))).catch(error => setNotice(storageMessage(error)));
  }, [speech.currentParagraphIndex, speech.currentSentenceIndex, paragraphs, offsets]);
  useEffect(() => {
    if (speech.completionTick === completionSeen.current) return;
    completionSeen.current = speech.completionTick;
    const id = activeBookId.current;
    if (!id || speech.completionTick === 0) return;
    void updateBook(id, { progress: { coveredChars: textLength } }).then(updated => setBooks(items => items.map(item => item.id === id ? updated : item))).catch(error => setNotice(storageMessage(error)));
  }, [speech.completionTick, textLength]);
  useEffect(() => {
    const save = () => {
      if (!activeBookId.current || !book) return;
      const coveredChars = Math.max(book.progress.coveredChars ?? 0,
        offsets[Math.max(0, Math.min(readingIndex, paragraphs.length))] ?? 0,
        textPosition(paragraphs, offsets, speech.currentParagraphIndex ?? book.progress.paragraphIndex, speech.currentSentenceIndex ?? book.progress.sentenceIndex));
      void updateBook(activeBookId.current, { progress: { readingIndex, paragraphIndex: speech.currentParagraphIndex ?? book.progress.paragraphIndex, sentenceIndex: speech.currentSentenceIndex ?? book.progress.sentenceIndex, voiceId: selectedVoiceId, rate, coveredChars } }).catch(() => undefined);
    };
    window.addEventListener("pagehide", save);
    return () => window.removeEventListener("pagehide", save);
  }, [book, readingIndex, speech.currentParagraphIndex, speech.currentSentenceIndex, selectedVoiceId, rate, offsets, paragraphs]);

  function coveredCharsForCurrent() {
    return Math.max(book?.progress.coveredChars ?? 0,
      offsets[Math.max(0, Math.min(readingIndex, paragraphs.length))] ?? 0,
      textPosition(paragraphs, offsets, speech.currentParagraphIndex ?? book?.progress.paragraphIndex ?? 0, speech.currentSentenceIndex ?? book?.progress.sentenceIndex ?? 0));
  }

  async function openBook(item: Book, resume = false) {
    try {
      setBusy(true); setNotice(""); speech.stop(); await saveCurrentProgress(); activeBookId.current = null;
      const fresh = (await listBooks()).find(entry => entry.id === item.id) ?? item;
      const content = await getBookContent(item.id);
      if (!content) throw new Error("This book's file is missing from browser storage.");
      const parsed = splitIntoParagraphs(content.text);
      const saved = Math.max(0, Math.min(fresh.progress.paragraphIndex, parsed.length - 1));
      setParagraphs(parsed); setBook(fresh); setReadingIndex(Math.max(0, Math.min(fresh.progress.readingIndex, parsed.length - 1)));
      setSelectedVoiceId(fresh.progress.voiceId); setRate(fresh.progress.rate || 1);
      speech.restorePosition(saved, fresh.progress.sentenceIndex);
      activeBookId.current = item.id;
      setReturnScreen(screen === "reader" ? (fresh.kind === "quick" ? "home" : "library") : screen);
      setReturnFolderId(screen === "folder" && fresh.folderId === folderId ? folderId : null);
      setScreen("reader"); setUploadOpen(false); setPlayerOpen(false);
      await updateBook(item.id, { lastOpenedAt: Date.now() });
      await refreshBooks();
      if (resume) setNotice("Ready to resume. Tap Play to start listening.");
    } catch (error) { setNotice(storageMessage(error)); }
    finally { setBusy(false); }
  }

  async function addDocument(blob: Blob, fileName: string, source: DocumentSource, text: string, openAfter = true) {
    if (!text.trim()) { setNotice("No readable text was found in that document."); return; }
    try {
      setBusy(true); setNotice("");
      const digest = await hashBlob(blob);
      const id = uploadKind === "quick" ? `quick:${digest}` : digest;
      const existing = books.find(item => item.id === id);
      if (existing) {
        if (uploadFolderId && !existing.folderId) {
          await updateBook(existing.id, { folderId: uploadFolderId });
          await refreshBooks();
        }
        if (openAfter) await openBook(existing);
        else setUploadOpen(false);
        setNotice(uploadKind === "quick" ? "Already in your quick listens. Opening your saved copy." : uploadFolderId && existing.folderId && existing.folderId !== uploadFolderId
          ? "This file is already in another folder. Use Move to organize it."
          : openAfter ? "Already in your library. Opening your saved copy." : "This file is already in your library.");
        return;
      }
      const parsed = splitIntoParagraphs(text);
      const newOffsets = paragraphOffsets(parsed);
      const legacyKey = `${text.replace(/\s+/g, " ").trim().length}:${text.replace(/\s+/g, " ").trim().slice(0, 120)}`;
      const legacyIndex = uploadKind === "quick" ? 0 : loadReadingProgress(legacyKey) ?? 0;
      const now = Date.now();
      const restoredIndex = Math.max(0, Math.min(legacyIndex, parsed.length - 1));
      const item: Book = { id, kind: uploadKind === "quick" ? "quick" : undefined, title: cleanTitle(fileName), fileName, source, addedAt: now, lastOpenedAt: now, paragraphCount: parsed.length,
        textLength: newOffsets[newOffsets.length - 1], folderId: uploadKind === "quick" ? null : uploadFolderId,
        progress: { ...defaultProgress, readingIndex: restoredIndex, paragraphIndex: restoredIndex,
          coveredChars: newOffsets[restoredIndex] ?? 0, percent: percentOfText(newOffsets[restoredIndex] ?? 0, newOffsets[newOffsets.length - 1]) } };
      const added = await addBook(item, blob, text);
      await refreshBooks();
      if (!added) { const saved = (await listBooks()).find(entry => entry.id === id); if (saved && openAfter) await openBook(saved); return; }
      if (openAfter) await openBook(item);
      else { setUploadOpen(false); setNotice(`Added “${item.title}” to ${uploadFolderId ? "the book folder" : "your library"}.`); }
    } catch (error) { setNotice(storageMessage(error)); }
    finally { setBusy(false); }
  }
  async function uploadFiles(files: File[]) {
    for (const file of files) {
      const parsed = await parser.parseFile(file);
      if (!parsed) continue;
      await addDocument(file, file.name, parsed.source, parsed.text, uploadKind === "quick" || (files.length === 1 && !uploadFolderId));
    }
  }
  async function addPaste() {
    const text = pasteText.trim();
    if (!text) return;
    const firstLine = text.split(/\r?\n/).find(line => line.trim())?.trim() ?? "Pasted reading";
    await addDocument(new Blob([text], { type: "text/plain" }), firstLine.slice(0, 64), "paste", text, uploadKind === "quick" || !uploadFolderId);
    setPasteText("");
  }
  function openUpload(targetFolderId: string | null = null, kind: "book" | "quick" = "book") { setUploadKind(kind); setUploadFolderId(kind === "quick" ? null : targetFolderId); setUploadOpen(true); }
  function openFolder(folder: BookFolder) { setFolderId(folder.id); setScreen("folder"); setPlayerOpen(false); window.scrollTo(0, 0); }
  async function saveFolder() {
    const title = folderName.trim();
    if (!title) return;
    if (folders.some(folder => folder.id !== (folderDialog === "rename" ? folderId : null) && folder.title.toLocaleLowerCase() === title.toLocaleLowerCase())) {
      setNotice("A book folder with that name already exists."); return;
    }
    try {
      if (folderDialog === "rename" && folderId) {
        await renameFolder(folderId, title);
        await refreshFolders();
      } else {
        const created = await createFolder(title);
        await refreshFolders();
        setFolderId(created.id);
        setScreen("folder");
      }
      setFolderDialog(null); setFolderName("");
    } catch (error) { setNotice(storageMessage(error)); }
  }
  async function deleteCurrentFolder() {
    if (!selectedFolder || !window.confirm(`Remove “${selectedFolder.title}”? Its files will stay in your library as unfiled files.`)) return;
    try {
      await removeFolder(selectedFolder.id);
      await Promise.all([refreshBooks(), refreshFolders()]);
      setFolderId(null); setScreen("library");
      setNotice("Folder removed. Its files are now unfiled.");
    } catch (error) { setNotice(storageMessage(error)); }
  }
  async function moveBook() {
    if (!moveBookId) return;
    try {
      const target = moveFolderId || null;
      await updateBook(moveBookId, { folderId: target });
      await refreshBooks();
      if (book?.id === moveBookId) { setBook({ ...book, folderId: target }); setReturnFolderId(target); }
      setMoveBookId(null);
    } catch (error) { setNotice(storageMessage(error)); }
  }
  function startMove(item: Book) { setMoveBookId(item.id); setMoveFolderId(item.folderId ?? ""); }
  function saveCurrentProgress(): Promise<void> {
    if (!book) return Promise.resolve();
    return updateBook(book.id, { progress: { readingIndex, paragraphIndex: speech.currentParagraphIndex ?? book.progress.paragraphIndex, sentenceIndex: speech.currentSentenceIndex ?? book.progress.sentenceIndex, voiceId: selectedVoiceId, rate, coveredChars: coveredCharsForCurrent() } }).then(() => undefined).catch(error => { setNotice(storageMessage(error)); });
  }
  function pausePlayback() { speech.pause(); void saveCurrentProgress(); }
  function stopPlayback() { void saveCurrentProgress(); speech.stop(); }
  function goHome() { setScreen("home"); setPlayerOpen(false); window.scrollTo(0, 0); void refreshBooks().catch(error => setNotice(storageMessage(error))); }
  function backToLibrary() { setScreen("library"); setPlayerOpen(false); window.scrollTo(0, 0); void refreshBooks().catch(error => setNotice(storageMessage(error))); }
  function backFromReader() { setScreen(returnScreen === "folder" ? (returnFolderId && folders.some(folder => folder.id === returnFolderId) ? "folder" : "library") : returnScreen); setPlayerOpen(false); window.scrollTo(0, 0); void refreshBooks().catch(error => setNotice(storageMessage(error))); }
  function changeVoice(id: string) { setSelectedVoiceId(id); if (book) void updateBook(book.id, { progress: { voiceId: id } }).catch(error => setNotice(storageMessage(error))); }
  function changeRate(value: number) { setRate(value); if (book) void updateBook(book.id, { progress: { rate: value } }).catch(error => setNotice(storageMessage(error))); }
  function markReading(index: number, atEnd = false) { setReadingIndex(index); if (book) void updateBook(book.id, { progress: { readingIndex: index, coveredChars: atEnd ? textLength : (offsets[index] ?? 0) } }).then(updated => setBooks(items => items.map(item => item.id === book.id ? updated : item))).catch(error => setNotice(storageMessage(error))); }
  async function saveRename() {
    if (!renameId || !renameTitle.trim()) return;
    try { await updateBook(renameId, { title: renameTitle.trim() }); await refreshBooks(); if (book?.id === renameId) setBook({ ...book, title: renameTitle.trim() }); setRenameId(null); }
    catch (error) { setNotice(storageMessage(error)); }
  }
  async function removeBook(item: Book) {
    if (!window.confirm(`Delete ${item.kind === "quick" ? "quick listen" : "book file"} “${item.title}” and its saved progress from this browser?`)) return;
    try { if (book?.id === item.id) { speech.stop(); activeBookId.current = null; setBook(null); setScreen(item.kind === "quick" ? "home" : item.folderId && folders.some(folder => folder.id === item.folderId) ? "folder" : "library"); }
      await deleteBook(item.id); await refreshBooks(); setNotice(`“${item.title}” was deleted.`); }
    catch (error) { setNotice(storageMessage(error)); }
  }

  const continueBook = books.find(item => item.id === book?.id && item.progress.percent < 100) ?? books.find(item => item.progress.percent < 100);
  const currentBook = books.find(item => item.id === book?.id) ?? book;
  const progress = book ? percentOfText(Math.max(currentBook?.progress.coveredChars ?? 0, coveredCharsForCurrent()), textLength) : 0;
  const homeActive = screen === "home" || (screen === "reader" && book?.kind === "quick");
  const libraryActive = screen === "library" || screen === "folder" || (screen === "reader" && book?.kind !== "quick");
  return <div className="app">
    <a className="skip-link" href="#main">Skip to content</a>
    <header className="topbar">
      <a className="brand" href="/" onClick={event => { if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return; event.preventDefault(); goHome(); }} aria-label="Folio home"><span className="brand-mark"><BookOpen size={19}/></span><span>folio<span className="brand-dot">.</span></span></a>
      <nav className="header-nav" aria-label="Main navigation"><button className={homeActive ? "active" : ""} aria-current={homeActive ? "page" : undefined} onClick={goHome}>Home</button><button className={libraryActive ? "active" : ""} aria-current={libraryActive ? "page" : undefined} onClick={backToLibrary}>Library</button></nav>
      {screen === "reader" ? <div className="top-actions"><button className="icon-button" onClick={() => setSettingsOpen(true)} aria-label="Reader settings"><Settings2 size={20}/></button></div> : <div className="top-actions"><button className="icon-button" onClick={() => openUpload(screen === "folder" ? folderId : null, screen === "home" ? "quick" : "book")} aria-label={screen === "home" ? "Start a quick listen" : "Add a book file"}><Plus size={21}/></button></div>}
    </header>
    {notice || parser.error || speech.error ? <div className="notice" role="status">{notice || parser.error || speech.error}<button onClick={() => setNotice("")} aria-label="Dismiss message"><X size={16}/></button></div> : null}
    <main id="main">
      {screen === "home" ? <div className="home-page">
        <section className="home-hero" aria-labelledby="home-title"><div className="home-hero-inner"><div className="home-copy"><h1 id="home-title">Read when you want.<br/><span>Listen when you can’t.</span></h1><p>Turn a file or pasted passage into speech. Start with one quick listen, then keep longer reads together in your library.</p><div className="home-hero-actions"><button className="primary-button home-start" onClick={() => openUpload(null, "quick")}><Play size={18} fill="currentColor"/> Start listening</button><button className="home-secondary" onClick={backToLibrary}>Explore Library <ChevronRight size={18}/></button></div><small>TXT, PDF, Word, or pasted text · Stored in this browser</small></div><div className="home-preview" aria-hidden="true"><div className="home-preview-top"><span><BookOpen size={15}/> folio.</span><span>Quick listen</span></div><div className="home-preview-page"><small>TEXT TO SPEECH</small><h2>A quieter way to read</h2><p>Some words are easier to take with you.</p><p className="home-preview-highlight">Keep the page close. Let the story move with you.</p><p>Pick up right where you left off.</p></div><div className="home-preview-player"><span className="home-preview-audio"><Headphones size={17}/></span><span><strong>A quieter way to read</strong><small>Ready to listen</small></span><span className="home-preview-play"><Play size={16} fill="currentColor"/></span></div></div></div></section>
        <section className="home-steps" aria-labelledby="steps-title"><div className="home-steps-heading"><h2 id="steps-title">From page to playback.</h2><p>Two ways to listen, one place to return to.</p></div><ol><li><span>01</span><div><h3>Bring your text</h3><p>Choose a TXT, PDF, or Word file, or paste a passage.</p></div></li><li><span>02</span><div><h3>Listen your way</h3><p>Pick a browser voice and speed, then follow along in the reader.</p></div></li><li><span>03</span><div><h3>Keep books together</h3><p>Use Library folders for related chapters and track how much text you’ve covered.</p></div></li></ol></section>
        {continueBook ? <section className="continue-section" aria-labelledby="continue-title"><div className="section-heading"><h2 id="continue-title">Continue listening</h2><span>Pick up where you left off</span></div><button className="continue-card" onClick={() => void openBook(continueBook, true)} disabled={busy}><span className="featured-cover">{continueBook.kind === "quick" ? <Headphones size={32} strokeWidth={1.4}/> : <BookOpen size={32} strokeWidth={1.4}/>}<small>{continueBook.kind === "quick" ? "Quick listen" : typeLabels[continueBook.source]}</small></span><span className="continue-copy"><strong>{continueBook.title}</strong><span>{continueBook.progress.percent}% of text · {continueBook.kind === "quick" ? "Quick listen" : typeLabels[continueBook.source]}</span><span className="progress-track"><span style={{ width: `${continueBook.progress.percent}%` }}/></span><span className="continue-action">Resume listening <ChevronRight size={17}/></span></span></button></section> : null}
        {quickItems.length > 0 ? <section className="shelf" aria-labelledby="quick-title"><div className="section-heading"><h2 id="quick-title">Quick listens</h2><span>Separate from your books</span></div><div className="book-list">{quickItems.map(item => <BookRow key={item.id} item={item} busy={busy} onOpen={() => void openBook(item)} onRename={() => { setRenameId(item.id); setRenameTitle(item.title); }} onDelete={() => void removeBook(item)}/>)}</div></section> : null}
        <div className="storage-note">Quick listens stay in this browser until you delete them.</div>
      </div> : screen === "library" ? <div className="library-page">
        <div className="library-heading"><div><h1>Your books</h1><p>Keep every story in its place.</p></div><span className="book-count">{folders.length ? `${folders.length} ${folders.length === 1 ? "folder" : "folders"}` : `${libraryBooks.length} ${libraryBooks.length === 1 ? "file" : "files"}`}</span></div>
        {folders.length === 0 && libraryBooks.length === 0 ? <div className="empty-state"><div className="empty-book"><BookOpen size={38} strokeWidth={1.2}/></div><h2>Room for a good book.</h2><p>Create a book folder and keep its related files together.</p><button className="primary-button" onClick={() => { setFolderName(""); setFolderDialog("create"); }}><Plus size={18}/> Create book folder</button></div> : null}
        {folders.length > 0 || libraryBooks.length > 0 ? <section className="folder-section" aria-labelledby="folder-title"><div className="section-heading"><h2 id="folder-title">Book folders</h2><button className="text-action" onClick={() => { setFolderName(""); setFolderDialog("create"); }}><Plus size={17}/> New folder</button></div><div className="folder-grid">{folders.map(folder => { const items = libraryBooks.filter(item => item.folderId === folder.id); const percent = folderPercent(items); return <button className="folder-card" key={folder.id} onClick={() => openFolder(folder)}><span className="folder-icon"><FolderClosed size={25} strokeWidth={1.5}/></span><span className="folder-card-copy"><strong>{folder.title}</strong><small>{items.length} {items.length === 1 ? "file" : "files"} · {percent}% of text</small><span className="progress-track"><span style={{ width: `${percent}%` }}/></span></span><ChevronRight size={18}/></button>; })}</div></section> : null}
        {unfiledBooks.length > 0 ? <section className="shelf" aria-labelledby="shelf-title"><div className="section-heading"><h2 id="shelf-title">Unfiled files</h2></div><div className="book-list">{unfiledBooks.map(item => <BookRow key={item.id} item={item} busy={busy} onOpen={() => void openBook(item)} onRename={() => { setRenameId(item.id); setRenameTitle(item.title); }} onMove={() => startMove(item)} onDelete={() => void removeBook(item)}/>)}</div></section> : null}
        <div className="storage-note">Stored on this device. Clearing browser site data can remove your library.</div>
      </div> : screen === "folder" ? selectedFolder ? <div className="folder-page"><button className="back-link" onClick={backToLibrary}><ArrowLeft size={17}/> Library</button><div className="folder-heading"><span className="folder-heading-icon"><FolderClosed size={30}/></span><h1>{selectedFolder.title}</h1><p>{libraryBooks.filter(item => item.folderId === selectedFolder.id).length} {libraryBooks.filter(item => item.folderId === selectedFolder.id).length === 1 ? "file" : "files"} · {folderPercent(libraryBooks.filter(item => item.folderId === selectedFolder.id))}% of text covered</p><span className="progress-track"><span style={{ width: `${folderPercent(libraryBooks.filter(item => item.folderId === selectedFolder.id))}%` }}/></span></div><div className="folder-toolbar"><button className="primary-button" onClick={() => openUpload(selectedFolder.id)}><Plus size={18}/> Add files</button><button className="text-action" onClick={() => { setFolderName(selectedFolder.title); setFolderDialog("rename"); }}>Rename</button><button className="text-action danger" onClick={() => void deleteCurrentFolder()}>Remove folder</button></div>{libraryBooks.some(item => item.folderId === selectedFolder.id) ? <section className="shelf" aria-labelledby="folder-files-title"><div className="section-heading"><h2 id="folder-files-title">Files in this book</h2></div><div className="book-list">{libraryBooks.filter(item => item.folderId === selectedFolder.id).map(item => <BookRow key={item.id} item={item} busy={busy} onOpen={() => void openBook(item)} onRename={() => { setRenameId(item.id); setRenameTitle(item.title); }} onMove={() => startMove(item)} onDelete={() => void removeBook(item)}/>)}</div></section> : <p className="folder-empty">Add chapters or documents to this folder. Their text will count toward the book’s progress.</p>}</div> : <div className="folder-page"><p>This folder is no longer available.</p><button className="back-link" onClick={backToLibrary}>Back to library</button></div> : book ? <div className="reader-page"><div className="reader-meta"><button className="back-link" onClick={backFromReader}><ArrowLeft size={17}/> {returnScreen === "folder" ? "Book folder" : returnScreen === "home" ? "Home" : "Library"}</button><span>{book.kind === "quick" ? "Quick listen" : typeLabels[book.source]} · {progress}% of text</span></div><div className="reader-title"><h1>{book.title}</h1><p>{book.kind === "quick" ? "Standalone file" : `${paragraphs.length} paragraphs`} · Tap any paragraph to listen from there</p></div>
        {book.kind !== "quick" && chapters.length > 1 ? <label className="chapter-select">Jump to chapter<select value="" onChange={event => { const index = Number(event.target.value); if (Number.isInteger(index)) { speech.stop(); speech.restorePosition(index); markReading(index); } }}><option value="">Choose a chapter</option>{chapters.map(chapter => <option key={chapter.index} value={chapter.index}>{chapter.title}</option>)}</select></label> : null}
        <ReaderView key={book.id} paragraphs={paragraphs} currentParagraphIndex={speech.status === "idle" ? readingIndex : speech.currentParagraphIndex} currentSentenceIndex={speech.status === "idle" ? null : speech.currentSentenceIndex} followSpeech={speech.status !== "idle"} isFinished={progress >= 100} isQuickListen={book.kind === "quick"} fontSize={settings.fontSize} lineHeight={settings.lineHeight} paragraphSpacing={settings.paragraphSpacing} maxWidth={settings.maxWidth} textAlign={settings.textAlign} onParagraphSelect={index => { markReading(index); speech.playFromParagraph(index); }} onReadingIndexChange={markReading} onMarkFinished={() => markReading(paragraphs.length - 1, true)} readingIndex={readingIndex}/>
      </div> : null}
    </main>
    {book ? <div className={`player-shell ${screen !== "reader" ? "player-in-library" : ""}`}><div className="player-progress"><span style={{ width: `${progress}%` }}/></div><div className="mini-player"><button className="player-expand" onClick={() => setPlayerOpen(value => !value)} aria-expanded={playerOpen} aria-label={playerOpen ? "Collapse player" : "Expand player"}><span className="mini-icon"><Headphones size={20}/></span><span><strong>{book.title}</strong><small>{speech.status === "speaking" ? "Now listening" : `Paragraph ${(speech.currentParagraphIndex ?? book.progress.paragraphIndex) + 1} of ${paragraphs.length}`}</small></span><ChevronDown className={playerOpen ? "chevron-open" : ""} size={17}/></button><button className="play-button" onClick={speech.status === "speaking" ? pausePlayback : speech.speak} aria-label={speech.status === "speaking" ? "Pause" : speech.status === "paused" ? "Resume" : "Play"}>{speech.status === "speaking" ? <Pause size={21} fill="currentColor"/> : <Play size={21} fill="currentColor"/>}</button></div>
      {playerOpen ? <div className="player-expanded"><div className="player-title"><strong>Listen to {book.title}</strong><span>{progress}% complete</span></div><div className="transport"><button onClick={speech.goToPreviousParagraph} aria-label="Previous paragraph"><SkipBack size={23}/></button><button className="transport-main" onClick={speech.status === "speaking" ? pausePlayback : speech.speak} aria-label={speech.status === "speaking" ? "Pause" : "Play"}>{speech.status === "speaking" ? <Pause fill="currentColor"/> : <Play fill="currentColor"/>}</button><button onClick={speech.goToNextParagraph} aria-label="Next paragraph"><SkipForward size={23}/></button><button onClick={stopPlayback} aria-label="Stop"><Square size={18}/></button></div><div className="player-options"><label>Voice<select value={selectedVoiceId} onChange={event => changeVoice(event.target.value)}><option value="">Browser default</option>{voices.map(voice => <option key={voice.id} value={voice.id}>{voice.name} ({voice.lang})</option>)}</select></label><label>Speed<select value={rate} onChange={event => changeRate(Number(event.target.value))}>{[0.7, 0.85, 1, 1.15, 1.2, 1.3, 1.5, 1.75, 2].map(value => <option key={value} value={value}>{value}×</option>)}</select></label></div></div> : null}</div> : null}
    {uploadOpen ? <div className="modal-backdrop" onClick={() => setUploadOpen(false)}><section className="sheet" role="dialog" aria-modal="true" aria-labelledby="add-title" onClick={event => event.stopPropagation()}><div className="sheet-header"><h2 id="add-title">{uploadKind === "quick" ? "Start a quick listen" : "Add book files"}</h2><button className="icon-button" onClick={() => setUploadOpen(false)} aria-label="Close"><X size={20}/></button></div><p>{uploadKind === "quick" ? "Listen to one file or passage. It stays on Home, separate from your books." : "Your files stay in this browser, ready whenever you return."}</p>{uploadKind === "book" && folders.length > 0 ? <label className="field-label folder-picker">Book folder<select value={uploadFolderId ?? ""} onChange={event => setUploadFolderId(event.target.value || null)}><option value="">Unfiled</option>{folders.map(folder => <option key={folder.id} value={folder.id}>{folder.title}</option>)}</select></label> : null}<input ref={fileInput} className="visually-hidden" type="file" multiple={uploadKind === "book"} accept=".txt,.pdf,.docx" onChange={event => { const files = Array.from(event.target.files ?? []); if (files.length) void uploadFiles(files); event.target.value = ""; }}/><button className="upload-choice" onClick={() => fileInput.current?.click()} disabled={busy || parser.status === "loading"}><span><Upload size={22}/></span><span><strong>{busy || parser.status === "loading" ? "Adding files…" : uploadKind === "quick" ? "Choose a file" : "Choose files"}</strong><small>TXT, PDF, or DOCX{uploadKind === "book" ? " · select multiple" : ""}</small></span><ChevronRight size={18}/></button><div className="divider"><span>or paste text</span></div><label className="field-label" htmlFor="paste-input">Text to read</label><textarea id="paste-input" value={pasteText} onChange={event => setPasteText(event.target.value)} placeholder={uploadKind === "quick" ? "Paste a passage here…" : "Paste a chapter or passage here…"}/><button className="primary-button full" onClick={() => void addPaste()} disabled={!pasteText.trim() || busy}>{uploadKind === "quick" ? "Start listening" : "Add pasted text"}</button></section></div> : null}
    {settingsOpen ? <div className="modal-backdrop" onClick={() => setSettingsOpen(false)}><section className="sheet settings-sheet" role="dialog" aria-modal="true" aria-labelledby="settings-title" onClick={event => event.stopPropagation()}><div className="sheet-header"><h2 id="settings-title">Reading appearance</h2><button className="icon-button" onClick={() => setSettingsOpen(false)} aria-label="Close"><X size={20}/></button></div><label className="range-field">Text size <strong>{settings.fontSize}px</strong><input type="range" min="15" max="30" value={settings.fontSize} onChange={event => settings.setFontSize(Number(event.target.value))}/></label><label className="range-field">Line spacing <strong>{settings.lineHeight.toFixed(1)}</strong><input type="range" min="1.3" max="2.2" step="0.1" value={settings.lineHeight} onChange={event => settings.setLineHeight(Number(event.target.value))}/></label><label className="range-field">Reading width <strong>{settings.maxWidth}px</strong><input type="range" min="480" max="900" step="20" value={settings.maxWidth} onChange={event => settings.setMaxWidth(Number(event.target.value))}/></label></section></div> : null}
    {renameId ? <div className="modal-backdrop" onClick={() => setRenameId(null)}><section className="sheet rename-sheet" role="dialog" aria-modal="true" aria-labelledby="rename-title" onClick={event => event.stopPropagation()}><div className="sheet-header"><h2 id="rename-title">Rename {books.find(item => item.id === renameId)?.kind === "quick" ? "quick listen" : "book file"}</h2><button className="icon-button" onClick={() => setRenameId(null)} aria-label="Close"><X size={20}/></button></div><label className="field-label" htmlFor="rename-input">Title</label><input id="rename-input" value={renameTitle} onChange={event => setRenameTitle(event.target.value)} onKeyDown={event => { if (event.key === "Enter") void saveRename(); }}/><button className="primary-button full" onClick={() => void saveRename()} disabled={!renameTitle.trim()}>Save title</button></section></div> : null}
    {folderDialog ? <div className="modal-backdrop" onClick={() => setFolderDialog(null)}><section className="sheet rename-sheet" role="dialog" aria-modal="true" aria-labelledby="folder-dialog-title" onClick={event => event.stopPropagation()}><div className="sheet-header"><h2 id="folder-dialog-title">{folderDialog === "create" ? "New book folder" : "Rename folder"}</h2><button className="icon-button" onClick={() => setFolderDialog(null)} aria-label="Close"><X size={20}/></button></div><p>Keep related chapters and documents together.</p><label className="field-label" htmlFor="folder-name">Book name</label><input id="folder-name" maxLength={100} value={folderName} onChange={event => setFolderName(event.target.value)} onKeyDown={event => { if (event.key === "Enter") void saveFolder(); }} placeholder="e.g. The Long Journey"/><button className="primary-button full" onClick={() => void saveFolder()} disabled={!folderName.trim()}>{folderDialog === "create" ? "Create folder" : "Save name"}</button></section></div> : null}
    {moveBookId ? <div className="modal-backdrop" onClick={() => setMoveBookId(null)}><section className="sheet rename-sheet" role="dialog" aria-modal="true" aria-labelledby="move-title" onClick={event => event.stopPropagation()}><div className="sheet-header"><h2 id="move-title">Move file</h2><button className="icon-button" onClick={() => setMoveBookId(null)} aria-label="Close"><X size={20}/></button></div><label className="field-label" htmlFor="move-folder">Book folder</label><select id="move-folder" value={moveFolderId} onChange={event => setMoveFolderId(event.target.value)}><option value="">Unfiled</option>{folders.map(folder => <option key={folder.id} value={folder.id}>{folder.title}</option>)}</select><button className="primary-button full" onClick={() => void moveBook()}>Move file</button></section></div> : null}
  </div>;
}
