'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import ePub, { EpubCFI, type Book, type Rendition } from 'epubjs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { ArrowLeft, BookOpen, Menu, Search } from 'lucide-react';
import { useSettings } from '@/context/SettingsContext';
import { useScreenWakeLock } from '@/hooks/useScreenWakeLock';
import { cn } from '@/lib/utils';

import {
  DEFAULT_FILE_NAME,
  EPUB_FONT_SIZE_STORAGE_KEY,
  READER_STYLE_TAG_ID,
  READER_FONT_STYLESHEET_ID,
  EPUB_PAGE_BOTTOM_GUARD,
  MIN_READER_FONT_SIZE,
  MAX_READER_FONT_SIZE,
  READER_FONT_SIZE_STEP,
  READER_FONT_FAMILIES,
  READER_RESIZE_DEBOUNCE_MS,
  READER_MAX_RESTORE_SUPPRESSION_MS,
  READER_MAX_RESTORE_NUDGE_STEPS,
  NT_BOOKS,
} from '@/lib/epub-reader/constants';
import type {
  EpubReaderProps,
  TocEntry,
  SearchResult,
  StoredReaderLocation,
  BookmarkItem,
  HighlightItem,
  ReaderThemeColors,
  NtReference,
} from '@/lib/epub-reader/types';
import {
  toStorageKey,
  toBookmarksKey,
  toHighlightsKey,
  getStoredReaderFontSize,
  resolveCssThemeColor,
  getReaderThemeColors,
  applyReaderAppearanceToContents,
  base64ToArrayBuffer,
  safeParseList,
  flattenToc,
  normalizeText,
  stripHash,
  parseStoredReaderLocation,
  serializeStoredReaderLocation,
  getRenditionLocation,
  escapeRegExp,
  parseNtReference,
  getElementCfi,
  getExcerptFromElement,
  detectNtBookId,
} from '@/lib/epub-reader/helpers';
import { ReaderTocPanel } from '@/components/epub-reader/ReaderTocPanel';
import { ReaderSearchPanel } from '@/components/epub-reader/ReaderSearchPanel';
import { ReaderBookmarksPanel } from '@/components/epub-reader/ReaderBookmarksPanel';
import { ReaderHighlightsPanel } from '@/components/epub-reader/ReaderHighlightsPanel';
import { ReaderSelectionToolbar } from '@/components/epub-reader/ReaderSelectionToolbar';

