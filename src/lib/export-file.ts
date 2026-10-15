import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

export async function cleanExpiredExports(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  const {files} = await Filesystem.readdir({path:'',directory:Directory.Cache});
  for (const file of files) {
    if (!/^cotidie_backup_[\dT._-]+\.(ctd|ctdb)$/.test(file.name)) continue;
    if (file.mtime && Date.now()-file.mtime > 86400000)
      await Filesystem.deleteFile({path:file.name,directory:Directory.Cache});
  }
}

export async function exportFile(blob: Blob, fileName: string): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    const url=URL.createObjectURL(blob),link=document.createElement('a');
    link.href=url;link.download=fileName;document.body.appendChild(link);link.click();link.remove();
    window.setTimeout(()=>URL.revokeObjectURL(url),60000);return;
  }
  await cleanExpiredExports();
  const bytes=new Uint8Array(await blob.arrayBuffer());
  let binary='';
  for(let i=0;i<bytes.length;i+=32768) binary+=String.fromCharCode(...bytes.subarray(i,i+32768));
  await Filesystem.writeFile({path:fileName,data:btoa(binary),directory:Directory.Cache});
  const {uri}=await Filesystem.getUri({path:fileName,directory:Directory.Cache});
  await Share.share({title:'Copia de Seguridad Cotidie',url:uri,dialogTitle:'Guardar copia de seguridad'});
  // Keep URI readable for share recipients; cleanup next startup after 24h.
}
