import { registerPlugin } from '@capacitor/core';

export type BackupImportPlugin = {
  resolve(options: { token: string }): Promise<{ path: string; name: string; size: number }>;
  clear(options: { token: string }): Promise<void>;
};

const unavailable = async (): Promise<never> => {
  throw new Error('La apertura externa de respaldos solo está disponible en Android. Usa Importar respaldo.');
};

// Native capabilities refer only to files staged by MainActivity, never caller-supplied paths.
const BackupImport = registerPlugin<BackupImportPlugin>('BackupImport', {
  web: () => ({ resolve: unavailable, clear: unavailable }),
});

export default BackupImport;
