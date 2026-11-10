import { registerPlugin } from '@capacitor/core';

export type LettersSecurityPlugin = {
  available(): Promise<{ available: boolean }>;
  storeSecret(options: { secret: string }): Promise<void>;
  unlockSecret(options: { reason: string }): Promise<{ secret: string }>;
  clearSecret(): Promise<void>;
  setPrivacy(options: { enabled: boolean }): Promise<void>;
};

const unavailable = async (): Promise<never> => {
  throw new Error('La autenticación del dispositivo no está disponible. Usa la contraseña de Cartas.');
};

// Web never simulates a successful OS authentication or stores the password.
const LettersSecurity = registerPlugin<LettersSecurityPlugin>('LettersSecurity', {
  web: () => ({
    available: async () => ({ available: false }),
    storeSecret: unavailable,
    unlockSecret: unavailable,
    clearSecret: async () => {},
    setPrivacy: async () => {},
  }),
});

export default LettersSecurity;
