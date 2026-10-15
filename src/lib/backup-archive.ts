import { openReadingDB, readingTransaction, isReadingDeleted, resetReadingMemory } from './reading-store';
import { persistence } from './persistence';
import { listPersonalEpubs, openPersonalEpub } from './personal-epubs';
import { validateImportPayload, withoutLocalPrivileges } from './import-safety';
import { validateSettingsData } from './settings-validation';
import { validateEpubArchive } from './epub-import-safety';
import { z } from 'zod';
import { parseRosaryIntentions, parseRosaryJaculatorias } from './rosary-immersive/storage';

export const MAX_BACKUP_BYTES = 128 * 1024 * 1024;
export const MAX_BACKUP_META_BYTES = 30 * 1024 * 1024;
const MAX_FILE_BYTES = 25 * 1024 * 1024;
const FORMAT = 'cotidie-backup-2';
type BinaryRecord = { id: string; name?: string; title?: string; sizeBytes: number; updatedAt: number; data: ArrayBuffer };
type Library = { books: BinaryRecord[]; audio: BinaryRecord[]; progress: Array<[string, unknown]> };
export type BackupArchive = { format: typeof FORMAT; settings: Record<string, unknown>; local: Record<string, string>; library: Library };
type Descriptor = Omit<BinaryRecord, 'data'> & { sha256: string; kind: 'books' | 'audio' };
export type RestoreMarker = { id: string; local: Record<string, string> };
export const RESTORE_FIELD = 'cotidieRestorePendingV2';
const allowedLocal = (key: string) => /^(cotidie_epub_(location_|bookmarks_|highlights_).+|cotidie_camino_progress_v1|cotidie_epub_font_size|cotidie_spiritual_audio_progress|rosary_intentions|rosary_jaculatorias)$/.test(key);
const allowedProgress = (key: string) => /^(deleted:)?(cotidie_epub_location_.+|cotidie_camino_progress_v1)$/.test(key);
const digest = async (data: ArrayBuffer) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', data)), byte => byte.toString(16).padStart(2,'0')).join('');
const fail = (): never => { throw new Error('El respaldo completo está dañado, es incompatible o supera sus límites.'); };
const bookmark = z.object({id:z.string().min(1),cfi:z.string().min(1),label:z.string(),createdAt:z.number().finite()});
const highlight = z.object({id:z.string().min(1),cfiRange:z.string().min(1),text:z.string(),note:z.string().optional(),createdAt:z.number().finite()});

async function readStore<T>(name: 'audio' | 'progress'): Promise<Array<[string, T]>> {
  return readingTransaction(name, 'readonly', (store, done) => {
    const entries: Array<[string,T]> = [];
    const request = store.openCursor();
    request.onsuccess = () => { const cursor = request.result; if (!cursor) { done(entries); return; }
      entries.push([String(cursor.key),cursor.value]); cursor.continue(); };
  });
}

export function validateBackupArchive(archive: BackupArchive): void {
  if (!archive || archive.format !== FORMAT || !archive.settings || !archive.local || !archive.library) fail();
  validateSettingsData(archive.settings);
  validateImportPayload({settings: archive.settings,local:archive.local,progress:archive.library.progress}, MAX_BACKUP_META_BYTES);
  for (const [key,value] of Object.entries(archive.local)) {
    if (!allowedLocal(key) || typeof value !== 'string') fail();
    if (key.startsWith('cotidie_epub_bookmarks_') && !z.array(bookmark).safeParse(JSON.parse(value)).success) fail();
    if (key.startsWith('cotidie_epub_highlights_') && !z.array(highlight).safeParse(JSON.parse(value)).success) fail();
    if (key==='cotidie_spiritual_audio_progress' && !z.record(z.number().finite().nonnegative()).safeParse(JSON.parse(value)).success) fail();
    if (key === 'rosary_intentions') parseRosaryIntentions(value);
    if (key === 'rosary_jaculatorias') parseRosaryJaculatorias(value);
    if (key !== 'cotidie_epub_font_size' && !(key.startsWith('cotidie_epub_location_') && value.startsWith('epubcfi('))) {
      try { validateImportPayload(JSON.parse(value)); } catch { fail(); }
    }
  }
  if (!Array.isArray(archive.library.progress) || archive.library.progress.some(entry => !Array.isArray(entry) || entry.length !== 2 || !allowedProgress(entry[0]))) fail();
  let total = new TextEncoder().encode(JSON.stringify({settings:archive.settings,local:archive.local,progress:archive.library.progress})).byteLength;
  for (const kind of ['books','audio'] as const) {
    if (!Array.isArray(archive.library[kind]) || archive.library[kind].length > 1000) fail();
    const seen = new Set<string>();
    for (const entry of archive.library[kind]) {
      if (!entry || typeof entry.id !== 'string' || !entry.id || seen.has(entry.id) ||
          typeof entry[kind === 'books' ? 'name' : 'title'] !== 'string' || !Number.isFinite(entry.updatedAt) ||
          !(entry.data instanceof ArrayBuffer) || entry.data.byteLength !== entry.sizeBytes || entry.sizeBytes > MAX_FILE_BYTES) fail();
      seen.add(entry.id); total += entry.sizeBytes;
      if (kind === 'books') validateEpubArchive(entry.data);
    }
  }
  if (total > MAX_BACKUP_BYTES) fail();
}

