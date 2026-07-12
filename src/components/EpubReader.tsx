'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ePub, { type Book, type Rendition } from 'epubjs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { BookOpen, Maximize2, Menu, Search } from 'lucide-react';
import { useSettings } from '@/context/SettingsContext';
import { useScreenWakeLock } from '@/hooks/useScreenWakeLock';

const DEFAULT_FILE_NAME = 'nuevo-testamento.epub';
type EpubReaderProps = {
  fileName?: string;
  sourceBase64?: string | null;
  context?: 'nt' | 'general';
};

const toStorageKey = (fileName: string) => `cotidie_epub_location_${fileName.trim().toLowerCase()}`;
const toBookmarksKey = (fileName: string) => `cotidie_epub_bookmarks_${fileName.trim().toLowerCase()}`;
const toHighlightsKey = (fileName: string) => `cotidie_epub_highlights_${fileName.trim().toLowerCase()}`;

type TocEntry = {
  id: string;
  href: string;
  label: string;
  depth: number;
};

type SearchResult = {
  id: string;
  target: string;
  excerpt: string;
};

type StoredReaderLocation = {
  cfi?: string;
  href?: string;
};

type BookmarkItem = {
  id: string;
  cfi: string;
  label: string;
  createdAt: number;
};

type HighlightItem = {
  id: string;
  cfiRange: string;
  text: string;
  note?: string;
  createdAt: number;
};

const READER_STYLE_TAG_ID = 'cotidie-reader-colors';
const EPUB_PAGE_BOTTOM_GUARD = '2.5em';
const MIN_READER_FONT_SIZE = 60;
const MAX_READER_FONT_SIZE = 200;
const READER_FONT_SIZE_STEP = 10;

type ReaderThemeColors = {
  text: string;
  background: string;
};

const resolveCssThemeColor = (value: string, fallback: string) => {
  const normalized = value.trim();
  if (!normalized || normalized.includes('var(')) return fallback;
  return normalized.startsWith('hsl(') ? normalized : `hsl(${normalized})`;
};

