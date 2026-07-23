export type SpiritualAudioItem = {
  id: string;
  title: string;
  src: string;
  isUser?: boolean;
  sizeBytes?: number;
  updatedAt?: number;
};

export type StoredSpiritualAudioItem = Required<Pick<SpiritualAudioItem, 'id' | 'title' | 'src' | 'sizeBytes' | 'updatedAt'>>;

export const DEFAULT_SPIRITUAL_AUDIOS: SpiritualAudioItem[] = [
  {
    id: 'san-josemaria-discurso',
    title: 'Discurso San Josemaría',
    src: '/media/Discurso San Josemaría.mp3',
  },
  {
    id: 'san-juan-pablo-ii-discurso',
    title: 'Discurso San Juan Pablo II',
    src: '/media/Discurso San Juan Pablo II.mp3',
  },
];
const SPIRITUAL_AUDIO_INDEX_STORAGE_KEY = 'cotidie_spiritual_audio_library';
const SPIRITUAL_AUDIO_FILE_KEY_PREFIX = 'cotidie_spiritual_audio_file_';
const SPIRITUAL_AUDIO_PROGRESS_STORAGE_KEY = 'cotidie_spiritual_audio_progress';
export const MAX_SPIRITUAL_AUDIO_SIZE_BYTES = 25 * 1024 * 1024;

export const toSpiritualAudioFileKey = (id: string) => `${SPIRITUAL_AUDIO_FILE_KEY_PREFIX}${id}`;

export const removeAudioExtension = (name: string) =>
  name.replace(/\.[^.]+$/, '').trim();

export const loadStoredSpiritualAudios = (): StoredSpiritualAudioItem[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(SPIRITUAL_AUDIO_INDEX_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (item): item is Omit<StoredSpiritualAudioItem, 'src'> =>
          item &&
          typeof item.id === 'string' &&
          typeof item.title === 'string' &&
          typeof item.sizeBytes === 'number' &&
          typeof item.updatedAt === 'number'
      )
      .map((item) => ({
        ...item,
        src: window.localStorage.getItem(toSpiritualAudioFileKey(item.id)) ?? '',
      }))
      .filter((item) => item.src.length > 0);
  } catch {
    return [];
  }
};

export const saveStoredSpiritualAudios = (items: StoredSpiritualAudioItem[]) => {
  if (typeof window === 'undefined') return;
  const index = items.map(({ id, title, sizeBytes, updatedAt }) => ({ id, title, sizeBytes, updatedAt }));
  window.localStorage.setItem(SPIRITUAL_AUDIO_INDEX_STORAGE_KEY, JSON.stringify(index));
};

export const loadSpiritualAudioProgress = (): Record<string, number> => {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(SPIRITUAL_AUDIO_PROGRESS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return Object.fromEntries(
      Object.entries(parsed).filter((entry): entry is [string, number] => (
        typeof entry[0] === 'string' &&
        typeof entry[1] === 'number' &&
        Number.isFinite(entry[1]) &&
        entry[1] >= 0
      ))
    );
  } catch {
    return {};
  }
};

export const saveSpiritualAudioProgress = (progress: Record<string, number>) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(SPIRITUAL_AUDIO_PROGRESS_STORAGE_KEY, JSON.stringify(progress));
};
