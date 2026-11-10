export type SecretPrompt = {
  title: string;
  description: string;
  confirm?: boolean;
  warning?: boolean;
  verify?: (secret: string) => Promise<void>;
};
type Pending = SecretPrompt & { resolve: (value: string | null) => void };
let pending: Pending | null = null;
const listeners = new Set<() => void>();
export const subscribeSecretPrompt = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
export const getSecretPrompt = () => pending;
export const getServerSecretPrompt = () => null;
const notify = () => listeners.forEach(listener => listener());
export function requestSecret(options: SecretPrompt): Promise<string | null> {
  if (pending) return Promise.reject(new Error('Termina primero la solicitud de clave abierta.'));
  return new Promise(resolve => { pending = { ...options, resolve }; notify(); });
}
export function finishSecretPrompt(value: string | null): void {
  const current = pending;
  pending = null;
  current?.resolve(value);
  notify();
}

export const BACKUP_PASSWORD_DESCRIPTION = 'Introduce la clave con la que se creó este respaldo. Puede ser distinta de la clave actual de Cartas. Cotidie no puede recuperarla.';