const getReaderThemeColors = (theme: 'light' | 'dark'): ReaderThemeColors => {
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

const applyReaderColorsToContents = (contents: any, textColor: string, backgroundColor: string) => {
  const doc = contents?.document as Document | undefined;
  if (!doc) return;
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
    }
    body {
      padding-bottom: 1.25em !important;
    }
    body * { color: ${textColor} !important; }
    a { color: ${textColor} !important; }
  `;
};

const base64ToArrayBuffer = (input: string) => {
  const base64 = input.includes(',') ? input.split(',')[1] : input;
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
};

const safeParseList = <T,>(raw: string | null): T[] => {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
};

const flattenToc = (items: any[], depth = 0): TocEntry[] => {
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

const normalizeText = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const stripHash = (value: string) => value.split('#')[0] || value;

const parseStoredReaderLocation = (raw: string | null): StoredReaderLocation | null => {
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;

    const cfi = typeof parsed.cfi === 'string' && parsed.cfi.trim().length > 0 ? parsed.cfi : undefined;
    const href = typeof parsed.href === 'string' && parsed.href.trim().length > 0 ? parsed.href : undefined;
    return cfi || href ? { cfi, href } : null;
  } catch {
    return raw.trim().length > 0 ? { cfi: raw } : null;
  }
};

const serializeStoredReaderLocation = (location: StoredReaderLocation) => JSON.stringify(location);
const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

type NtReference = {
  bookId: string;
  chapter: number;
  verse?: number;
};

const parseNtReference = (query: string): NtReference | null => {
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

const getElementCfi = (section: any, doc: Document, element: Element) => {
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

const getExcerptFromElement = (element: Element | null, fallback: string) => {
  const text = (element?.textContent || '').replace(/\s+/g, ' ').trim();
  if (!text) return fallback;
  return text.length > 220 ? `${text.slice(0, 217)}...` : text;
};

const NT_BOOKS = [
  { id: 'mateo', label: 'Mateo', aliases: ['mateo', 'mt'] },
  { id: 'marcos', label: 'Marcos', aliases: ['marcos', 'mc'] },
  { id: 'lucas', label: 'Lucas', aliases: ['lucas', 'lc'] },
  { id: 'juan', label: 'Juan', aliases: ['juan', 'jn'] },
  { id: 'hechos', label: 'Hechos', aliases: ['hechos', 'actos'] },
  { id: 'romanos', label: 'Romanos', aliases: ['romanos', 'rom'] },
  { id: '1-corintios', label: '1 Corintios', aliases: ['1 corintios', 'i corintios'] },
  { id: '2-corintios', label: '2 Corintios', aliases: ['2 corintios', 'ii corintios'] },
  { id: 'galatas', label: 'Galatas', aliases: ['galatas', 'gal'] },
  { id: 'efesios', label: 'Efesios', aliases: ['efesios', 'efe'] },
  { id: 'filipenses', label: 'Filipenses', aliases: ['filipenses', 'flp'] },
  { id: 'colosenses', label: 'Colosenses', aliases: ['colosenses', 'col'] },
  { id: '1-tesalonicenses', label: '1 Tesalonicenses', aliases: ['1 tesalonicenses', 'i tesalonicenses'] },
  { id: '2-tesalonicenses', label: '2 Tesalonicenses', aliases: ['2 tesalonicenses', 'ii tesalonicenses'] },
  { id: '1-timoteo', label: '1 Timoteo', aliases: ['1 timoteo', 'i timoteo'] },
  { id: '2-timoteo', label: '2 Timoteo', aliases: ['2 timoteo', 'ii timoteo'] },
  { id: 'tito', label: 'Tito', aliases: ['tito'] },
  { id: 'filemon', label: 'Filemon', aliases: ['filemon'] },
  { id: 'hebreos', label: 'Hebreos', aliases: ['hebreos'] },
  { id: 'santiago', label: 'Santiago', aliases: ['santiago', 'stg'] },
  { id: '1-pedro', label: '1 Pedro', aliases: ['1 pedro', 'i pedro'] },
  { id: '2-pedro', label: '2 Pedro', aliases: ['2 pedro', 'ii pedro'] },
  { id: '1-juan', label: '1 Juan', aliases: ['1 juan', 'i juan'] },
  { id: '2-juan', label: '2 Juan', aliases: ['2 juan', 'ii juan'] },
  { id: '3-juan', label: '3 Juan', aliases: ['3 juan', 'iii juan'] },
  { id: 'judas', label: 'Judas', aliases: ['judas'] },
  { id: 'apocalipsis', label: 'Apocalipsis', aliases: ['apocalipsis', 'revelacion'] },
];

const detectNtBookId = (label: string): string | null => {
  const normalizedLabel = ` ${normalizeText(label)} `;
  for (const book of NT_BOOKS) {
    const hit = book.aliases.some((alias) => normalizedLabel.includes(` ${normalizeText(alias)} `));
    if (hit) return book.id;
  }
  return null;
};


export default function EpubReader({
  fileName,
  sourceBase64 = null,
  context = 'nt',
}: EpubReaderProps) {
  const { theme, pushDevLiveTrace, prayerTextZoom } = useSettings();
  useScreenWakeLock(true);
  const isNtContext = context === 'nt';
  const containerRef = useRef<HTMLDivElement | null>(null);
  const bookRef = useRef<Book | null>(null);
  const renditionRef = useRef<Rendition | null>(null);
  const isMountedRef = useRef(true);
  const isReaderFullscreenRef = useRef(false);
  const readerTapHandlerRef = useRef<(event: MouseEvent) => void>(() => undefined);

  const activeFile = typeof fileName === 'string' && fileName.trim().length > 0 ? fileName.trim() : DEFAULT_FILE_NAME;
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [locationLabel, setLocationLabel] = useState('');
  const [currentCfi, setCurrentCfi] = useState('');
  const [tocEntries, setTocEntries] = useState<TocEntry[]>([]);
  const [selectedToc, setSelectedToc] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [bookmarkLabel, setBookmarkLabel] = useState('');
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [highlights, setHighlights] = useState<HighlightItem[]>([]);
  const [pendingSelectionCfi, setPendingSelectionCfi] = useState('');
  const [pendingSelectionText, setPendingSelectionText] = useState('');
  const [highlightNoteDraft, setHighlightNoteDraft] = useState('');
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [panelTab, setPanelTab] = useState<'toc' | 'search' | 'bookmarks' | 'highlights'>('toc');
  const [tocBookFilter, setTocBookFilter] = useState<string>('all');
  const [isReaderFullscreen, setIsReaderFullscreen] = useState(false);
  const [readerThemeColors, setReaderThemeColors] = useState<ReaderThemeColors>(() => getReaderThemeColors(theme));
  const [readerFontSize, setReaderFontSize] = useState(() =>
    Math.min(MAX_READER_FONT_SIZE, Math.max(MIN_READER_FONT_SIZE, Math.round(prayerTextZoom * 100)))
  );
  const [navigationError, setNavigationError] = useState<string | null>(null);

  const epubUrl = `/epub/${activeFile}`;
  const locationStorageKey = useMemo(() => toStorageKey(activeFile), [activeFile]);
  const bookmarksStorageKey = useMemo(() => toBookmarksKey(activeFile), [activeFile]);
  const highlightsStorageKey = useMemo(() => toHighlightsKey(activeFile), [activeFile]);
  const readerTextColor = readerThemeColors.text;
  const readerBackgroundColor = readerThemeColors.background;
  const tocBookAnchors = useMemo(() => {
    if (!isNtContext) return {};
    const map: Record<string, TocEntry> = {};
    for (const entry of tocEntries) {
      const bookId = detectNtBookId(entry.label);
      if (bookId && !map[bookId]) {
        map[bookId] = entry;
      }
    }
    return map;
  }, [isNtContext, tocEntries]);
  const filteredTocEntries = useMemo(() => {
    if (!isNtContext || tocBookFilter === 'all') return tocEntries;
    return tocEntries.filter((entry) => detectNtBookId(entry.label) === tocBookFilter);
  }, [isNtContext, tocBookFilter, tocEntries]);
  const availablePanelTabs = useMemo<Array<'toc' | 'search' | 'bookmarks' | 'highlights'>>(() => {
    const tabs: Array<'toc' | 'search' | 'bookmarks' | 'highlights'> = ['search'];
    if (tocEntries.length > 0) tabs.unshift('toc');
    if (bookmarks.length > 0) tabs.push('bookmarks');
    if (highlights.length > 0) tabs.push('highlights');
    return tabs;
  }, [bookmarks.length, highlights.length, tocEntries.length]);

  const getSpineItems = useCallback(() => {
    const items = ((bookRef.current as any)?.spine?.spineItems ?? []) as any[];
    return Array.isArray(items) ? items : [];
  }, []);

  const getBookSpineItems = useCallback((bookId: string) => {
    const orderedBooks = NT_BOOKS
      .map((book) => ({
        id: book.id,
        href: tocBookAnchors[book.id]?.href,
      }))
      .filter((entry): entry is { id: string; href: string } => typeof entry.href === 'string' && entry.href.length > 0);

    const currentBook = orderedBooks.find((entry) => entry.id === bookId);
    if (!currentBook) return [];

    const spineItems = getSpineItems();
    const currentHref = stripHash(currentBook.href);
    const startIndex = spineItems.findIndex((item) => stripHash(item?.href || '') === currentHref);
    if (startIndex === -1) return [];

    const nextBook = orderedBooks[orderedBooks.findIndex((entry) => entry.id === bookId) + 1];
    const nextStartIndex = nextBook
      ? spineItems.findIndex((item) => stripHash(item?.href || '') === stripHash(nextBook.href))
      : -1;

    return nextStartIndex > startIndex
      ? spineItems.slice(startIndex, nextStartIndex)
      : spineItems.slice(startIndex);
  }, [getSpineItems, tocBookAnchors]);

  const persistCurrentLocation = useCallback(() => {
    const location = (renditionRef.current as any)?.currentLocation?.();
    const start = Array.isArray(location) ? location[0]?.start : location?.start;
    const cfi = typeof start?.cfi === 'string' && start.cfi.length > 0 ? start.cfi : undefined;
    const href = typeof start?.href === 'string' && start.href.length > 0 ? start.href : undefined;

    if (!cfi && !href) return;

    try {
      window.localStorage.setItem(
        locationStorageKey,
        serializeStoredReaderLocation({
          ...(cfi ? { cfi } : {}),
          ...(href ? { href } : {}),
        })
      );
    } catch {}
  }, [locationStorageKey]);

  const findNtReferenceInSection = useCallback(async (section: any, reference: NtReference): Promise<SearchResult | null> => {
    if (!bookRef.current) return null;

    await section.load(bookRef.current.load.bind(bookRef.current));
    const doc = section?.document as Document | undefined;
    if (!doc) {
      section.unload?.();
      return null;
    }

    const chapterMarkers = Array.from(doc.querySelectorAll('span.cap'));
    const chapterMarker = chapterMarkers.find((marker) => marker.textContent?.trim() === String(reference.chapter));
    if (!chapterMarker) {
      section.unload?.();
      return null;
    }

    const nextChapterMarker =
      chapterMarkers.find((marker) => marker !== chapterMarker && chapterMarker.compareDocumentPosition(marker) & Node.DOCUMENT_POSITION_FOLLOWING) || null;

    const isInsideChapter = (element: Element) => {
      const afterChapter =
        element === chapterMarker ||
        Boolean(chapterMarker.compareDocumentPosition(element) & Node.DOCUMENT_POSITION_FOLLOWING);
      const beforeNextChapter =
        !nextChapterMarker ||
        element === nextChapterMarker ||
        Boolean(element.compareDocumentPosition(nextChapterMarker) & Node.DOCUMENT_POSITION_FOLLOWING);
      return afterChapter && beforeNextChapter;
    };

    const chapterContainer = chapterMarker.closest('p, h3, h4, h5, h6') || chapterMarker.parentElement || chapterMarker;

    if (reference.verse === undefined) {
      const cfi = getElementCfi(section, doc, chapterContainer);
      const target = cfi || section.href;
      section.unload?.();
      return target
        ? {
            id: `${reference.bookId}-${reference.chapter}`,
            target,
            excerpt: getExcerptFromElement(chapterContainer, `${reference.chapter}`),
          }
        : null;
    }

    const verseMarker = Array.from(doc.querySelectorAll('sup.sup')).find((element) => {
      const value = element.textContent?.replace(/\s+/g, '').trim();
      return value === String(reference.verse) && isInsideChapter(element);
    });

    const verseContainer =
      verseMarker?.closest('p, h3, h4, h5, h6') || chapterContainer;
    const cfi = verseMarker ? getElementCfi(section, doc, verseMarker) : null;
    const target = cfi || getElementCfi(section, doc, verseContainer) || section.href;

    section.unload?.();

    return target
      ? {
          id: `${reference.bookId}-${reference.chapter}-${reference.verse}`,
          target,
          excerpt: getExcerptFromElement(
            verseContainer,
            `${reference.chapter}:${reference.verse}`
          ),
        }
      : null;
  }, []);

  useEffect(() => {
    if (availablePanelTabs.includes(panelTab)) return;
    setPanelTab(availablePanelTabs[0] ?? 'search');
  }, [availablePanelTabs, panelTab]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    isReaderFullscreenRef.current = false;
    setIsReaderFullscreen(false);
  }, [activeFile, sourceBase64]);

  useEffect(() => {
    const root = document.documentElement;
    const updateColors = () => setReaderThemeColors(getReaderThemeColors(theme));
    const frame = window.requestAnimationFrame(updateColors);
    const observer = new MutationObserver(updateColors);
    observer.observe(root, { attributes: true, attributeFilter: ['class', 'style'] });
    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [theme]);

  useEffect(() => {
    let cancelled = false;

    const dispose = () => {
      try {
        renditionRef.current?.destroy?.();
      } catch {}
      try {
        bookRef.current?.destroy?.();
      } catch {}
      renditionRef.current = null;
      bookRef.current = null;
    };

    const load = async () => {
      if (!containerRef.current) return;
      setStatus('loading');
      setErrorMessage(null);
      setLocationLabel('');
      setCurrentCfi('');
      setTocEntries([]);
      setSelectedToc('');
      setSearchResults([]);
      setPendingSelectionCfi('');
      setPendingSelectionText('');
      setHighlightNoteDraft('');
      setTocBookFilter('all');

      dispose();
      containerRef.current.innerHTML = '';

      try {
        if (!sourceBase64) {
          const response = await fetch(epubUrl, { method: 'HEAD' });
          if (!response.ok) throw new Error(`No se encontró ${epubUrl}.`);
        }

        const source = sourceBase64 ? base64ToArrayBuffer(sourceBase64) : epubUrl;
        const book = ePub(source as any);
        const rendition = book.renderTo(containerRef.current, {
          width: '100%',
          height: '100%',
          flow: 'paginated',
          spread: 'none',
          minSpreadWidth: 9999,
        });

        rendition.themes.default({
          body: {
            color: readerTextColor,
            background: readerBackgroundColor,
          },
          '::selection': {
            background: 'rgba(251,191,36,0.45)',
          },
        });
        rendition.themes.override('color', readerTextColor);
        rendition.themes.override('background', readerBackgroundColor);
        rendition.themes.override('background-color', readerBackgroundColor);
        rendition.themes.fontSize(`${readerFontSize}%`);
        rendition.hooks.content.register((contents: any) => {
          applyReaderColorsToContents(contents, readerTextColor, readerBackgroundColor);
          const doc = contents?.document as Document | undefined;
          if (!doc || doc.documentElement.dataset.cotidieReaderTapBound === 'true') return;
          doc.documentElement.dataset.cotidieReaderTapBound = 'true';
          doc.addEventListener('click', (event) => readerTapHandlerRef.current(event));
        });

        const applyHighlight = (item: HighlightItem) => {
          (rendition as any).annotations.add(
            'highlight',
            item.cfiRange,
            { id: item.id },
            undefined,
            'cotidie-highlight',
            {
              fill: '#facc15',
              'fill-opacity': '0.35',
              'mix-blend-mode': 'multiply',
            }
          );
        };

        const onRelocated = (location: any) => {
          try {
            if (cancelled || !isMountedRef.current) return;
            const displayed = location?.start?.displayed;
            if (displayed) {
              setLocationLabel(`${displayed.page}/${displayed.total}`);
            }
            const cfi = location?.start?.cfi;
            const href = location?.start?.href;
            if (typeof cfi === 'string' && cfi.length > 0) {
              const locationPayload = serializeStoredReaderLocation({
                cfi,
                ...(typeof href === 'string' && href.length > 0 ? { href } : {}),
              });
              try {
                window.localStorage.setItem(locationStorageKey, locationPayload);
              } catch {}
              setCurrentCfi(cfi);

              // Emit event for debug or external sync if needed
              pushDevLiveTrace({
                level: 'info',
                source: 'epub-reader',
                message: 'Ubicacion guardada.',
                data: `cfi=${cfi.slice(0, 30)}...`,
              });
            }
          } catch (err) {
            const message = err instanceof Error ? err.message : 'Fallo en callback relocated.';
            pushDevLiveTrace({
              level: 'warn',
              source: 'epub-reader',
              message: 'Error no fatal en relocated.',
              data: message,
            });
          }
        };

        const onSelected = (cfiRange: string, contents: any) => {
          try {
            if (cancelled || !isMountedRef.current) return;
            setPendingSelectionCfi(cfiRange);
            const selectedText = contents?.window?.getSelection?.()?.toString?.() ?? '';
            setPendingSelectionText(selectedText.trim());
            contents?.window?.getSelection?.()?.removeAllRanges?.();
          } catch (err) {
            const message = err instanceof Error ? err.message : 'Fallo en callback selected.';
            pushDevLiveTrace({
              level: 'warn',
              source: 'epub-reader',
              message: 'Error no fatal en selected.',
              data: message,
            });
          }
        };

        rendition.on('relocated', onRelocated);
        rendition.on('selected', onSelected);

        const nav = await book.loaded.navigation;
        if (!cancelled) {
          setTocEntries(flattenToc(nav?.toc || []));
        }

        const storedBookmarks = safeParseList<BookmarkItem>(window.localStorage.getItem(bookmarksStorageKey))
          .filter((item) => typeof item?.cfi === 'string' && typeof item?.label === 'string');
        if (!cancelled) setBookmarks(storedBookmarks);

        const storedHighlights = safeParseList<HighlightItem>(window.localStorage.getItem(highlightsStorageKey))
          .filter((item) => typeof item?.cfiRange === 'string');
        if (!cancelled) setHighlights(storedHighlights);

        const savedLocation = parseStoredReaderLocation(window.localStorage.getItem(locationStorageKey));
        try {
          if (savedLocation?.cfi) {
            await rendition.display(savedLocation.cfi);
          } else if (savedLocation?.href) {
            await rendition.display(savedLocation.href);
          } else {
            await rendition.display(undefined);
          }
        } catch (err) {
          console.warn('Fallo al restaurar ubicacion guardada:', err);
          if (!cancelled) {
            await rendition.display(undefined).catch(() => undefined);
          }
        }
        if (cancelled) return;

        const currentContents = (rendition as any).getContents?.() ?? [];
        currentContents.forEach((contents: any) =>
          applyReaderColorsToContents(contents, readerTextColor, readerBackgroundColor)
        );

        storedHighlights.forEach(applyHighlight);

        bookRef.current = book;
        renditionRef.current = rendition;
        (renditionRef.current as any).__cotidieOnRelocated = onRelocated;
        (renditionRef.current as any).__cotidieOnSelected = onSelected;
        setStatus('ready');
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : 'No se pudo abrir el EPUB.';
        pushDevLiveTrace({
          level: 'error',
          source: 'epub-reader',
          message: 'Error al abrir EPUB.',
          data: message,
        });
        setErrorMessage(message);
        setStatus('error');
      }
    };

    load();

    return () => {
      cancelled = true;
      const r: any = renditionRef.current as any;
      try {
        r?.off?.('relocated', r?.__cotidieOnRelocated);
        r?.off?.('selected', r?.__cotidieOnSelected);
      } catch {}
      dispose();
    };
  }, [bookmarksStorageKey, epubUrl, highlightsStorageKey, locationStorageKey, sourceBase64]);

  useEffect(() => {
    const rendition = renditionRef.current;
    if (!rendition) return;
    rendition.themes.override('color', readerTextColor);
    rendition.themes.override('background', readerBackgroundColor);
    rendition.themes.override('background-color', readerBackgroundColor);
    const currentContents = (rendition as any).getContents?.() ?? [];
    currentContents.forEach((contents: any) => applyReaderColorsToContents(contents, readerTextColor, readerBackgroundColor));
  }, [readerBackgroundColor, readerTextColor]);

  const refreshRenditionLayout = useCallback(() => {
    const rendition = renditionRef.current as any;
    const container = containerRef.current;
    if (!rendition || !container) return;
    const width = container.clientWidth;
    const height = container.clientHeight;
    if (width <= 0 || height <= 0) return;
    rendition.resize?.(width, height);
  }, []);

  useEffect(() => {
    const rendition = renditionRef.current;
    if (!rendition) return;
    rendition.themes.fontSize(`${readerFontSize}%`);
    const tick = window.setTimeout(() => refreshRenditionLayout(), 60);
    return () => window.clearTimeout(tick);
  }, [readerFontSize, refreshRenditionLayout]);

  useEffect(() => {
    const tick = window.setTimeout(() => refreshRenditionLayout(), 60);
    return () => window.clearTimeout(tick);
  }, [isReaderFullscreen, refreshRenditionLayout]);

  useEffect(() => {
    const onResize = () => refreshRenditionLayout();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [refreshRenditionLayout]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => refreshRenditionLayout());
    observer.observe(container);
    return () => observer.disconnect();
  }, [refreshRenditionLayout]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (typeof document === 'undefined' || document.visibilityState !== 'hidden') return;
      persistCurrentLocation();
    };

    window.addEventListener('pagehide', persistCurrentLocation);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('pagehide', persistCurrentLocation);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      persistCurrentLocation();
    };
  }, [persistCurrentLocation]);

  const moveBySpine = async (delta: -1 | 1) => {
    const rendition = renditionRef.current as any;
    const book = bookRef.current as any;
    const loc = rendition?.currentLocation?.();
    const start = Array.isArray(loc) ? loc[0]?.start : loc?.start;
    const index = typeof start?.index === 'number' ? start.index : null;
    const items = Array.isArray(book?.spine?.spineItems) ? book.spine.spineItems : null;
    if (index === null || !items) throw new Error('Ubicacion de pagina no disponible.');
    const nextItem = items[index + delta];
    const href = nextItem?.href || nextItem?.url;
    if (!href) throw new Error('No hay mas paginas disponibles.');
    await rendition.display(href);
  };

  const goPrev = () => {
    const rendition = renditionRef.current as any;
    if (!rendition) return;
    Promise.resolve(rendition.prev?.())
      .then(() => setNavigationError(null))
      .catch(async () => {
        try {
          await moveBySpine(-1);
          setNavigationError(null);
        } catch (err) {
          const message = err instanceof Error ? err.message : 'No se pudo retroceder de pagina.';
          setNavigationError(message);
          pushDevLiveTrace({
            level: 'error',
            source: 'epub-reader',
            message: 'Error al retroceder de pagina.',
            data: message,
          });
        }
      })
      .finally(() => {
        window.setTimeout(() => refreshRenditionLayout(), 40);
      });
  };

  const goNext = () => {
    const rendition = renditionRef.current as any;
    if (!rendition) return;
    Promise.resolve(rendition.next?.())
      .then(() => setNavigationError(null))
      .catch(async () => {
        try {
          await moveBySpine(1);
          setNavigationError(null);
        } catch (err) {
          const message = err instanceof Error ? err.message : 'No se pudo avanzar de pagina.';
          setNavigationError(message);
          pushDevLiveTrace({
            level: 'error',
            source: 'epub-reader',
            message: 'Error al avanzar de pagina.',
            data: message,
          });
        }
      })
      .finally(() => {
        window.setTimeout(() => refreshRenditionLayout(), 40);
      });
  };

  const openReaderPanel = (tab: 'toc' | 'search' | 'bookmarks' | 'highlights') => {
    if (availablePanelTabs.includes(tab)) {
      setPanelTab(tab);
    }
    setIsPanelOpen(true);
  };

  const enterReaderFullscreen = () => {
    setIsPanelOpen(false);
    isReaderFullscreenRef.current = true;
    setIsReaderFullscreen(true);
    window.setTimeout(() => refreshRenditionLayout(), 80);
  };

  const exitReaderFullscreen = () => {
    isReaderFullscreenRef.current = false;
    setIsReaderFullscreen(false);
    window.setTimeout(() => refreshRenditionLayout(), 80);
  };

  readerTapHandlerRef.current = (event) => {
    if (isReaderFullscreenRef.current) return;
    const selection = event.view?.getSelection?.()?.toString().trim() ?? '';
    if (selection) return;
    const target = event.target as Element | null;
    if (target?.closest?.('a, button, input, textarea, select')) return;
    enterReaderFullscreen();
  };

  useEffect(() => {
    if (!isReaderFullscreen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        exitReaderFullscreen();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isReaderFullscreen]);

  const jumpToToc = async (href: string) => {
    setSelectedToc(href);
    await renditionRef.current?.display(href);
    setIsPanelOpen(false);
  };

  const jumpToBook = async (bookId: string) => {
    const anchor = tocBookAnchors[bookId];
    if (!anchor) return;
    await jumpToToc(anchor.href);
  };

  const searchInBook = async () => {
    const query = searchQuery.trim();
    if (!query || !bookRef.current) return;
    setIsSearching(true);
    setSearchResults([]);
    try {
      const ntReference = isNtContext ? parseNtReference(query) : null;
      if (ntReference) {
        const referenceSections = getBookSpineItems(ntReference.bookId);
        for (const section of referenceSections) {
          const match = await findNtReferenceInSection(section, ntReference);
          if (!match) continue;
          setSearchResults([match]);
          setIsSearching(false);
          return;
        }
      }

      const results: SearchResult[] = [];
      const spineItems: any[] = [];
      const spine = (bookRef.current as any).spine;
      if (spine?.each) {
        spine.each((section: any) => {
          spineItems.push(section);
        });
      }

      for (const section of spineItems) {
        await section.load(bookRef.current.load.bind(bookRef.current));
        const matches = typeof section.search === 'function' ? section.search(query) : section.find(query);
        for (const match of matches || []) {
          if (typeof match?.cfi !== 'string') continue;
          results.push({
            id: `${section.href || section.idref || 's'}-${match.cfi}`,
            target: match.cfi,
            excerpt: typeof match?.excerpt === 'string' ? match.excerpt : query,
          });
          if (results.length >= 200) break;
        }
        section.unload?.();
        if (results.length >= 200) break;
      }
      setSearchResults(results);
    } finally {
      setIsSearching(false);
    }
  };

  const openSearchResult = async (item: SearchResult) => {
    await renditionRef.current?.display(item.target);
    setIsPanelOpen(false);
  };

  const persistBookmarks = (next: BookmarkItem[]) => {
    setBookmarks(next);
    try {
      window.localStorage.setItem(bookmarksStorageKey, JSON.stringify(next));
    } catch {}
  };

  const addBookmark = () => {
    if (!currentCfi) return;
    const label = bookmarkLabel.trim() || `Marcador ${new Date().toLocaleString()}`;
    const item: BookmarkItem = {
      id: crypto.randomUUID(),
      cfi: currentCfi,
      label,
      createdAt: Date.now(),
    };
    persistBookmarks([item, ...bookmarks]);
    setBookmarkLabel('');
  };

  const removeBookmark = (id: string) => {
    persistBookmarks(bookmarks.filter((b) => b.id !== id));
  };

  const persistHighlights = (next: HighlightItem[]) => {
    setHighlights(next);
    try {
      window.localStorage.setItem(highlightsStorageKey, JSON.stringify(next));
    } catch {}
  };

  const addHighlightFromSelection = () => {
    if (!pendingSelectionCfi || !renditionRef.current) return;
    const note = highlightNoteDraft.trim();
    const item: HighlightItem = {
      id: crypto.randomUUID(),
      cfiRange: pendingSelectionCfi,
      text: pendingSelectionText || '(sin texto)',
      note: note.length > 0 ? note : undefined,
      createdAt: Date.now(),
    };
    try {
      (renditionRef.current as any).annotations.add(
        'highlight',
        item.cfiRange,
        { id: item.id },
        undefined,
        'cotidie-highlight',
        {
          fill: '#facc15',
          'fill-opacity': '0.35',
          'mix-blend-mode': 'multiply',
        }
      );
    } catch {}
    persistHighlights([item, ...highlights]);
    setPendingSelectionCfi('');
    setPendingSelectionText('');
    setHighlightNoteDraft('');
  };

  const removeHighlight = (item: HighlightItem) => {
    try {
      (renditionRef.current as any)?.annotations?.remove(item.cfiRange, 'highlight');
    } catch {}
    persistHighlights(highlights.filter((h) => h.id !== item.id));
  };

  const updateHighlightNote = (id: string, note: string) => {
    const next = highlights.map((item) =>
      item.id === id ? { ...item, note: note.trim().length > 0 ? note.trim() : undefined } : item
    );
    persistHighlights(next);
  };

  return (
    <div
      className={isReaderFullscreen ? 'fixed inset-0 z-[120] flex flex-col' : 'flex flex-col h-full min-h-0 gap-3'}
      style={
        isReaderFullscreen
          ? {
              height: '100dvh',
              maxHeight: '100dvh',
              backgroundColor: readerBackgroundColor,
              paddingTop: 'env(safe-area-inset-top, 0px)',
              paddingBottom: 'env(safe-area-inset-bottom, 0px)',
              paddingLeft: 'env(safe-area-inset-left, 0px)',
              paddingRight: 'env(safe-area-inset-right, 0px)',
            }
          : {
              paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 0px))',
            }
      }
    >
      <div
        className={isReaderFullscreen ? 'hidden' : 'space-y-2 shrink-0'}
      >
        <div className="rounded-lg border border-border bg-card/95 p-3 shadow-sm backdrop-blur">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <div className="rounded-md bg-primary/10 p-2 text-primary">
                <BookOpen className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold">{isNtContext ? 'Nuevo Testamento' : 'Lector EPUB'}</div>
                <div className="truncate text-xs text-muted-foreground">
                  {locationLabel ? `Página ${locationLabel}` : status === 'ready' ? 'Lectura lista' : 'Preparando lectura'}
                </div>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <Button
                variant="outline"
                size="icon"
                onClick={() => openReaderPanel('search')}
                disabled={status !== 'ready'}
                aria-label="Buscar en el EPUB"
              >
                <Search className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={enterReaderFullscreen}
                aria-label="Pantalla completa"
              >
                <Maximize2 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => openReaderPanel(panelTab)}
                aria-label="Abrir panel de lectura"
              >
                <Menu className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between gap-3 rounded-md border border-border bg-background/60 px-2 py-1.5">
            <span className="text-xs text-muted-foreground">Tamaño de texto</span>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() =>
                  setReaderFontSize((current) =>
                    Math.max(MIN_READER_FONT_SIZE, current - READER_FONT_SIZE_STEP)
                  )
                }
                disabled={readerFontSize <= MIN_READER_FONT_SIZE}
                aria-label="Disminuir tamaño de texto"
              >
                <span className="text-xs font-semibold">A</span>
              </Button>
              <span className="min-w-11 text-center text-xs tabular-nums text-muted-foreground">
                {readerFontSize}%
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() =>
                  setReaderFontSize((current) =>
                    Math.min(MAX_READER_FONT_SIZE, current + READER_FONT_SIZE_STEP)
                  )
                }
                disabled={readerFontSize >= MAX_READER_FONT_SIZE}
                aria-label="Aumentar tamaño de texto"
              >
                <span className="text-lg font-semibold">A</span>
              </Button>
            </div>
          </div>
        </div>

      {pendingSelectionCfi ? (
        <div className="space-y-2 rounded-md border border-border p-2 bg-background/60">
          <div className="text-xs text-muted-foreground">
            Selección lista para subrayar: {pendingSelectionText || '(sin texto)'}
          </div>
          <div className="flex flex-wrap gap-2">
            <Input
              value={highlightNoteDraft}
              onChange={(e) => setHighlightNoteDraft(e.target.value)}
              placeholder="Nota opcional para este subrayado"
            />
            <Button
              variant="outline"
              onClick={addHighlightFromSelection}
              disabled={!pendingSelectionCfi || status !== 'ready'}
            >
              Subrayar selección
            </Button>
            <Input
              value={bookmarkLabel}
              onChange={(e) => setBookmarkLabel(e.target.value)}
              placeholder="Nombre del marcador"
            />
            <Button variant="outline" onClick={addBookmark} disabled={!currentCfi || status !== 'ready'}>
              Guardar marcador
            </Button>
          </div>
        </div>
      ) : null}

      {status === 'loading' && <div className="text-xs text-muted-foreground">Cargando EPUB...</div>}
      {status === 'error' && (
        <div className="text-xs text-destructive">
          {errorMessage ?? 'No se pudo abrir el EPUB.'}
        </div>
      )}
      {navigationError && status === 'ready' && (
        <div className="text-xs text-destructive">{navigationError}</div>
      )}
      </div>

      <div
        className={isReaderFullscreen
          ? 'relative overflow-hidden flex-1 min-h-0'
          : 'relative rounded-lg border border-border bg-card/40 overflow-hidden flex-1 min-h-0'
        }
        style={isReaderFullscreen ? { backgroundColor: readerBackgroundColor } : undefined}
      >
        <div
          ref={containerRef}
          className="h-full w-full min-h-0"
          style={{
            height: `calc(100% - ${EPUB_PAGE_BOTTOM_GUARD})`,
          }}
        />
        <div className="pointer-events-none absolute inset-0 z-[30]">
          <button
            type="button"
            aria-label="Pagina anterior"
            onClick={goPrev}
            disabled={status !== 'ready'}
            className="pointer-events-auto absolute inset-y-0 left-0 w-1/4"
          />
          <button
            type="button"
            aria-label="Pagina siguiente"
            onClick={goNext}
            disabled={status !== 'ready'}
            className="pointer-events-auto absolute inset-y-0 right-0 w-1/3"
          />
        </div>
        {isReaderFullscreen ? (
          <button
            type="button"
            aria-label="Salir de pantalla completa"
            onClick={exitReaderFullscreen}
            className="absolute left-1/3 right-1/3 top-0 z-[40] h-1/2 opacity-0"
          />
        ) : null}
      </div>

      <Sheet open={isPanelOpen} onOpenChange={setIsPanelOpen}>
        <SheetContent
          side="left"
          className="w-[92vw] sm:max-w-md p-4 overflow-y-auto"
          style={{
            paddingTop: 'max(1rem, env(safe-area-inset-top))',
            paddingBottom: 'max(1rem, env(safe-area-inset-bottom))',
            paddingLeft: 'max(1rem, env(safe-area-inset-left))',
            paddingRight: 'max(1rem, env(safe-area-inset-right))',
          }}
        >
          <SheetHeader>
            <SheetTitle>Panel de lectura</SheetTitle>
            <SheetDescription>Índice, búsqueda, marcadores y subrayados.</SheetDescription>
          </SheetHeader>

          <div className="mt-4 flex gap-2">
            {availablePanelTabs.includes('toc') && (
              <Button size="sm" variant={panelTab === 'toc' ? 'default' : 'outline'} onClick={() => setPanelTab('toc')}>
                Índice
              </Button>
            )}
            {availablePanelTabs.includes('search') && (
              <Button
                size="sm"
                variant={panelTab === 'search' ? 'default' : 'outline'}
                onClick={() => setPanelTab('search')}
              >
                Buscar
              </Button>
            )}
            {availablePanelTabs.includes('bookmarks') && (
              <Button
                size="sm"
                variant={panelTab === 'bookmarks' ? 'default' : 'outline'}
                onClick={() => setPanelTab('bookmarks')}
              >
                Marcadores
              </Button>
            )}
            {availablePanelTabs.includes('highlights') && (
              <Button
                size="sm"
                variant={panelTab === 'highlights' ? 'default' : 'outline'}
                onClick={() => setPanelTab('highlights')}
              >
                Subrayados
              </Button>
            )}
          </div>

          <div className="mt-4">
            {panelTab === 'toc' && (
              <div className="space-y-2">
                <div className="text-xs font-semibold">Índice</div>
                {isNtContext && Object.keys(tocBookAnchors).length > 0 ? (
                  <select
                    id="epub-reader-toc-book"
                    name="epub-reader-toc-book"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={tocBookFilter}
                    onChange={(e) => setTocBookFilter(e.target.value)}
                    disabled={status !== 'ready'}
                    aria-label="Libro del índice"
                  >
                    <option value="all">Todos los libros</option>
                    {NT_BOOKS.filter((book) => Boolean(tocBookAnchors[book.id])).map((book) => (
                      <option key={book.id} value={book.id}>
                        {book.label}
                      </option>
                    ))}
                  </select>
                ) : null}
                <select
                  id="epub-reader-toc-entry"
                  name="epub-reader-toc-entry"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={selectedToc}
                  onChange={(e) => jumpToToc(e.target.value)}
                  disabled={status !== 'ready' || filteredTocEntries.length === 0}
                  aria-label="Sección del índice"
                >
                  <option value="">{filteredTocEntries.length === 0 ? 'Sin secciones' : 'Selecciona una sección'}</option>
                  {filteredTocEntries.map((entry) => (
                    <option key={entry.id} value={entry.href}>
                      {`${'  '.repeat(entry.depth)}${entry.label}`}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {panelTab === 'search' && (
              <div className="space-y-2">
                <div className="text-xs font-semibold">{isNtContext ? 'Buscar texto o referencia bíblica' : 'Buscar texto'}</div>
                <div className="flex gap-2">
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={isNtContext ? 'Ej: Juan 3:16 o palabra clave' : 'Escribe una palabra o frase'}
                  />
                  <Button variant="outline" onClick={searchInBook} disabled={status !== 'ready' || isSearching}>
                    {isSearching ? 'Buscando...' : 'Buscar'}
                  </Button>
                </div>
                <div className="max-h-80 overflow-auto rounded-md border border-border bg-background/60 p-2 space-y-1">
                  {searchResults.length === 0 ? (
                    <div className="text-xs text-muted-foreground">Sin resultados.</div>
                  ) : (
                    searchResults.map((item) => (
                      <button
                        key={item.id}
                        className="w-full text-left text-xs hover:bg-accent/30 rounded px-2 py-1"
                        onClick={() => openSearchResult(item)}
                      >
                        {item.excerpt}
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}

            {panelTab === 'bookmarks' && (
              <div className="space-y-2">
                <div className="text-xs font-semibold">Marcadores</div>
                <div className="max-h-80 overflow-auto rounded-md border border-border bg-background/60 p-2 space-y-1">
                  {bookmarks.length === 0 ? (
                    <div className="text-xs text-muted-foreground">Sin marcadores.</div>
                  ) : (
                    bookmarks.map((item) => (
                      <div key={item.id} className="flex items-center gap-1">
                        <button
                          className="flex-1 text-left text-xs hover:underline"
                          onClick={() => {
                            renditionRef.current?.display(item.cfi);
                            setIsPanelOpen(false);
                          }}
                        >
                          {item.label}
                        </button>
                        <Button size="sm" variant="ghost" onClick={() => removeBookmark(item.id)}>
                          x
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {panelTab === 'highlights' && (
              <div className="space-y-2">
                <div className="text-xs font-semibold">Subrayados</div>
                <div className="max-h-80 overflow-auto rounded-md border border-border bg-background/60 p-2 space-y-2">
                  {highlights.length === 0 ? (
                    <div className="text-xs text-muted-foreground">Sin subrayados.</div>
                  ) : (
                    highlights.map((item) => (
                      <div key={item.id} className="rounded border border-border/60 p-2 space-y-1">
                        <button
                          className="w-full text-left text-xs hover:underline"
                          onClick={() => {
                            renditionRef.current?.display(item.cfiRange);
                            setIsPanelOpen(false);
                          }}
                        >
                          {item.text}
                        </button>
                        <Input
                          value={item.note ?? ''}
                          onChange={(e) => updateHighlightNote(item.id, e.target.value)}
                          placeholder="Nota opcional"
                        />
                        <div className="flex justify-end">
                          <Button size="sm" variant="ghost" onClick={() => removeHighlight(item)}>
                            Eliminar
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {isNtContext && Object.keys(tocBookAnchors).length > 0 && (
              <div className="mt-5 space-y-2">
                <div className="text-xs font-semibold">Índice Nuevo Testamento</div>
                <div className="max-h-40 overflow-auto rounded-md border border-border bg-background/60 p-2 grid grid-cols-1 gap-1">
                  {NT_BOOKS.map((book) => {
                    const anchor = tocBookAnchors[book.id];
                    if (!anchor) return null;
                    return (
                      <Button
                        key={book.id}
                        size="sm"
                        variant="outline"
                        className="justify-start text-left h-auto py-1.5"
                        onClick={() => jumpToBook(book.id)}
                      >
                        {book.label}
                      </Button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}