export async function createBackupArchive(settings: Record<string, unknown>): Promise<Blob> {
  // Migrate legacy libraries before reading their authoritative stores.
  const { migrateAudioLibrary } = await import('./audio-store');
  await migrateAudioLibrary();
  const books: BinaryRecord[] = [];
  const legacy = JSON.parse(localStorage.getItem('cotidie_personal_epubs_index') || '[]');
  const metas = new Map((await listPersonalEpubs()).map(book => [book.id,book]));
  if (Array.isArray(legacy)) for (const meta of legacy) if (meta?.id && !metas.has(meta.id)) metas.set(meta.id,meta);
  for (const meta of metas.values()) {
    if (await isReadingDeleted('cotidie_epub_location_personal-' + meta.id + '.epub')) continue;
    const data = await openPersonalEpub(meta, () => {});
    books.push({...meta,sizeBytes:data.byteLength,data});
  }
  const local: Record<string,string> = {};
  for (let i=0;i<localStorage.length;i++) {
    const key=localStorage.key(i)!; if (allowedLocal(key)) local[key]=localStorage.getItem(key)!;
  }
  const audio = (await readStore<BinaryRecord>('audio')).map(([,record])=>record);
  const progress = (await readStore<unknown>('progress')).filter(([key])=>allowedProgress(key));
  for (const [key,value] of await legacyProgress()) {
    if (!progress.some(([current])=>current===key)) progress.push([key,value]);
  }
  const archive: BackupArchive = {format:FORMAT,settings:withoutLocalPrivileges(settings),local,library:{books,audio,progress}};
  validateBackupArchive(archive);
  const descriptors: Descriptor[] = [], data: ArrayBuffer[] = [];
  for (const kind of ['books','audio'] as const) for (const record of archive.library[kind]) {
    const {data:bytes,...meta}=record;
    descriptors.push({...meta,kind,sha256:await digest(bytes)}); data.push(bytes);
  }
  const metadata = new TextEncoder().encode(JSON.stringify({format:FORMAT,settings:archive.settings,local,progress,files:descriptors}));
  if (metadata.byteLength > MAX_BACKUP_META_BYTES) fail();
  const header = new Uint8Array(8); header.set([67,84,68,50]); new DataView(header.buffer).setUint32(4,metadata.byteLength,true);
  const result = new Blob([header,metadata,...data],{type:'application/octet-stream'});
  if (result.size > MAX_BACKUP_BYTES) fail();
  return result;
}

