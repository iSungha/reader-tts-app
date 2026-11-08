import type { DocumentSource } from "../../types/document";
import { splitIntoParagraphs } from "../speech/splitIntoParagraphs";
import { paragraphOffsets, percentOfText, textPosition } from "../textProgress";

export type BookProgress = {
  readingIndex: number;
  paragraphIndex: number;
  sentenceIndex: number;
  voiceId: string;
  rate: number;
  percent: number;
  coveredChars: number;
};

export type Book = {
  id: string;
  title: string;
  fileName: string;
  source: DocumentSource;
  addedAt: number;
  lastOpenedAt: number;
  paragraphCount: number;
  textLength: number;
  folderId: string | null;
  progress: BookProgress;
};

export type BookFolder = { id: string; title: string; createdAt: number };

type BookContent = { id: string; blob: Blob; text: string };

const DB_NAME = "reader-tts-library";
const DB_VERSION = 2;
const pending = new Map<string, Promise<unknown>>();

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("books")) db.createObjectStore("books", { keyPath: "id" });
      if (!db.objectStoreNames.contains("contents")) db.createObjectStore("contents", { keyPath: "id" });
      if (!db.objectStoreNames.contains("folders")) db.createObjectStore("folders", { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Could not open the library."));
    request.onblocked = () => reject(new Error("Close other tabs of this app and try again."));
  });
}

function transactionResult<T>(db: IDBDatabase, mode: IDBTransactionMode, stores: string[], run: (tx: IDBTransaction, resolve: (value: T) => void, reject: (error: Error) => void) => void): Promise<T> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(stores, mode);
    let result: T;
    let settled = false;
    const fail = (error: Error) => { if (!settled) { settled = true; reject(error); } };
    tx.oncomplete = () => { if (!settled) { settled = true; resolve(result); } };
    tx.onerror = () => fail(tx.error ?? new Error("Library storage failed."));
    tx.onabort = () => fail(tx.error ?? new Error("Library storage was interrupted."));
    run(tx, value => { result = value; }, fail);
  });
}

export async function hashBlob(blob: Blob): Promise<string> {
  const bytes = await blob.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
}

export async function listBooks(): Promise<Book[]> {
  const db = await openDatabase();
  try {
    const books = await transactionResult<Book[]>(db, "readonly", ["books"], (tx, resolve, reject) => {
      const request = tx.objectStore("books").getAll();
      request.onsuccess = () => resolve((request.result as Book[]).sort((a, b) => b.lastOpenedAt - a.lastOpenedAt));
      request.onerror = () => reject(request.error ?? new Error("Could not load books."));
    });
    // Version-one entries have no character totals. Upgrade them without touching their files or bookmarks.
    for (const book of books) {
      if (typeof book.textLength === "number" && typeof book.progress.coveredChars === "number") continue;
      const content = await getBookContent(book.id);
      if (!content) continue;
      const paragraphs = splitIntoParagraphs(content.text);
      const offsets = paragraphOffsets(paragraphs);
      const coveredChars = book.progress.percent >= 100 ? offsets[offsets.length - 1] : Math.max(
        offsets[Math.max(0, Math.min(book.progress.readingIndex, paragraphs.length))] ?? 0,
        textPosition(paragraphs, offsets, book.progress.paragraphIndex, book.progress.sentenceIndex),
      );
      const updated = await updateBook(book.id, { textLength: offsets[offsets.length - 1], folderId: book.folderId ?? null, progress: { coveredChars } });
      Object.assign(book, updated);
    }
    return books;
  } finally { db.close(); }
}

export async function listFolders(): Promise<BookFolder[]> {
  const db = await openDatabase();
  try {
    return await transactionResult<BookFolder[]>(db, "readonly", ["folders"], (tx, resolve, reject) => {
      const request = tx.objectStore("folders").getAll();
      request.onsuccess = () => resolve((request.result as BookFolder[]).sort((a, b) => a.title.localeCompare(b.title)));
      request.onerror = () => reject(request.error ?? new Error("Could not load book folders."));
    });
  } finally { db.close(); }
}

export async function createFolder(title: string): Promise<BookFolder> {
  const folder = { id: crypto.randomUUID(), title: title.trim(), createdAt: Date.now() };
  const db = await openDatabase();
  try {
    return await transactionResult<BookFolder>(db, "readwrite", ["folders"], (tx, resolve) => {
      tx.objectStore("folders").add(folder);
      resolve(folder);
    });
  } finally { db.close(); }
}

