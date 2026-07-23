import type { Rendition } from 'epubjs';
import {
  READER_STYLE_TAG_ID,
  READER_FONT_STYLESHEET_ID,
  MIN_READER_FONT_SIZE,
  MAX_READER_FONT_SIZE,
  EPUB_FONT_SIZE_STORAGE_KEY,
  NT_BOOKS,
} from './constants';
import type { NtReference, ReaderThemeColors, StoredReaderLocation, TocEntry } from './types';

export const toStorageKey = (fileName: string) => `cotidie_epub_location_${fileName.trim().toLowerCase()}`;
export const toBookmarksKey = (fileName: string) => `cotidie_epub_bookmarks_${fileName.trim().toLowerCase()}`;
export const toHighlightsKey = (fileName: string) => `cotidie_epub_highlights_${fileName.trim().toLowerCase()}`;

export const getStoredReaderFontSize = (fallback: number) => {
  const normalizedFallback = Math.min(
    MAX_READER_FONT_SIZE,
    Math.max(MIN_READER_FONT_SIZE, Math.round(fallback))
  );
  if (typeof window === 'undefined') return normalizedFallback;
  try {
    const storedValue = window.localStorage.getItem(EPUB_FONT_SIZE_STORAGE_KEY);
    if (storedValue === null) return normalizedFallback;
    const stored = Number(storedValue);
    return Number.isFinite(stored)
      ? Math.min(MAX_READER_FONT_SIZE, Math.max(MIN_READER_FONT_SIZE, Math.round(stored)))
      : normalizedFallback;
  } catch {
    return normalizedFallback;
  }
};

export const resolveCssThemeColor = (value: string, fallback: string) => {
  const normalized = value.trim();
  if (!normalized || normalized.includes('var(')) return fallback;
  return normalized.startsWith('hsl(') ? normalized : `hsl(${normalized})`;
};

export const getReaderThemeColors = (theme: 'light' | 'dark'): ReaderThemeColors => {
  const fallback = theme === 'dark'
    ? { text: '#fafafa', background: '#0f172a' }
    : { text: '#0f172a', background: '#f8fafc' };

  if (typeof window === 'undefined') return fallback;
  const styles = window.getComputedStyle(document.documentElement);
  return {
    text: resolveCssThemeColor(styles.getPropertyValue('--foreground'), fallback.text),
    background: resolveCssThemeColor(styles.getPropertyValue('--background'), fallback.background),
  };
};

export const applyReaderAppearanceToContents = (
  contents: any,
  textColor: string,
  backgroundColor: string,
  fontFamily: string
) => {
  const doc = contents?.document as Document | undefined;
  if (!doc) return;
  if (!doc.getElementById(READER_FONT_STYLESHEET_ID)) {
    const fontStylesheet = doc.createElement('link');
    fontStylesheet.id = READER_FONT_STYLESHEET_ID;
    fontStylesheet.rel = 'stylesheet';
    fontStylesheet.href = new URL('/fonts/fonts.css', window.location.href).href;
    doc.head?.appendChild(fontStylesheet);
  }
  let styleEl = doc.getElementById(READER_STYLE_TAG_ID) as HTMLStyleElement | null;
  if (!styleEl) {
    styleEl = doc.createElement('style');
    styleEl.id = READER_STYLE_TAG_ID;
    doc.head?.appendChild(styleEl);
  }
  styleEl.textContent = `
    html, body {
      color: ${textColor} !important;
      background: ${backgroundColor} !important;
      background-color: ${backgroundColor} !important;
      margin: 0 !important;
      padding: 0 !important;
      box-sizing: border-box !important;
      font-family: ${fontFamily} !important;
    }
    body {
      padding-bottom: 1.25em !important;
    }
    body * {
      color: ${textColor} !important;
      font-family: ${fontFamily} !important;
    }
    a { color: ${textColor} !important; }
  `;
};

export const base64ToArrayBuffer = (input: string) => {
  const base64 = input.includes(',') ? input.split(',')[1] : input;
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
};

export const safeParseList = <T,>(raw: string | null): T[] => {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
};

export const flattenToc = (items: any[], depth = 0): TocEntry[] => {
  const out: TocEntry[] = [];
  for (const item of items || []) {
    if (item && typeof item.href === 'string') {
      out.push({
        id: `${item.id || item.href}-${depth}`,
        href: item.href,
        label: String(item.label || item.href),
        depth,
      });
    }
    if (Array.isArray(item?.subitems) && item.subitems.length > 0) {
      out.push(...flattenToc(item.subitems, depth + 1));
    }
  }
  return out;
};

