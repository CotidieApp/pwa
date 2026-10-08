import { readingTransaction, deleteReadingBook, isReadingDeleted, type ReadingTrace } from './reading-store';
import { persistence } from './persistence';
import { validateEpubArchive } from './epub-import-safety';
import { base64ToArrayBuffer } from './epub-reader/helpers';

export type PersonalEpubMeta = { id: string; name: string; sizeBytes: number; updatedAt: number };
type PersonalEpub = PersonalEpubMeta & { data: Blob | ArrayBuffer };
export const personalFileKey = (id: string) => `cotidie_personal_epub_file_${id}`;

export async function listPersonalEpubs(): Promise<PersonalEpubMeta[]> {
  return readingTransaction('books', 'readonly', (store, done) => {
    const request = store.openCursor();
    const items: PersonalEpubMeta[] = [];
    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) { done(items); return; }
      const { id, name, sizeBytes, updatedAt } = cursor.value as PersonalEpub;
      items.push({ id, name, sizeBytes, updatedAt });
      cursor.continue();
    };
  });
}

export async function savePersonalEpub(meta: PersonalEpubMeta, data: Blob | ArrayBuffer): Promise<void> {
  return readingTransaction('books', 'readwrite', (store, done) => { store.put({ ...meta, data }, meta.id); done(undefined); });
}

export async function openPersonalEpub(meta: PersonalEpubMeta, trace: ReadingTrace): Promise<ArrayBuffer> {
  if (await isReadingDeleted('cotidie_epub_location_personal-' + meta.id + '.epub')) throw new Error('El libro se ha eliminado.');
  let book: PersonalEpub | null = null;
  try {
    book = await readingTransaction('books', 'readonly', (store, done) => {
      const request = store.get(meta.id);
      request.onsuccess = () => done(request.result ?? null);
    });
  } catch (error) { trace('personal IDB read', `${meta.id}: ${String(error)}`, true); }
  if (book) {
    const buffer = book.data instanceof Blob ? await book.data.arrayBuffer() : book.data;
    validateEpubArchive(buffer);
    return buffer;
  }
  const legacy = localStorage.getItem(personalFileKey(meta.id));
  if (!legacy) throw new Error('No se encontró el EPUB guardado.');
  const buffer = base64ToArrayBuffer(legacy);
  validateEpubArchive(buffer);
  try {
    await savePersonalEpub(meta, buffer);
    // Transaction committed; only now may the large legacy copy be removed.
    localStorage.removeItem(personalFileKey(meta.id));
    trace('personal migration', `${meta.id}: ${buffer.byteLength} bytes`);
  } catch (error) { trace('personal migration failed; legacy retained', `${meta.id}: ${String(error)}`, true); }
  return buffer; // A failed migration must not prevent reading the legacy book.
}

export async function renamePersonalEpub(meta: PersonalEpubMeta): Promise<void> {
  return readingTransaction('books', 'readwrite', (store, done) => {
    const request = store.get(meta.id);
    request.onsuccess = () => {
      if (request.result) store.put({ ...request.result, ...meta }, meta.id);
      done(undefined);
    };
  });
}

export async function deletePersonalEpub(id: string): Promise<void> {
  const resource = ('personal-' + id + '.epub').trim().toLowerCase();
  const key = 'cotidie_epub_location_' + resource;
  await deleteReadingBook(id, key);
  // A durable tombstone blocks legacy migration and late checkpoints even if cleanup must be retried.
  await persistence.removeItem(key);
  localStorage.removeItem(key);
  localStorage.removeItem('cotidie_epub_bookmarks_' + resource);
  localStorage.removeItem('cotidie_epub_highlights_' + resource);
  localStorage.removeItem(personalFileKey(id));
  const indexKey = 'cotidie_personal_epubs_index';
  const raw = localStorage.getItem(indexKey);
  if (raw) {
    const index = JSON.parse(raw);
    if (Array.isArray(index)) localStorage.setItem(indexKey, JSON.stringify(index.filter(item => item?.id !== id)));
  }
}