export default function EpubReader({
  fileName,
  sourceBase64 = null,
  context = 'nt',
  onClose,
}: EpubReaderProps) {
  const { theme, fontFamily, pushDevLiveTrace, prayerTextZoom } = useSettings();
  useScreenWakeLock(true);
  const isNtContext = context === 'nt';
  const containerRef = useRef<HTMLDivElement | null>(null);
  const bookRef = useRef<Book | null>(null);
  const renditionRef = useRef<Rendition | null>(null);
  const isMountedRef = useRef(true);
  const showControlsRef = useRef(true);
  const readerTapHandlerRef = useRef<(event: MouseEvent) => void>(() => undefined);
  const stableLocationRef = useRef<StoredReaderLocation | null>(null);
  const hasDisplayedOnceRef = useRef(false);
  const isRestoringLocationRef = useRef(true);
  const restoringSinceRef = useRef<number | null>(null);
  const lastLayoutSizeRef = useRef<{ width: number; height: number } | null>(null);
  const resizeReleaseTimerRef = useRef<number | null>(null);
  const resizeDebounceTimerRef = useRef<number | null>(null);
  const highlightNoteDraftRef = useRef('');
  const bookmarkLabelRef = useRef('');

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
  const [showControls, setShowControls] = useState(true);
  const [readerThemeColors, setReaderThemeColors] = useState<ReaderThemeColors>(() => getReaderThemeColors(theme));
  const [readerFontSize, setReaderFontSize] = useState(() =>
    getStoredReaderFontSize(prayerTextZoom * 100)
  );
  const [navigationError, setNavigationError] = useState<string | null>(null);

  const epubUrl = `/epub/${activeFile}`;
  const locationStorageKey = useMemo(() => toStorageKey(activeFile), [activeFile]);
  const bookmarksStorageKey = useMemo(() => toBookmarksKey(activeFile), [activeFile]);
  const highlightsStorageKey = useMemo(() => toHighlightsKey(activeFile), [activeFile]);
  const readerTextColor = readerThemeColors.text;
  const readerBackgroundColor = readerThemeColors.background;
  const readerFontFamily = READER_FONT_FAMILIES[fontFamily] ?? READER_FONT_FAMILIES.literata;
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
    const tabs: Array<'toc' | 'search' | 'bookmarks' | 'highlights'> = ['search', 'highlights'];
    if (tocEntries.length > 0) tabs.unshift('toc');
    if (bookmarks.length > 0) tabs.push('bookmarks');
    return tabs;
  }, [bookmarks.length, tocEntries.length]);

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

  const persistReaderLocation = useCallback((location: StoredReaderLocation | null) => {
    if (!location?.endCfi && !location?.cfi && !location?.href) return;
    stableLocationRef.current = location;
    const visibleCfi = location.cfi ?? location.endCfi;
    if (visibleCfi) setCurrentCfi(visibleCfi);
    try {
      window.localStorage.setItem(locationStorageKey, serializeStoredReaderLocation(location));
    } catch {}
  }, [locationStorageKey]);

  const persistCurrentLocation = useCallback(() => {
    // Prefer the live query: stableLocationRef can be stale for up to
    // READER_MAX_RESTORE_SUPPRESSION_MS after a resize (onRelocated skips
    // updating it while isRestoringLocationRef is true), but this is called
    // at moments where there's no next chance to correct it (pagehide,
    // visibility change), so the true current position always wins when
    // it's available.
    const currentLocation = getRenditionLocation(renditionRef.current);
    const stableLocation = stableLocationRef.current;
    persistReaderLocation(currentLocation ?? stableLocation);
  }, [persistReaderLocation]);

  // (Re)schedules the release of the "restoring" suppression window, capped
  // at READER_MAX_RESTORE_SUPPRESSION_MS from when restoring first began, so
  // a burst of resize events landing back-to-back can't keep pushing it out
  // indefinitely.
  const scheduleRestoreRelease = useCallback((delayMs: number) => {
    const now = Date.now();
    if (restoringSinceRef.current === null) {
      restoringSinceRef.current = now;
    }
    const remainingBudget = READER_MAX_RESTORE_SUPPRESSION_MS - (now - restoringSinceRef.current);
    const effectiveDelay = Math.max(0, Math.min(delayMs, remainingBudget));
    if (resizeReleaseTimerRef.current !== null) {
      window.clearTimeout(resizeReleaseTimerRef.current);
    }
    resizeReleaseTimerRef.current = window.setTimeout(() => {
      isRestoringLocationRef.current = false;
      restoringSinceRef.current = null;
      resizeReleaseTimerRef.current = null;
    }, effectiveDelay);
  }, []);

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
    highlightNoteDraftRef.current = highlightNoteDraft;
  }, [highlightNoteDraft]);

  useEffect(() => {
    bookmarkLabelRef.current = bookmarkLabel;
  }, [bookmarkLabel]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    showControlsRef.current = true;
    stableLocationRef.current = null;
    hasDisplayedOnceRef.current = false;
    isRestoringLocationRef.current = true;
    restoringSinceRef.current = null;
    lastLayoutSizeRef.current = null;
    if (resizeReleaseTimerRef.current !== null) {
      window.clearTimeout(resizeReleaseTimerRef.current);
      resizeReleaseTimerRef.current = null;
    }
    if (resizeDebounceTimerRef.current !== null) {
      window.clearTimeout(resizeDebounceTimerRef.current);
      resizeDebounceTimerRef.current = null;
    }
    setShowControls(true);
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
    try {
      window.localStorage.setItem(EPUB_FONT_SIZE_STORAGE_KEY, String(readerFontSize));
    } catch {}
  }, [readerFontSize]);

  useEffect(() => {
    let cancelled = false;
    let activeBook: Book | null = null;
    let activeRendition: Rendition | null = null;
    let activeLoadPromise: Promise<void> | null = null;

    const dispose = () => {
      if (renditionRef.current === activeRendition) renditionRef.current = null;
      if (bookRef.current === activeBook) bookRef.current = null;
      const bookToDispose = activeBook;
      const renditionToDispose = activeRendition;
      const opened = (bookToDispose as any)?.opened;
      const started = (renditionToDispose as any)?.started;
      const loading = activeLoadPromise;
      activeRendition = null;
      activeBook = null;

      const destroyBook = () => {
        try {
          if (bookToDispose) {
            bookToDispose.destroy?.();
          } else {
            renditionToDispose?.destroy?.();
          }
        } catch {}
      };
      const pendingLifecycle = [loading, opened, started].filter(
        (task): task is Promise<unknown> => Boolean(task && typeof task.then === 'function')
      );
      if (pendingLifecycle.length > 0) {
        // epub.js finishes internal CSS/resource replacement asynchronously.
        // Its rendition also processes queued start/display work; wait for the
        // complete load lifecycle before clearing objects during a quick exit.
        void Promise.allSettled(pendingLifecycle).finally(destroyBook);
      } else {
        destroyBook();
      }
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

      containerRef.current.innerHTML = '';

      try {
        if (!sourceBase64) {
          const response = await fetch(epubUrl, { method: 'HEAD' });
          if (!response.ok) throw new Error(`No se encontró ${epubUrl}.`);
        }
        if (cancelled) return;

        const source = sourceBase64 ? base64ToArrayBuffer(sourceBase64) : epubUrl;
        const book = ePub(source as any);
        const initialWidth = containerRef.current.clientWidth;
        const initialHeight = containerRef.current.clientHeight;
        const rendition = book.renderTo(containerRef.current, {
          width: initialWidth,
          height: initialHeight,
          flow: 'paginated',
          spread: 'none',
          minSpreadWidth: 9999,
          resizeOnOrientationChange: false,
        });
        activeBook = book;
        activeRendition = rendition;
        bookRef.current = book;
        renditionRef.current = rendition;

        rendition.themes.default({
          body: {
            color: readerTextColor,
            background: readerBackgroundColor,
            'font-family': readerFontFamily,
          },
          '::selection': {
            background: 'rgba(251,191,36,0.45)',
          },
        });
        rendition.themes.override('color', readerTextColor);
        rendition.themes.override('background', readerBackgroundColor);
        rendition.themes.override('background-color', readerBackgroundColor);
        rendition.themes.override('font-family', readerFontFamily);
        rendition.themes.fontSize(`${readerFontSize}%`);
        rendition.hooks.content.register((contents: any) => {
          applyReaderAppearanceToContents(
            contents,
            readerTextColor,
            readerBackgroundColor,
            readerFontFamily
          );
          const doc = contents?.document as Document | undefined;
          if (!doc || doc.documentElement.dataset.cotidieReaderTapBound === 'true') return;
          doc.documentElement.dataset.cotidieReaderTapBound = 'true';
          doc.addEventListener('click', (event) => readerTapHandlerRef.current(event));
          doc.addEventListener('selectionchange', () => {
            const remainingSelection = doc.getSelection?.()?.toString().trim() ?? '';
            if (remainingSelection) return;
            // Only auto-dismiss if the user hasn't started writing a note or a
            // bookmark label yet, so an unrelated selection loss (e.g. focus
            // moving to the toolbar's input) never discards typed text.
            if (highlightNoteDraftRef.current.trim() || bookmarkLabelRef.current.trim()) return;
            setPendingSelectionCfi('');
            setPendingSelectionText('');
            setHighlightNoteDraft('');
          });
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
            const readerLocation = getRenditionLocation(rendition, location);
            if (
              readerLocation &&
              isRestoringLocationRef.current &&
              hasDisplayedOnceRef.current &&
              resizeReleaseTimerRef.current !== null
            ) {
              pushDevLiveTrace({
                level: 'warn',
                source: 'epub-reader',
                message: 'Relocated ignorado (ventana de asentamiento activa).',
                data: `cfi=${(readerLocation.endCfi ?? readerLocation.cfi ?? '').slice(0, 30)}...`,
              });
              scheduleRestoreRelease(250);
              return;
            }
            if (readerLocation && !isRestoringLocationRef.current) {
              persistReaderLocation(readerLocation);

              // Emit event for debug or external sync if needed
              const traceCfi = readerLocation.endCfi ?? readerLocation.cfi;
              if (traceCfi) pushDevLiveTrace({
                level: 'info',
                source: 'epub-reader',
                message: 'Ubicacion guardada.',
                data: `cfi=${traceCfi.slice(0, 30)}...`,
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
        if (cancelled) return;
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
        pushDevLiveTrace({
          level: 'info',
          source: 'epub-reader',
          message: 'Ubicacion leida de localStorage al abrir.',
          data: savedLocation
            ? `cfi=${(savedLocation.endCfi ?? savedLocation.cfi ?? savedLocation.href ?? '').slice(0, 30)}...`
            : '(sin ubicacion guardada)',
        });
        try {
          // Restore anchored to the page's START cfi, never the END. epub.js
          // places the cfi passed to display() at the TOP of the viewport, so
          // anchoring on the end cfi would push the last-read character to the
          // top and reveal the NEXT page (the off-by-one forward drift seen in
          // real device logs). The start cfi keeps the same first-visible
          // character first-visible, i.e. the same page.
          const primaryAnchor = savedLocation?.cfi ?? savedLocation?.endCfi ?? savedLocation?.href;
          if (primaryAnchor) {
            await rendition.display(primaryAnchor);
            // The start cfi epub.js reports can be coarse: on a page showing
            // the middle of a long paragraph it may point back to where that
            // paragraph began (an earlier page), landing us before the real
            // page. Correct that by stepping forward ONLY until the visible
            // range reaches the last character actually read (endCfi). This
            // cannot overshoot: the start anchor is never past endCfi, so the
            // first page whose end meets endCfi is the page that contains it.
            const targetEndCfi = savedLocation?.endCfi;
            if (targetEndCfi && !cancelled) {
              const cfiComparer = new EpubCFI();
              let nudgeSteps = 0;
              for (let step = 0; step < READER_MAX_RESTORE_NUDGE_STEPS; step += 1) {
                if (cancelled) break;
                const liveEndCfi = getRenditionLocation(rendition)?.endCfi;
                if (!liveEndCfi) break;
                let reachedTarget: boolean;
                try {
                  reachedTarget = cfiComparer.compare(liveEndCfi, targetEndCfi) >= 0;
                } catch {
                  reachedTarget = true;
                }
                if (reachedTarget) break;
                await rendition.next();
                nudgeSteps += 1;
              }
              pushDevLiveTrace({
                level: 'info',
                source: 'epub-reader',
                message: 'Restauracion: anclada al inicio y ajustada.',
                data: `pasos=${nudgeSteps}; objetivo=${targetEndCfi.slice(0, 24)}`,
              });
            }
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

        hasDisplayedOnceRef.current = true;
        if (containerRef.current) {
          lastLayoutSizeRef.current = {
            width: containerRef.current.clientWidth,
            height: containerRef.current.clientHeight,
          };
        }
        persistReaderLocation(getRenditionLocation(rendition) ?? savedLocation);
        // Keep suppressing relocate-driven persistence for a brief settling
        // window: epub.js can still emit a late 'relocated' event while it
        // finishes stabilizing this very first render (the freshly opened
        // book hasn't fully settled yet), and trusting it blindly could
        // silently overwrite the position we just correctly restored above
        // with an intermediate, slightly-off one. Every other path that can
        // move the page (resize, font size) already gets this same window;
        // the initial restore was the one place that didn't.
        isRestoringLocationRef.current = true;
        scheduleRestoreRelease(400);

        const currentContents = (rendition as any).getContents?.() ?? [];
        currentContents.forEach((contents: any) =>
          applyReaderAppearanceToContents(
            contents,
            readerTextColor,
            readerBackgroundColor,
            readerFontFamily
          )
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

    activeLoadPromise = load();

    return () => {
      cancelled = true;
      const r: any = activeRendition as any;
      try {
        r?.off?.('relocated', r?.__cotidieOnRelocated);
        r?.off?.('selected', r?.__cotidieOnSelected);
      } catch {}
      // Persist the live location before destroying the rendition, so leaving
      // the reader (unmount) never loses progress to a stale snapshot.
      try {
        // Same reasoning as persistCurrentLocation: prefer the live query at
        // this final moment, since stableLocationRef may still be lagging
        // behind a recent resize's suppression window.
        const exitLocation = getRenditionLocation(activeRendition) ?? stableLocationRef.current;
        if (exitLocation) {
          persistReaderLocation(exitLocation);
          pushDevLiveTrace({
            level: 'info',
            source: 'epub-reader',
            message: 'Ubicacion guardada al salir.',
            data: `cfi=${(exitLocation.endCfi ?? exitLocation.cfi ?? exitLocation.href ?? '').slice(0, 30)}...`,
          });
        }
      } catch {}
      if (resizeReleaseTimerRef.current !== null) {
        window.clearTimeout(resizeReleaseTimerRef.current);
        resizeReleaseTimerRef.current = null;
      }
      if (resizeDebounceTimerRef.current !== null) {
        window.clearTimeout(resizeDebounceTimerRef.current);
        resizeDebounceTimerRef.current = null;
      }
      dispose();
    };
  }, [bookmarksStorageKey, epubUrl, highlightsStorageKey, locationStorageKey, persistReaderLocation, scheduleRestoreRelease, sourceBase64]);

  useEffect(() => {
    const rendition = renditionRef.current;
    if (!rendition) return;
    rendition.themes.override('color', readerTextColor);
    rendition.themes.override('background', readerBackgroundColor);
    rendition.themes.override('background-color', readerBackgroundColor);
    rendition.themes.override('font-family', readerFontFamily);
    const currentContents = (rendition as any).getContents?.() ?? [];
    currentContents.forEach((contents: any) =>
      applyReaderAppearanceToContents(
        contents,
        readerTextColor,
        readerBackgroundColor,
        readerFontFamily
      )
    );
  }, [readerBackgroundColor, readerFontFamily, readerTextColor]);

  const refreshRenditionLayout = useCallback(() => {
    const rendition = renditionRef.current as any;
    const container = containerRef.current;
    // Ignore resizes until the initial saved location has been displayed at
    // least once: 100dvh/safe-area-inset can settle a moment after mount, and
    // a resize landing mid-restore was overriding the just-restored page.
    if (!rendition?.manager || !container || !hasDisplayedOnceRef.current) return;
    const width = container.clientWidth;
    const height = container.clientHeight;
    if (width <= 0 || height <= 0) return;
    const lastSize = lastLayoutSizeRef.current;
    if (lastSize?.width === width && lastSize.height === height) return;
    // Prefer the live query, same reasoning as persistCurrentLocation/exit:
    // stableLocationRef can lag behind (onRelocated skips updating it while
    // isRestoringLocationRef is true), and unlike there, this value isn't
    // just being *recorded* — rendition.resize(..., anchor) below actively
    // re-navigates the book to it. Anchoring to a stale position doesn't
    // just mis-save history, it silently drags the reader backward.
    const currentLocation = getRenditionLocation(rendition) ?? stableLocationRef.current;
    // Anchor on the START cfi (same reasoning as the initial restore): resize()
    // re-displays the anchor at the TOP of the viewport, so anchoring on the
    // end cfi would nudge the reader forward one page on every repagination.
    const resizeAnchor = currentLocation?.cfi ?? currentLocation?.endCfi;
    lastLayoutSizeRef.current = { width, height };
    isRestoringLocationRef.current = true;
    pushDevLiveTrace({
      level: 'info',
      source: 'epub-reader',
      message: 'Resize de rendicion ejecutado.',
      data: `${width}x${height}; anchor=${(resizeAnchor ?? '(ninguno)').slice(0, 30)}`,
    });
    try {
      rendition.resize?.(
        width,
        height,
        resizeAnchor
      );
    } catch {}
    scheduleRestoreRelease(1500);
  }, [scheduleRestoreRelease]);

  // Collapses bursts of resize events (window drag, rotation animation, an
  // on-screen keyboard opening/closing) into a single actual rendition
  // resize shortly after they settle, instead of repaginating on every tick.
  const scheduleRenditionResize = useCallback(() => {
    if (resizeDebounceTimerRef.current !== null) {
      window.clearTimeout(resizeDebounceTimerRef.current);
    }
    resizeDebounceTimerRef.current = window.setTimeout(() => {
      resizeDebounceTimerRef.current = null;
      refreshRenditionLayout();
    }, READER_RESIZE_DEBOUNCE_MS);
  }, [refreshRenditionLayout]);

  useEffect(() => {
    const rendition = renditionRef.current;
    if (!rendition) return;
    // Same reasoning as refreshRenditionLayout: prefer the live position over
    // stableLocationRef, since this value drives an active re-navigation
    // (rendition.display below), not just a record of where we've been.
    const liveLocation = getRenditionLocation(rendition) ?? stableLocationRef.current;
    // Anchor on the START cfi, like the initial restore and resize: display()
    // puts the anchor at the top of the viewport, so the end cfi would drift
    // the reader forward a page each time the font size changes.
    const fontResizeAnchor = liveLocation?.cfi ?? liveLocation?.endCfi;
    rendition.themes.fontSize(`${readerFontSize}%`);
    if (!fontResizeAnchor) return;

    isRestoringLocationRef.current = true;
    scheduleRestoreRelease(1500);
    const tick = window.setTimeout(() => {
      void rendition.display(fontResizeAnchor).catch(() => undefined);
    }, 60);
    return () => window.clearTimeout(tick);
  }, [readerFontSize, scheduleRestoreRelease]);

  useEffect(() => {
    const onResize = () => scheduleRenditionResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [scheduleRenditionResize]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => scheduleRenditionResize());
    observer.observe(container);
    return () => observer.disconnect();
  }, [scheduleRenditionResize]);

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

  const persistAfterNavigation = () => {
    window.setTimeout(() => {
      const location = getRenditionLocation(renditionRef.current);
      if (location) {
        persistReaderLocation(location);
        pushDevLiveTrace({
          level: 'info',
          source: 'epub-reader',
          message: 'Posicion guardada tras navegacion explicita.',
          data: `cfi=${(location.endCfi ?? location.cfi ?? '').slice(0, 30)}...`,
        });
      }
    }, 80);
  };

  const prepareForReaderNavigation = () => {
    if (resizeReleaseTimerRef.current !== null) {
      window.clearTimeout(resizeReleaseTimerRef.current);
      resizeReleaseTimerRef.current = null;
    }
    isRestoringLocationRef.current = false;
    restoringSinceRef.current = null;
  };

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
    if (!rendition || showControlsRef.current) {
      pushDevLiveTrace({
        level: 'warn',
        source: 'epub-reader',
        message: 'goPrev bloqueado.',
        data: `rendition=${Boolean(rendition)}; showControls=${showControlsRef.current}`,
      });
      return;
    }
    pushDevLiveTrace({ level: 'info', source: 'epub-reader', message: 'goPrev ejecutado.' });
    prepareForReaderNavigation();
    Promise.resolve(rendition.prev?.())
      .then(() => {
        setNavigationError(null);
        persistAfterNavigation();
      })
      .catch(async () => {
        try {
          await moveBySpine(-1);
          setNavigationError(null);
          persistAfterNavigation();
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
      });
  };

  const goNext = () => {
    const rendition = renditionRef.current as any;
    if (!rendition || showControlsRef.current) {
      pushDevLiveTrace({
        level: 'warn',
        source: 'epub-reader',
        message: 'goNext bloqueado.',
        data: `rendition=${Boolean(rendition)}; showControls=${showControlsRef.current}`,
      });
      return;
    }
    pushDevLiveTrace({ level: 'info', source: 'epub-reader', message: 'goNext ejecutado.' });
    prepareForReaderNavigation();
    Promise.resolve(rendition.next?.())
      .then(() => {
        setNavigationError(null);
        persistAfterNavigation();
      })
      .catch(async () => {
        try {
          await moveBySpine(1);
          setNavigationError(null);
          persistAfterNavigation();
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
      });
  };

  const openReaderPanel = (tab: 'toc' | 'search' | 'bookmarks' | 'highlights') => {
    if (availablePanelTabs.includes(tab)) {
      setPanelTab(tab);
    }
    setIsPanelOpen(true);
  };

  const showReaderControls = () => {
    showControlsRef.current = true;
    setShowControls(true);
  };

  const hideReaderControls = () => {
    setIsPanelOpen(false);
    showControlsRef.current = false;
    setShowControls(false);
  };

  readerTapHandlerRef.current = (event) => {
    const selection = event.view?.getSelection?.()?.toString().trim() ?? '';
    if (selection) return;
    const target = event.target as Element | null;
    if (target?.closest?.('a, button, input, textarea, select')) return;
    if (showControlsRef.current) {
      pushDevLiveTrace({
        level: 'info',
        source: 'epub-reader',
        message: 'Tap: ocultando controles (no se interpreto como pasar de pagina).',
      });
      hideReaderControls();
      return;
    }

    const width = containerRef.current?.clientWidth ?? window.innerWidth;
    const height = containerRef.current?.clientHeight ?? window.innerHeight;
    if (width <= 0 || height <= 0) return;
    const localX = ((event.clientX % width) + width) % width;

    if (localX < width * 0.25) {
      goPrev();
    } else if (localX > width * 0.66) {
      goNext();
    } else if (event.clientY < height * 0.5) {
      pushDevLiveTrace({
        level: 'info',
        source: 'epub-reader',
        message: 'Tap: mostrando controles.',
      });
      showReaderControls();
    }
  };

  useEffect(() => {
    if (showControls) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        showReaderControls();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showControls]);

  const displayAndPersist = async (target: string) => {
    prepareForReaderNavigation();
    await renditionRef.current?.display(target);
    persistAfterNavigation();
  };

  const jumpToToc = async (href: string) => {
    setSelectedToc(href);
    await displayAndPersist(href);
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
    await displayAndPersist(item.target);
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

  const clearPendingSelection = () => {
    const contents = (renditionRef.current as any)?.getContents?.() ?? [];
    contents.forEach((content: any) => content?.window?.getSelection?.()?.removeAllRanges?.());
    setPendingSelectionCfi('');
    setPendingSelectionText('');
    setHighlightNoteDraft('');
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
    clearPendingSelection();
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
      className="fixed inset-0 z-[120] flex flex-col"
      style={{
        height: '100dvh',
        maxHeight: '100dvh',
        backgroundColor: readerBackgroundColor,
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        paddingLeft: 'env(safe-area-inset-left, 0px)',
        paddingRight: 'env(safe-area-inset-right, 0px)',
      }}
    >
      {typeof document !== 'undefined'
        ? createPortal(
            <>
              <div
                aria-hidden="true"
                data-system-bar-layer="top"
                className="pointer-events-none fixed inset-x-0 top-0 z-[200]"
                style={{
                  height: 'env(safe-area-inset-top, 0px)',
                  backgroundColor: readerBackgroundColor,
                }}
              />
              <div
                aria-hidden="true"
                data-system-bar-layer="bottom"
                className="pointer-events-none fixed inset-x-0 bottom-0 z-[200]"
                style={{
                  height: 'env(safe-area-inset-bottom, 0px)',
                  backgroundColor: readerBackgroundColor,
                }}
              />
            </>,
            document.body
          )
        : null}
      {isPanelOpen && typeof document !== 'undefined'
        ? createPortal(
            <>
              <div
                aria-hidden="true"
                data-system-bar-layer="top"
                className="pointer-events-none fixed inset-x-0 top-0 z-[200] bg-black/80"
                style={{ height: 'env(safe-area-inset-top, 0px)' }}
              />
              <div
                aria-hidden="true"
                data-system-bar-layer="bottom"
                className="pointer-events-none fixed inset-x-0 bottom-0 z-[200] bg-black/80"
                style={{ height: 'env(safe-area-inset-bottom, 0px)' }}
              />
            </>,
            document.body
          )
        : null}
      <div className={cn('absolute inset-x-0 top-0 z-20 space-y-2 p-3', !showControls && 'hidden')}>
        <div className="rounded-lg border border-border bg-card/95 p-3 shadow-sm backdrop-blur">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              {onClose ? (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onClose()}
                  aria-label="Volver"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              ) : null}
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
              {isNtContext ? (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => openReaderPanel('search')}
                  disabled={status !== 'ready'}
                  aria-label="Buscar en el EPUB"
                >
                  <Search className="h-4 w-4" />
                </Button>
              ) : null}
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
        className="relative overflow-hidden flex-1 min-h-0"
        style={{ backgroundColor: readerBackgroundColor }}
      >
        <div
          ref={containerRef}
          className="h-full w-full min-h-0"
          style={{
            height: `calc(100% - ${EPUB_PAGE_BOTTOM_GUARD})`,
          }}
        />
      </div>

      <ReaderSelectionToolbar
        pendingSelectionCfi={pendingSelectionCfi}
        showBookmarkInput={showControls}
        readerBackgroundColor={readerBackgroundColor}
        pendingSelectionText={pendingSelectionText}
        highlightNoteDraft={highlightNoteDraft}
        setHighlightNoteDraft={setHighlightNoteDraft}
        addHighlightFromSelection={addHighlightFromSelection}
        status={status}
        clearPendingSelection={clearPendingSelection}
        bookmarkLabel={bookmarkLabel}
        setBookmarkLabel={setBookmarkLabel}
        addBookmark={addBookmark}
        currentCfi={currentCfi}
      />

      <Sheet open={isPanelOpen} onOpenChange={setIsPanelOpen}>
        <SheetContent
          side="left"
          className="w-[92vw] sm:max-w-md p-4 overflow-y-auto [&>button]:top-[calc(1rem+env(safe-area-inset-top))]"
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
              <ReaderTocPanel
                isNtContext={isNtContext}
                tocBookAnchors={tocBookAnchors}
                tocBookFilter={tocBookFilter}
                setTocBookFilter={setTocBookFilter}
                status={status}
                selectedToc={selectedToc}
                jumpToToc={jumpToToc}
                filteredTocEntries={filteredTocEntries}
              />
            )}

            {panelTab === 'search' && (
              <ReaderSearchPanel
                isNtContext={isNtContext}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                searchInBook={searchInBook}
                status={status}
                isSearching={isSearching}
                searchResults={searchResults}
                openSearchResult={openSearchResult}
              />
            )}

            {panelTab === 'bookmarks' && (
              <ReaderBookmarksPanel
                bookmarks={bookmarks}
                displayAndPersist={displayAndPersist}
                setIsPanelOpen={setIsPanelOpen}
                removeBookmark={removeBookmark}
              />
            )}

            {panelTab === 'highlights' && (
              <ReaderHighlightsPanel
                highlights={highlights}
                displayAndPersist={displayAndPersist}
                setIsPanelOpen={setIsPanelOpen}
                updateHighlightNote={updateHighlightNote}
                removeHighlight={removeHighlight}
              />
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
