import { readingTransaction } from './reading-store';
export type AudioRecord = {id:string;title:string;sizeBytes:number;updatedAt:number;mimeType?:string;data:ArrayBuffer};
let migration: Promise<void> | null = null;
export const saveAudioRecord = (record:AudioRecord) => readingTransaction<void>('audio','readwrite',(store,done)=>{store.put(record,record.id);done(undefined);});
export const removeAudioRecord = (id:string) => readingTransaction<void>('audio','readwrite',(store,done)=>{store.delete(id);done(undefined);});
export const listAudioRecords = () => readingTransaction<AudioRecord[]>('audio','readonly',(store,done)=>{
  const request=store.getAll();request.onsuccess=()=>done(request.result);
});
export async function renameAudioRecord(id:string,title:string):Promise<void> {
  await readingTransaction('audio','readwrite',(store,done)=>{const r=store.get(id);r.onsuccess=()=>{
    if (!r.result) {store.transaction.abort();return;} store.put({...r.result,title,updatedAt:Date.now()},id);done(undefined);
  };});
}
export function migrateAudioLibrary():Promise<void> {
  if (migration) return migration;
  const work=(async()=>{
    const raw=localStorage.getItem('cotidie_spiritual_audio_library');if(!raw)return;
    const entries=JSON.parse(raw);if(!Array.isArray(entries))throw new Error('El índice de audios no es válido.');
    const existing=new Set((await listAudioRecords()).map(record=>record.id));
    for(const entry of entries){
      const key='cotidie_spiritual_audio_file_'+entry.id;
      const src=localStorage.getItem(key);
      if(!existing.has(entry.id)){
        if(!src?.startsWith('data:')||!src.includes(';base64,'))throw new Error('No se encontró un audio de la biblioteca.');
        const bytes=atob(src.slice(src.indexOf(',')+1));
        if(bytes.length>25*1024*1024)throw new Error('El audio supera los 25 MB.');
        const data=Uint8Array.from(bytes,c=>c.charCodeAt(0)).buffer;
        await saveAudioRecord({...entry,mimeType:src.slice(5,src.indexOf(';')),sizeBytes:data.byteLength,data});
      }
      localStorage.removeItem(key);
    }
    localStorage.removeItem('cotidie_spiritual_audio_library');
  })();
  migration=work; void work.finally(()=>{if(migration===work)migration=null;}).catch(()=>{}); return work;
}