export async function parseBackupArchive(file: Blob): Promise<BackupArchive> {
  if (file.size > MAX_BACKUP_BYTES || file.size < 8) fail();
  const header=new Uint8Array(await file.slice(0,8).arrayBuffer());
  if (header.slice(0,4).join(',') !== '67,84,68,50') fail();
  const length=new DataView(header.buffer).getUint32(4,true);
  if (length > MAX_BACKUP_META_BYTES || 8+length > file.size) fail();
  const metadata = JSON.parse(await file.slice(8,8+length).text());
  validateImportPayload(metadata,MAX_BACKUP_META_BYTES);
  if (metadata.format !== FORMAT || !Array.isArray(metadata.files) || metadata.files.length > 2000) fail();
  const library: Library={books:[],audio:[],progress:metadata.progress};
  let offset=8+length;
  for (const entry of metadata.files) {
    if (!entry || !['books','audio'].includes(entry.kind) || !Number.isSafeInteger(entry.sizeBytes) ||
        entry.sizeBytes < 0 || entry.sizeBytes > MAX_FILE_BYTES || offset+entry.sizeBytes > file.size) fail();
    const data=await file.slice(offset,offset+entry.sizeBytes).arrayBuffer(); offset+=entry.sizeBytes;
    if (await digest(data) !== entry.sha256) fail();
    const {kind,sha256,...meta}=entry;
    library[kind as 'books'|'audio'].push({...meta,data});
  }
  if (offset !== file.size) fail();
  const archive: BackupArchive={format:FORMAT,settings:metadata.settings,local:metadata.local,library};
  validateBackupArchive(archive); return archive;
}

export async function stageBackupArchive(archive: BackupArchive): Promise<RestoreMarker> {
  validateBackupArchive(archive);
  const id=crypto.randomUUID();
  await readingTransaction('restore','readwrite',(store,done)=>{store.put(archive.library,id);done(undefined);});
  return {id,local:archive.local};
}

export async function completeLibraryRestore(marker: RestoreMarker): Promise<void> {
  const staged=await readingTransaction<Library | null>('restore','readonly',(store,done)=>{
    const request=store.get(marker.id);request.onsuccess=()=>done(request.result ?? null);
  });
  if (!staged) throw new Error('Faltan los archivos de la restauración. Vuelve a importar el respaldo completo.');
  for (const [key] of await legacyProgress()) await persistence.removeItem(key);
  // Local writes may fail on quota. Keep the encrypted intent and stage to retry after interruption.
  for (let i=localStorage.length-1;i>=0;i--) {
    const key=localStorage.key(i)!;
    if (allowedLocal(key) || key.startsWith('cotidie_deleted:') || key.startsWith('cotidie_personal_epub_file_') ||
        key.startsWith('cotidie_spiritual_audio_file_') || key==='cotidie_personal_epubs_index' || key==='cotidie_spiritual_audio_library') localStorage.removeItem(key);
  }
  for (const [key,value] of Object.entries(marker.local)) {
    if (!allowedLocal(key) || typeof value !== 'string') fail();
    localStorage.setItem(key,value);
  }
  const db=await openReadingDB();
  try { await new Promise<void>((resolve,reject)=>{
    const tx=db.transaction(['books','audio','progress'],'readwrite');
    tx.oncomplete=()=>resolve();tx.onerror=tx.onabort=()=>reject(tx.error ?? new Error('Restauración no confirmada.'));
    try {
      for (const kind of ['books','audio','progress']) tx.objectStore(kind).clear();
      for (const kind of ['books','audio'] as const) for (const record of staged[kind]) tx.objectStore(kind).put(record,record.id);
      for (const [key,value] of staged.progress) tx.objectStore('progress').put(value,key);
    } catch (error) {
      // A synchronous put/clone failure must also roll back the queued clear operations.
      tx.abort();
      reject(error);
    }
  }); resetReadingMemory(); } finally {db.close();}
}

async function legacyProgress(): Promise<Array<[string, unknown]>> {
  // This store also contains encryption keys and private data: select only reading keys.
  await persistence.getItem('__reading_backup_probe__');
  const db = await new Promise<IDBDatabase>((resolve,reject)=>{
    const request=indexedDB.open('cotidie-db',1);
    request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);
  });
  try { return await new Promise((resolve,reject)=>{
    const tx=db.transaction('settings-store','readonly'), entries:Array<[string,unknown]>=[];
    const request=tx.objectStore('settings-store').openCursor();
    request.onsuccess=()=>{const c=request.result;if(c){if(allowedProgress(String(c.key)))entries.push([String(c.key),c.value]);c.continue();}};
    tx.oncomplete=()=>resolve(entries);tx.onabort=tx.onerror=()=>reject(tx.error);
  }); } finally {db.close();}
}

export async function discardRestoreStage(id: string): Promise<void> {
  await readingTransaction('restore','readwrite',(store,done)=>{store.delete(id);done(undefined);});
}