export const normalizeText = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

export const stripHash = (value: string) => value.split('#')[0] || value;

export const parseStoredReaderLocation = (raw: string | null): StoredReaderLocation | null => {
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;

    const cfi = typeof parsed.cfi === 'string' && parsed.cfi.trim().length > 0 ? parsed.cfi : undefined;
    const endCfi = typeof parsed.endCfi === 'string' && parsed.endCfi.trim().length > 0
      ? parsed.endCfi
      : undefined;
    const href = typeof parsed.href === 'string' && parsed.href.trim().length > 0 ? parsed.href : undefined;
    return endCfi || cfi || href ? { cfi, endCfi, href } : null;
  } catch {
    return raw.trim().length > 0 ? { cfi: raw } : null;
  }
};

export const serializeStoredReaderLocation = (location: StoredReaderLocation) => JSON.stringify(location);

export const getRenditionLocation = (
  rendition: Rendition | null,
  reportedLocation?: any
): StoredReaderLocation | null => {
  if (!rendition) return null;
  let location = reportedLocation;
  if (location == null) {
    try {
      location = (rendition as any).currentLocation?.();
    } catch {
      // epub.js can dispose its manager before React's final persistence callback runs.
      return null;
    }
  }
  const start = Array.isArray(location) ? location[0]?.start : location?.start;
  const end = Array.isArray(location) ? location[location.length - 1]?.end : location?.end;
  const cfi = typeof start?.cfi === 'string' && start.cfi.length > 0 ? start.cfi : undefined;
  const endCfi = typeof end?.cfi === 'string' && end.cfi.length > 0 ? end.cfi : undefined;
  const href = typeof start?.href === 'string' && start.href.length > 0 ? start.href : undefined;
  return endCfi || cfi || href
    ? {
        ...(cfi ? { cfi } : {}),
        ...(endCfi ? { endCfi } : {}),
        ...(href ? { href } : {}),
      }
    : null;
};
export const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const parseNtReference = (query: string): NtReference | null => {
  const normalizedQuery = String(query || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9:.,\s]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!normalizedQuery) return null;

  const sortedBooks = [...NT_BOOKS].sort((a, b) => {
    const longestA = Math.max(...a.aliases.map((alias) => normalizeText(alias).length));
    const longestB = Math.max(...b.aliases.map((alias) => normalizeText(alias).length));
    return longestB - longestA;
  });

  for (const book of sortedBooks) {
    for (const alias of book.aliases) {
      const normalizedAlias = normalizeText(alias);
      const pattern = new RegExp(`^${escapeRegExp(normalizedAlias)}\\s+(\\d+)(?:\\s*[:.,]\\s*(\\d+))?$`);
      const match = normalizedQuery.match(pattern);
      if (!match) continue;

      const chapter = Number(match[1]);
      const verse = match[2] ? Number(match[2]) : undefined;
      if (!Number.isFinite(chapter) || chapter <= 0) return null;
      if (verse !== undefined && (!Number.isFinite(verse) || verse <= 0)) return null;

      return {
        bookId: book.id,
        chapter,
        ...(verse !== undefined ? { verse } : {}),
      };
    }
  }

  return null;
};

export const getElementCfi = (section: any, doc: Document, element: Element) => {
  if (typeof section?.cfiFromElement === 'function') {
    try {
      const cfi = section.cfiFromElement(element);
      if (typeof cfi === 'string' && cfi.length > 0) return cfi;
    } catch {}
  }

  if (typeof section?.cfiFromRange === 'function') {
    try {
      const range = doc.createRange();
      range.selectNode(element);
      const cfi = section.cfiFromRange(range);
      if (typeof cfi === 'string' && cfi.length > 0) return cfi;
    } catch {}
  }

  return null;
};

export const getExcerptFromElement = (element: Element | null, fallback: string) => {
  const text = (element?.textContent || '').replace(/\s+/g, ' ').trim();
  if (!text) return fallback;
  return text.length > 220 ? `${text.slice(0, 217)}...` : text;
};

export const detectNtBookId = (label: string): string | null => {
  const normalizedLabel = ` ${normalizeText(label)} `;
  for (const book of NT_BOOKS) {
    const hit = book.aliases.some((alias) => normalizedLabel.includes(` ${normalizeText(alias)} `));
    if (hit) return book.id;
  }
  return null;
};
