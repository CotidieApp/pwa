import { Capacitor } from '@capacitor/core';
import BackupImport from '@/plugins/BackupImport';
import { parseCotidieBackupFile } from './backup-archive';
import { MAX_ENCRYPTED_BACKUP_BYTES } from './encrypted-backup';

export async function readNativeBackupImport(token: string): Promise<unknown> {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android' ||
      !/^[a-f0-9-]{36}$/i.test(token)) throw new Error('El archivo recibido no está disponible. Usa Importar respaldo.');
  try {
    const file = await BackupImport.resolve({ token });
    if (!Number.isSafeInteger(file.size) || file.size < 8 || file.size > MAX_ENCRYPTED_BACKUP_BYTES ||
        typeof file.path !== 'string' || !file.path.startsWith('/')) throw new Error('El respaldo recibido es inválido o demasiado grande.');
    const response = await fetch(Capacitor.convertFileSrc(file.path));
    if (!response.ok) throw new Error('No se pudo leer el respaldo recibido.');
    const blob = await response.blob();
    if (blob.size !== file.size) throw new Error('El respaldo recibido está incompleto.');
    return await parseCotidieBackupFile(new File([blob], 'respaldo.ctd', { type: 'application/octet-stream' }));
  } finally { await BackupImport.clear({ token }).catch(() => undefined); }
}