export async function renameFolder(id: string, title: string): Promise<void> {
  const db = await openDatabase();
  try {
    await transactionResult<void>(db, "readwrite", ["folders"], (tx, resolve, reject) => {
      const store = tx.objectStore("folders");
      const request = store.get(id);
      request.onsuccess = () => {
        if (!request.result) { reject(new Error("This folder is no longer in the library.")); return; }
        store.put({ ...request.result, title: title.trim() });
        resolve(undefined);
      };
    });
  } finally { db.close(); }
}

/** Removing a folder keeps its files in the library as unfiled books. */
export async function removeFolder(id: string): Promise<void> {
  const db = await openDatabase();
  try {
    await transactionResult<void>(db, "readwrite", ["folders", "books"], (tx, resolve) => {
      const books = tx.objectStore("books");
      const request = books.getAll();
      request.onsuccess = () => {
        for (const book of request.result as Book[]) {
          if (book.folderId === id) books.put({ ...book, folderId: null });
        }
        tx.objectStore("folders").delete(id);
        resolve(undefined);
      };
    });
  } finally { db.close(); }
}

export async function getBookContent(id: string): Promise<BookContent | undefined> {
  const db = await openDatabase();
  try {
    return await transactionResult(db, "readonly", ["contents"], (tx, resolve, reject) => {
      const request = tx.objectStore("contents").get(id);
      request.onsuccess = () => resolve(request.result as BookContent | undefined);
      request.onerror = () => reject(request.error ?? new Error("Could not open this book."));
    });
  } finally { db.close(); }
}

export async function addBook(book: Book, blob: Blob, text: string): Promise<boolean> {
  const db = await openDatabase();
  try {
    return await transactionResult(db, "readwrite", ["books", "contents"], (tx, resolve, reject) => {
      const books = tx.objectStore("books");
      const request = books.get(book.id);
      request.onsuccess = () => {
        if (request.result) { resolve(false); return; }
        books.add(book);
        tx.objectStore("contents").add({ id: book.id, blob, text });
        resolve(true);
      };
      request.onerror = () => reject(request.error ?? new Error("Could not check this file."));
    });
  } finally { db.close(); }
}

function enqueue<T>(id: string, operation: () => Promise<T>): Promise<T> {
  const next = (pending.get(id) ?? Promise.resolve()).catch(() => undefined).then(operation);
  pending.set(id, next);
  void next.finally(() => { if (pending.get(id) === next) pending.delete(id); }).catch(() => undefined);
  return next;
}

export function updateBook(id: string, changes: Partial<Omit<Book, "id" | "progress">> & { progress?: Partial<BookProgress> }): Promise<Book> {
  return enqueue(id, async () => {
    const db = await openDatabase();
    try {
      return await transactionResult<Book>(db, "readwrite", ["books"], (tx, resolve, reject) => {
        const store = tx.objectStore("books");
        const request = store.get(id);
        request.onsuccess = () => {
          const current = request.result as Book | undefined;
          if (!current) { reject(new Error("This book is no longer in the library.")); return; }
          const progress = { ...current.progress, ...changes.progress };
          progress.coveredChars = Math.min(changes.textLength ?? current.textLength ?? 0, Math.max(current.progress.coveredChars ?? 0, changes.progress?.coveredChars ?? 0));
          progress.percent = percentOfText(progress.coveredChars, changes.textLength ?? current.textLength ?? 0);
          const updated = { ...current, ...changes, progress };
          store.put(updated);
          resolve(updated);
        };
        request.onerror = () => reject(request.error ?? new Error("Could not update this book."));
      });
    } finally { db.close(); }
  });
}

export function deleteBook(id: string): Promise<void> {
  return enqueue(id, async () => {
    const db = await openDatabase();
    try {
      await transactionResult<void>(db, "readwrite", ["books", "contents"], (tx, resolve) => {
        tx.objectStore("books").delete(id);
        tx.objectStore("contents").delete(id);
        resolve(undefined);
      });
    } finally { db.close(); }
  });
}

export async function requestPersistentStorage(): Promise<void> {
  try { await navigator.storage?.persist?.(); } catch { /* Browser may decline. */ }
}
