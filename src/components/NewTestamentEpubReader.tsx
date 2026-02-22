'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ePub, { type Book, type Rendition } from 'epubjs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Menu, Maximize2, Minimize2 } from 'lucide-react';
import { useSettings } from '@/context/SettingsContext';

const DEFAULT_FILE_NAME = 'nuevo-testamento.epub';

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
  cfi: string;
  excerpt: string;
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

export default function NewTestamentEpubReader() {
  const { theme } = useSettings();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const bookRef = useRef<Book | null>(null);
  const renditionRef = useRef<Rendition | null>(null);
  const hideChromeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeFile = DEFAULT_FILE_NAME;
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
  const [showReaderChrome, setShowReaderChrome] = useState(true);

  const epubUrl = `/epub/${activeFile}`;
  const locationStorageKey = useMemo(() => toStorageKey(activeFile), [activeFile]);
  const bookmarksStorageKey = useMemo(() => toBookmarksKey(activeFile), [activeFile]);
  const highlightsStorageKey = useMemo(() => toHighlightsKey(activeFile), [activeFile]);
  const tocBookAnchors = useMemo(() => {
    const map: Record<string, TocEntry> = {};
    for (const entry of tocEntries) {
      const bookId = detectNtBookId(entry.label);
      if (bookId && !map[bookId]) {
        map[bookId] = entry;
      }
    }
    return map;
  }, [tocEntries]);
  const filteredTocEntries = useMemo(() => {
    if (tocBookFilter === 'all') return tocEntries;
    return tocEntries.filter((entry) => detectNtBookId(entry.label) === tocBookFilter);
  }, [tocBookFilter, tocEntries]);
  const availablePanelTabs = useMemo<Array<'toc' | 'search' | 'bookmarks' | 'highlights'>>(() => {
    const tabs: Array<'toc' | 'search' | 'bookmarks' | 'highlights'> = ['search'];
    if (tocEntries.length > 0) tabs.unshift('toc');
    if (bookmarks.length > 0) tabs.push('bookmarks');
    if (highlights.length > 0) tabs.push('highlights');
    return tabs;
  }, [bookmarks.length, highlights.length, tocEntries.length]);

  useEffect(() => {
    if (availablePanelTabs.includes(panelTab)) return;
    setPanelTab(availablePanelTabs[0] ?? 'search');
  }, [availablePanelTabs, panelTab]);

  useEffect(() => {
    return () => {
      if (hideChromeTimerRef.current) {
        clearTimeout(hideChromeTimerRef.current);
        hideChromeTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const dispose = () => {
      renditionRef.current?.destroy?.();
      bookRef.current?.destroy?.();
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
        const response = await fetch(epubUrl, { method: 'HEAD' });
        if (!response.ok) throw new Error(`No se encontró ${epubUrl}.`);

        const book = ePub(epubUrl);
        const rendition = book.renderTo(containerRef.current, {
          width: '100%',
          height: '100%',
          flow: 'paginated',
        });

        rendition.themes.default({
          body: {
            color: theme === 'dark' ? '#f8fafc' : '#0f172a',
            background: theme === 'dark' ? '#0b1220' : '#ffffff',
          },
          '::selection': {
            background: 'rgba(251,191,36,0.45)',
          },
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

        rendition.on('relocated', (location: any) => {
          const displayed = location?.start?.displayed;
          if (displayed) {
            setLocationLabel(`${displayed.page}/${displayed.total}`);
          }
          const cfi = location?.start?.cfi;
          if (typeof cfi === 'string' && cfi.length > 0) {
            window.localStorage.setItem(locationStorageKey, cfi);
            setCurrentCfi(cfi);
          }
        });

        rendition.on('selected', (cfiRange: string, contents: any) => {
          setPendingSelectionCfi(cfiRange);
          const selectedText = contents?.window?.getSelection?.()?.toString?.() ?? '';
          setPendingSelectionText(selectedText.trim());
          contents?.window?.getSelection?.()?.removeAllRanges?.();
        });

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

        const savedCfi = window.localStorage.getItem(locationStorageKey);
        await rendition.display(savedCfi || undefined);
        if (cancelled) return;

        storedHighlights.forEach(applyHighlight);

        bookRef.current = book;
        renditionRef.current = rendition;
        setStatus('ready');
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : 'No se pudo abrir el EPUB.';
        setErrorMessage(message);
        setStatus('error');
      }
    };

    load();

    return () => {
      cancelled = true;
      dispose();
    };
  }, [bookmarksStorageKey, epubUrl, highlightsStorageKey, locationStorageKey, theme]);

  const goPrev = () => renditionRef.current?.prev();
  const goNext = () => renditionRef.current?.next();

  const scheduleChromeHide = useCallback(() => {
    if (hideChromeTimerRef.current) {
      clearTimeout(hideChromeTimerRef.current);
      hideChromeTimerRef.current = null;
    }
    if (!isReaderFullscreen || isPanelOpen) return;
    hideChromeTimerRef.current = setTimeout(() => {
      setShowReaderChrome(false);
      hideChromeTimerRef.current = null;
    }, 2200);
  }, [isPanelOpen, isReaderFullscreen]);

  const wakeReaderChrome = () => {
    if (!isReaderFullscreen) return;
    setShowReaderChrome(true);
    scheduleChromeHide();
  };

  useEffect(() => {
    if (!isReaderFullscreen) {
      setShowReaderChrome(true);
      if (hideChromeTimerRef.current) {
        clearTimeout(hideChromeTimerRef.current);
        hideChromeTimerRef.current = null;
      }
      return;
    }
    setShowReaderChrome(true);
    scheduleChromeHide();
  }, [isPanelOpen, isReaderFullscreen, scheduleChromeHide]);

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
            cfi: match.cfi,
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
    await renditionRef.current?.display(item.cfi);
    setIsPanelOpen(false);
  };

  const persistBookmarks = (next: BookmarkItem[]) => {
    setBookmarks(next);
    window.localStorage.setItem(bookmarksStorageKey, JSON.stringify(next));
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
    window.localStorage.setItem(highlightsStorageKey, JSON.stringify(next));
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
    persistHighlights([item, ...highlights]);
    setPendingSelectionCfi('');
    setPendingSelectionText('');
    setHighlightNoteDraft('');
  };

  const removeHighlight = (item: HighlightItem) => {
    (renditionRef.current as any)?.annotations?.remove(item.cfiRange, 'highlight');
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
      className={isReaderFullscreen ? 'fixed inset-0 z-[80] bg-black flex flex-col gap-3' : 'p-4 space-y-3'}
      onPointerDownCapture={wakeReaderChrome}
      style={
        isReaderFullscreen
          ? {
              paddingTop: 'max(0.5rem, env(safe-area-inset-top))',
              paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))',
              paddingLeft: 'max(0.5rem, env(safe-area-inset-left))',
              paddingRight: 'max(0.5rem, env(safe-area-inset-right))',
            }
          : undefined
      }
    >
      <div
        className={
          isReaderFullscreen
            ? showReaderChrome
              ? 'space-y-2 shrink-0 transition-all duration-200 opacity-100 max-h-[280px]'
              : 'space-y-2 shrink-0 transition-all duration-200 opacity-0 max-h-0 overflow-hidden pointer-events-none'
            : 'space-y-2 shrink-0'
        }
      >
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={goPrev} disabled={status !== 'ready'}>
          Anterior
        </Button>
        <Button variant="outline" onClick={goNext} disabled={status !== 'ready'}>
          Siguiente
        </Button>
        <Button variant="outline" size="icon" onClick={() => setIsPanelOpen(true)} aria-label="Abrir menú">
          <Menu className="h-5 w-5" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setIsReaderFullscreen((prev) => !prev)}
          aria-label={isReaderFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
        >
          {isReaderFullscreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
        </Button>
        <span className="text-xs text-muted-foreground self-center">{locationLabel ? `Página ${locationLabel}` : ''}</span>
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
      </div>

      <div
        className="relative rounded-lg border border-border bg-card/40 overflow-hidden flex-1 min-h-0"
        style={{ height: isReaderFullscreen ? undefined : '78vh' }}
      >
        <div ref={containerRef} className="h-full w-full" />
        {isReaderFullscreen ? <div className="pointer-events-none absolute inset-0 z-[5] bg-black/28" /> : null}
        <button
          type="button"
          aria-label="Página anterior"
          onClick={goPrev}
          className="absolute bottom-0 left-0 h-[58%] w-1/3 z-[15]"
        />
        <button
          type="button"
          aria-label="Página siguiente"
          onClick={goNext}
          className="absolute bottom-0 right-0 h-[58%] w-2/3 z-[15]"
        />
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
                TOC
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
                <div className="text-xs font-semibold">Viaje rápido (índice)</div>
                <select
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={tocBookFilter}
                  onChange={(e) => setTocBookFilter(e.target.value)}
                  disabled={status !== 'ready'}
                >
                  <option value="all">Todos los libros</option>
                  {NT_BOOKS.filter((book) => Boolean(tocBookAnchors[book.id])).map((book) => (
                    <option key={book.id} value={book.id}>
                      {book.label}
                    </option>
                  ))}
                </select>
                <select
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={selectedToc}
                  onChange={(e) => jumpToToc(e.target.value)}
                  disabled={status !== 'ready' || filteredTocEntries.length === 0}
                >
                  <option value="">Selecciona una sección</option>
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
                <div className="text-xs font-semibold">Buscar texto (capítulo/versículo según EPUB)</div>
                <div className="flex gap-2">
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Ej: Juan 3:16 o palabra clave"
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

            {Object.keys(tocBookAnchors).length > 0 && (
              <div className="mt-5 space-y-2">
                <div className="text-xs font-semibold">Índice Nuevo Testamento (al final del panel)</div>
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
