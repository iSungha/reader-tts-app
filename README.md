# Folio — Reader TTS

A mobile-first, browser-local reading and text-to-speech app built with React, TypeScript, and Vite.

## Run locally

```bash
npm install
npm run dev
```

Use `npm run build` and `npm run lint` for the existing project checks.

## Library and playback

- Add TXT, PDF, and DOCX files, or paste text. Original files and extracted text are saved in IndexedDB.
- A SHA-256 content hash identifies each file, so adding identical content opens the saved copy.
- Each file keeps its own reading paragraph, listening sentence, voice, speed, completion, and last-opened time.
- Create book folders for related files. A folder's completion is weighted by the readable text length of all its files. Files can be moved between folders without losing their progress.
- File completion uses the furthest readable character reached while reading or listening, rather than counting paragraphs equally.
- Renaming and deletion affect only the selected book. Deletion asks for confirmation.
- Reading appearance is stored as a lightweight browser preference. Existing paragraph bookmarks from the previous version are imported when the same content is added again.
- The reader renders a bounded paragraph window for large novels; use the earlier/continue controls to move through it.

Speech uses the browser's `speechSynthesis` voices. Availability and quality differ across browsers and operating systems. Playback may require a tap after reopening a book, and background or lock-screen playback is not guaranteed. The library is local to this browser profile and can be removed if site data is cleared. Persistent storage is requested where supported, but the browser may decline it.
