# Reader TTS App

A browser-based reading app that turns pasted text or TXT, PDF, and DOCX files into a readable document and reads it aloud with the browser's speech voices.

## Features

- Paste text or import TXT, PDF, and DOCX documents.
- Choose an available voice, adjust playback speed, and play, pause, or stop narration.
- Follow sentence highlighting and automatic scrolling while speech plays.
- Jump between paragraphs and resume or clear saved reading progress.
- Use reader display settings and compact playback controls on smaller screens.

## How it is built

The app uses React, TypeScript, and Vite. The main reader flow is in [`src/App.tsx`](src/App.tsx); document parsers are under [`src/lib/parsers`](src/lib/parsers), while speech and reader state live in hooks under [`src/hooks`](src/hooks). PDF parsing uses PDF.js, DOCX parsing uses Mammoth, and narration uses the browser's Web Speech API. There is no backend service in this repository; available voices depend on the browser and operating system.

## Run locally

Requires Node.js and npm. From the repository root:

```bash
npm install
npm run dev
```

Open the local URL printed by Vite. To create a production build or run the linter:

```bash
npm run build
npm run lint
```
