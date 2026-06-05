'use client';

import React, { useRef, useLayoutEffect, useCallback, useEffect, useState } from 'react';
import type { Prayer } from '@/lib/types';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useSettings } from '@/context/SettingsContext';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { ArrowRightLeft } from 'lucide-react';
import * as Icon from 'lucide-react';
import { AudioPlayer } from './AudioPlayer';
import { useScreenWakeLock } from '@/hooks/useScreenWakeLock';

// Encadre centralizado por id (si no tienes este archivo, coméntalo o ajusta):
import { getImageObjectPosition } from '@/lib/image-display';

// ---------- util: escapar HTML ----------
const escapeHtml = (str: string) =>
  str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

const formatInlineHtml = (escaped: string) => {
  // Doble asterisco (**texto**) o doble guion bajo (__texto__) -> Negrita fuerte y sólida
  const withStrong = escaped
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-extrabold text-primary">$1</strong>')
    .replace(/__(.+?)__/g, '<strong class="font-extrabold text-primary">$1</strong>');

  return withStrong
    // Asterisco simple (*texto*) -> Negrita suave y grisácea (estilo subtítulo o énfasis sutil)
    .replace(/(^|[^\w*])\*(?!\*)(.+?)\*(?!\w)/g, '$1<span class="font-semibold text-muted-foreground">$2</span>')
    // Guion bajo simple (_texto_) -> Cursiva estándar
    .replace(/(^|[^\w_])_(?!_)(.+?)_(?!\w)/g, '$1<em>$2</em>');
};

<<<<<<< HEAD
=======
const getAppScrollContainer = (): HTMLElement | null => {
  if (typeof document === 'undefined') return null;
  return document.querySelector('[data-app-scroll-container="true"]');
};

>>>>>>> 47b58837317ce981497a0fdbdeaed3c3f8cb75d3
const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const renderCaminoLines = (
  content: string,
  searchTerm: string,
  activeIndex: number,
  theme: 'light' | 'dark'
): React.ReactNode[] => {
  const normalizedTerm = searchTerm.trim();
  const termRegex = normalizedTerm ? new RegExp(`^${escapeRegExp(normalizedTerm)}\\.`) : null;

  const lines = content.split('\n');
  const rendered: React.ReactNode[] = [];
  let matchCounter = 0;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i] ?? '';
    if (!rawLine.trim()) {
      rendered.push(<div key={`spacer-${i}`} className="h-3" />);
      continue;
    }

    const trimmed = rawLine.trim();
    const pointMatch = trimmed.match(/^(\d+)\.\s*(.*)$/);
    const isMatch = Boolean(termRegex && termRegex.test(trimmed));

    const highlightClass =
      theme === 'dark'
        ? matchCounter === activeIndex
          ? 'bg-yellow-300 text-black'
          : 'bg-yellow-500/60 text-black'
        : matchCounter === activeIndex
        ? 'bg-yellow-400 text-black'
        : 'bg-yellow-200 text-black';

    const id = isMatch ? `search-result-${matchCounter}` : undefined;
    const lineNode = pointMatch ? (
      <>
        <strong>{pointMatch[1]}.</strong>{' '}
        <span
          dangerouslySetInnerHTML={{
            __html: formatInlineHtml(escapeHtml(pointMatch[2] ?? '')),
          }}
        />
      </>
    ) : (
      <span
        dangerouslySetInnerHTML={{
          __html: formatInlineHtml(escapeHtml(trimmed)),
        }}
      />
    );

    rendered.push(
      <p key={`camino-line-${i}`} id={id} className={i === 0 ? 'mt-0' : 'mt-2'}>
        {isMatch ? (
          <mark className={cn('rounded-sm px-1', highlightClass)}>{lineNode}</mark>
        ) : (
          lineNode
        )}
      </p>
    );

    if (isMatch) matchCounter++;
  }

  return rendered;
};

// === BUSCADOR: resaltar coincidencias al inicio de línea ===
const parseAndHighlight = (
  content: string,
  searchTerm: string,
  activeIndex: number,
  theme: 'light' | 'dark'
): React.ReactNode[] => {
  if (!searchTerm.trim()) return renderText(content);

  const regex = new RegExp(`^${searchTerm}\\.?`, 'gm');
  const lines = content.split('\n');
  const rendered: React.ReactNode[] = [];

  let matchCounter = 0;

  lines.forEach((line, i) => {
    const match = line.match(regex);
    if (match) {
      const isActive = matchCounter === activeIndex;
      const highlightClass =
        theme === 'dark'
          ? isActive
            ? 'bg-yellow-300 text-black'
            : 'bg-yellow-500/60 text-black'
          : isActive
          ? 'bg-yellow-400 text-black'
          : 'bg-yellow-200 text-black';

      rendered.push(
        <p key={`match-${i}`} id={`search-result-${matchCounter}`} className="mt-3">
          <mark className={cn('rounded-sm px-1', highlightClass)}>
            <span
              dangerouslySetInnerHTML={{
                __html: formatInlineHtml(escapeHtml(line)),
              }}
            />
          </mark>
        </p>
      );
      matchCounter++;
    } else {
      rendered.push(
        <p key={`line-${i}`} className="mt-3">
          <span
            dangerouslySetInnerHTML={{
              __html: formatInlineHtml(escapeHtml(line)),
            }}
          />
        </p>
      );
    }
  });

  return rendered;
};

// === FORMATEO DE TEXTO global ===
// Reglas pedidas:
//  - Doble salto de línea = párrafo.
//  - _negrita_ => <strong>…</strong> (guion bajo).
//  - *Subtítulo* (línea completa) => h3.
//  - Saltos simples dentro del bloque => <br/>
//  - Versículos V./R., Camino numerado, litánicas, listas (-, •)
const renderText = (text: string): React.ReactNode[] => {
  const blocks = text.split(/\n{2,}/).filter(Boolean);
  const out: React.ReactNode[] = [];

  for (let i = 0; i < blocks.length; i++) {
    const raw = blocks[i];
    let trimmed = raw.trim();

    const josemariaLine = 'Por San Josemaría Escrivá de Balaguer';
    const initialLines = trimmed.split('\n');
    if (initialLines[0]?.trim() === josemariaLine) {
      out.push(
        <h2 key={`h2-${i}`} className="text-2xl font-headline font-bold mt-2 mb-4">
          {josemariaLine}
        </h2>
      );
      trimmed = initialLines.slice(1).join('\n').trim();
      if (!trimmed) continue;
    }

    // Subtítulo: *Texto* en línea completa
    const subtitle = trimmed.match(/^\*(.+)\*$/);
    if (subtitle) {
      out.push(
        <h3
          key={`h3-${i}`}
          className="text-sm font-semibold text-muted-foreground mt-6 mb-2 first:mt-0"
        >
          {subtitle[1]}
        </h3>
      );
      continue;
    }

    // Listas con - o • (líneas dentro del bloque)
    if (/^[-•]\s+/m.test(trimmed)) {
      const items = trimmed
        .split('\n')
        .filter((ln) => /^[-•]\s+/.test(ln))
        .map((ln) => {
          const txt = ln.replace(/^[-•]\s+/, '');
          const safe = formatInlineHtml(escapeHtml(txt));
          return `<li>${safe}</li>`;
        })
        .join('');
      out.push(
        <ul
          key={`ul-${i}`}
          className="mt-3 ml-6 list-disc space-y-1"
          dangerouslySetInnerHTML={{ __html: items }}
        />
      );
      continue;
    }

    // Dividir por líneas para aplicar reglas por línea (V./R., Camino, litánicas) y respetar <br/>
    const lines = trimmed.split('\n');
    const renderedLines: string[] = [];

    for (let j = 0; j < lines.length; j++) {
      const line = lines[j].trim();

      // V. / R.
      if (line.startsWith('V.') || line.startsWith('R.')) {
        const safe = formatInlineHtml(escapeHtml(line.slice(2)));
        renderedLines.push(`<p><strong>${line.slice(0, 2)}</strong>${safe}</p>`);
        continue;
      }

      // Camino numerado: "123. texto…"
      const caminoMatch = line.match(/^(\d+)\.\s*(.*)$/);
      if (caminoMatch) {
        const safeRest = formatInlineHtml(escapeHtml(caminoMatch[2]));
        renderedLines.push(`<p><strong>${caminoMatch[1]}.</strong> ${safeRest}</p>`);
        continue;
      }

      // Litánicas (sangría)
      const litany = [
        'ruega por nosotros',
        'ten piedad de nosotros',
        'Perdónanos, Señor',
        'Escúchanos, Señor',
        'Ten misericordia de nosotros',
        'Para que seamos dignos',
      ];
      if (litany.some((s) => line.toLowerCase().startsWith(s.toLowerCase()))) {
        const safe = formatInlineHtml(escapeHtml(line));
        renderedLines.push(`<p class="ml-4">${safe}</p>`);
        continue;
      }

      // Normal + negrita por _
      const safe = formatInlineHtml(escapeHtml(line));
      // No envolver en <p> aquí; dejamos que el bloque envuelva y separe con <br/>
      renderedLines.push(safe);
    }

    // Unir las líneas: cada línea normal separada por <br/> si no ya eran <p> completos
    const html = renderedLines
      .map((frag) => (frag.startsWith('<p') ? frag : frag))
      .join('<br/>');

    out.push(
      <p key={`p-${i}`} className="mt-3 first:mt-0" dangerouslySetInnerHTML={{ __html: html }} />
    );
  }

  return out;
};

const normalizeVariantKey = (key: string) =>
  String(key || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '');

const resolveVariantKey = (contentObj: Record<string, string>, preferredKey?: string | null) => {
  const entries = Object.keys(contentObj);
  if (entries.length === 0) return '';
  if (!preferredKey) return entries[0] || '';

  const directHit = entries.find((entry) => entry === preferredKey);
  if (directHit) return directHit;

  const normalizedPreferred = normalizeVariantKey(preferredKey);
  return entries.find((entry) => normalizeVariantKey(entry) === normalizedPreferred) || entries[0] || '';
};

const formatVariantLabel = (key: string) => {
  if (!key) return '';
  const normalized = normalizeVariantKey(key);
  if (normalized === 'reginacoeli') return 'Regina Coeli';
  if (normalized === 'espanol') return 'Español';
  if (normalized === 'latin') return 'Latín';
  const spaced = key
    .replace(/([a-záéíóúñ])([A-Z])/g, '$1 $2')
    .replace(/[-_]+/g, ' ')
    .trim();
  return spaced
    .split(/\s+/g)
    .filter(Boolean)
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
    .join(' ');
};

// === CONTENIDO ===
const PrayerContent = ({
  prayer,
  searchState,
<<<<<<< HEAD
  scrollContainerRef,
}: {
  prayer: Prayer;
  searchState?: { term: string; activeIndex: number; resultsCount: number };
  scrollContainerRef?: React.RefObject<HTMLDivElement>;
=======
}: {
  prayer: Prayer;
  searchState?: { term: string; activeIndex: number; resultsCount: number };
>>>>>>> 47b58837317ce981497a0fdbdeaed3c3f8cb75d3
}) => {
  const {
    setScrollPosition,
    scrollPositions,
    theme,
    pinchToZoomEnabled,
    fontSize,
<<<<<<< HEAD
    prayerTextZoom,
    setPrayerTextZoom,
=======
    setFontSize,
>>>>>>> 47b58837317ce981497a0fdbdeaed3c3f8cb75d3
    prayerLanguagePreferences,
    setPrayerLanguagePreference,
  } = useSettings();
  const throttleTimeout = useRef<NodeJS.Timeout | null>(null);
<<<<<<< HEAD

  const [initialDistance, setInitialDistance] = useState<number | null>(null);
  const [initialZoomFactor, setInitialZoomFactor] = useState<number | null>(null);
  const [contentZoomFactor, setContentZoomFactor] = useState(prayerTextZoom);
  const contentZoomFactorRef = useRef(contentZoomFactor);
  const contentFontSize = Math.round(fontSize * contentZoomFactor);
  const contentStyle = { fontSize: `${contentFontSize}px` };

  useEffect(() => {
    contentZoomFactorRef.current = contentZoomFactor;
  }, [contentZoomFactor]);

  useEffect(() => {
    setContentZoomFactor(prayerTextZoom);
  }, [prayerTextZoom]);

  useEffect(() => {
    const el = scrollContainerRef?.current;
    if (!pinchToZoomEnabled || !el) return;
=======
  const containerRef = useRef<HTMLDivElement>(null);

  // Pinch-to-zoom logic
  const [initialDistance, setInitialDistance] = useState<number | null>(null);
  const [initialFontSize, setInitialFontSize] = useState<number | null>(null);

  useEffect(() => {
    if (!pinchToZoomEnabled || !containerRef.current) return;

    const el = containerRef.current;
>>>>>>> 47b58837317ce981497a0fdbdeaed3c3f8cb75d3

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault(); // Prevent default browser zoom/scroll behavior
        const d = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        setInitialDistance(d);
<<<<<<< HEAD
        setInitialZoomFactor(contentZoomFactorRef.current);
=======
        setInitialFontSize(fontSize);
>>>>>>> 47b58837317ce981497a0fdbdeaed3c3f8cb75d3
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
<<<<<<< HEAD
      if (e.touches.length === 2 && initialDistance !== null && initialZoomFactor !== null) {
=======
      if (e.touches.length === 2 && initialDistance !== null && initialFontSize !== null) {
>>>>>>> 47b58837317ce981497a0fdbdeaed3c3f8cb75d3
        e.preventDefault(); // Prevent default browser zoom/scroll behavior
        const d = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
<<<<<<< HEAD
        const scale = d / initialDistance;
        let nextZoomFactor = initialZoomFactor * scale;
        nextZoomFactor = Math.max(0.75, Math.min(nextZoomFactor, 2));
        setContentZoomFactor(nextZoomFactor);
=======
        
        // Calculate scale factor
        const scale = d / initialDistance;
        
        // New font size
        let newSize = initialFontSize * scale;
        
        // Clamp
        newSize = Math.max(10, Math.min(newSize, 40));
        
        setFontSize(Math.round(newSize));
>>>>>>> 47b58837317ce981497a0fdbdeaed3c3f8cb75d3
      }
    };

    const handleTouchEnd = () => {
      setInitialDistance(null);
<<<<<<< HEAD
      setInitialZoomFactor(null);
      setPrayerTextZoom(contentZoomFactorRef.current);
=======
      setInitialFontSize(null);
>>>>>>> 47b58837317ce981497a0fdbdeaed3c3f8cb75d3
    };

    // Use { passive: false } to allow preventDefault()
    el.addEventListener('touchstart', handleTouchStart, { passive: false });
    el.addEventListener('touchmove', handleTouchMove, { passive: false });
    el.addEventListener('touchend', handleTouchEnd);

    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('touchend', handleTouchEnd);
    };
<<<<<<< HEAD
  }, [pinchToZoomEnabled, initialDistance, initialZoomFactor]);
=======
  }, [pinchToZoomEnabled, initialDistance, initialFontSize, fontSize, setFontSize]);
>>>>>>> 47b58837317ce981497a0fdbdeaed3c3f8cb75d3

  const themeMode: 'light' | 'dark' = theme === 'dark' ? 'dark' : 'light';
  const prayerId: string = prayer.id ?? '';
  const isCamino = prayerId === 'camino-libro';
<<<<<<< HEAD
  const isPinching = initialDistance !== null && initialZoomFactor !== null;
  const pinchPercentage = Math.round(contentZoomFactor * 100);

  const handleScroll = useCallback(() => {
    if (!prayer.isLongText || !prayerId) return;
    const container = scrollContainerRef?.current;
=======

  const handleScroll = useCallback(() => {
    if (!prayer.isLongText || !prayerId) return;
    const container = getAppScrollContainer();
>>>>>>> 47b58837317ce981497a0fdbdeaed3c3f8cb75d3
    if (!container) return;
    if (throttleTimeout.current) clearTimeout(throttleTimeout.current);
    throttleTimeout.current = setTimeout(() => {
      setScrollPosition(prayerId, container.scrollTop);
    }, 200);
<<<<<<< HEAD
  }, [prayerId, prayer.isLongText, setScrollPosition, scrollContainerRef]);

  useLayoutEffect(() => {
    if (!prayerId) return;
    const container = scrollContainerRef?.current;
=======
  }, [prayerId, prayer.isLongText, setScrollPosition]);

  useLayoutEffect(() => {
    if (!prayerId) return;
    const container = getAppScrollContainer();
>>>>>>> 47b58837317ce981497a0fdbdeaed3c3f8cb75d3
    if (!container) return;
    if (prayer.isLongText) {
      const saved = scrollPositions[prayerId];
      if (typeof saved === 'number') {
        container.scrollTo({ top: saved });
      }
    } else {
      container.scrollTo({ top: 0 });
    }
<<<<<<< HEAD
  }, [prayerId, scrollPositions, searchState, prayer.isLongText, scrollContainerRef]);

  useEffect(() => {
    const container = scrollContainerRef?.current;
=======
  }, [prayerId, scrollPositions, searchState, prayer.isLongText]);

  useEffect(() => {
    const container = getAppScrollContainer();
>>>>>>> 47b58837317ce981497a0fdbdeaed3c3f8cb75d3
    if (!container) return;
    container.addEventListener('scroll', handleScroll, { passive: true });

    const flushScrollPosition = () => {
      if (!prayer.isLongText || !prayerId) return;
<<<<<<< HEAD
      const currentContainer = scrollContainerRef?.current;
=======
      const currentContainer = getAppScrollContainer();
>>>>>>> 47b58837317ce981497a0fdbdeaed3c3f8cb75d3
      if (!currentContainer) return;
      setScrollPosition(prayerId, currentContainer.scrollTop);
    };

    const handleVisibilityChange = () => {
      if (typeof document === 'undefined') return;
      if (document.visibilityState !== 'hidden') return;
      flushScrollPosition();
    };

    window.addEventListener('pagehide', flushScrollPosition);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      container.removeEventListener('scroll', handleScroll);
      window.removeEventListener('pagehide', flushScrollPosition);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      flushScrollPosition();
      if (throttleTimeout.current) clearTimeout(throttleTimeout.current);
    };
  }, [handleScroll, prayer.isLongText, prayerId, setScrollPosition]);

  useEffect(() => {
<<<<<<< HEAD
    if (!searchState?.term || searchState.activeIndex === -1) return;
    const container = scrollContainerRef?.current;
    if (!container) return;

    const el = container.querySelector(`#search-result-${searchState.activeIndex}`) as HTMLElement | null;
    if (!el) return;

    const containerRect = container.getBoundingClientRect();
    const elementRect = el.getBoundingClientRect();
    const targetTop = container.scrollTop + (elementRect.top - containerRect.top) - container.clientHeight / 2 + elementRect.height / 2;

    container.scrollTo({ top: Math.max(0, targetTop), behavior: 'smooth' });
=======
    if (searchState?.term && searchState.activeIndex !== -1) {
      const el = document.getElementById(`search-result-${searchState.activeIndex}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
>>>>>>> 47b58837317ce981497a0fdbdeaed3c3f8cb75d3
  }, [searchState?.activeIndex, searchState?.term]);

  const getPreferredVariant = useCallback(() => {
    if (!prayer.content || typeof prayer.content !== 'object') return '';
    const contentObj = prayer.content as Record<string, string>;
    const preferredLang =
      (prayer.id ? prayerLanguagePreferences[prayer.id] : undefined) ??
      (prayer.id === 'preces' ? 'latín' : 'español');
    return resolveVariantKey(contentObj, preferredLang);
  }, [prayer.content, prayer.id, prayerLanguagePreferences]);

  const [selectedLang, setSelectedLang] = useState(() => getPreferredVariant());

  useEffect(() => {
    const nextLang = getPreferredVariant();
    setSelectedLang((prev) => (prev === nextLang ? prev : nextLang));
  }, [getPreferredVariant]);

  if (typeof prayer.content === 'string') {
    const { term = '', activeIndex = -1 } = searchState || {};
    return (
<<<<<<< HEAD
      <div className="relative">
        {isPinching && (
          <div className="pointer-events-none absolute right-4 top-4 z-20 rounded-full bg-background/95 px-3 py-1 text-xs font-semibold text-foreground shadow-lg ring-1 ring-border">
            {pinchPercentage}%
          </div>
        )}
        <div className="text-foreground/90 leading-relaxed" style={contentStyle}>
          {isCamino
            ? renderCaminoLines(prayer.content, term, activeIndex, themeMode)
            : term
              ? parseAndHighlight(prayer.content, term, activeIndex, themeMode)
              : renderText(prayer.content)}
        </div>
=======
      <div 
        ref={containerRef}
        className="text-foreground/90 leading-relaxed touch-pan-y"
      >
        {isCamino
          ? renderCaminoLines(prayer.content, term, activeIndex, themeMode)
          : term
            ? parseAndHighlight(prayer.content, term, activeIndex, themeMode)
            : renderText(prayer.content)}
>>>>>>> 47b58837317ce981497a0fdbdeaed3c3f8cb75d3
      </div>
    );
  }

  if (prayer.content && typeof prayer.content === 'object') {
    const contentObj = prayer.content as Record<string, string>;
    const langs = Object.keys(contentObj);

    const resolvedLang = resolveVariantKey(contentObj, selectedLang);
    const displayedContent = resolvedLang ? contentObj[resolvedLang] || '' : '';
    const otherLang = langs.find((lang) => normalizeVariantKey(lang) !== normalizeVariantKey(resolvedLang));
    const selectedLabel = formatVariantLabel(resolvedLang);
    const otherLabel = otherLang ? formatVariantLabel(otherLang) : '';

    const toggleLang = () => {
      if (!otherLang) return;
      const nextLang = resolveVariantKey(contentObj, otherLang);
      if (!nextLang) return;
      setSelectedLang(nextLang);
      if (prayer.id) {
        setPrayerLanguagePreference(prayer.id, nextLang);
      }
    };

    return (
<<<<<<< HEAD
      <div className="relative">
        {isPinching && (
          <div className="pointer-events-none absolute right-4 top-4 z-20 rounded-full bg-background/95 px-3 py-1 text-xs font-semibold text-foreground shadow-lg ring-1 ring-border">
            {pinchPercentage}%
          </div>
        )}
        <div>
          <div className="flex justify-between items-center mb-4 border-b pb-3">
            <h3 className="text-lg font-headline font-semibold">{selectedLabel}</h3>
            {otherLang && (
              <Button
                variant="outline"
                size="icon"
                onClick={toggleLang}
                title={`Cambiar a ${otherLabel}`}
              >
                <ArrowRightLeft className="h-4 w-4" />
              </Button>
            )}
          </div>
          <div className="text-foreground/90 leading-relaxed" style={contentStyle}>
            {renderText(displayedContent)}
          </div>
=======
      <div ref={containerRef} className="touch-pan-y">
        <div className="flex justify-between items-center mb-4 border-b pb-3">
          <h3 className="text-lg font-headline font-semibold">{selectedLabel}</h3>
          {otherLang && (
            <Button
              variant="outline"
              size="icon"
              onClick={toggleLang}
              title={`Cambiar a ${otherLabel}`}
            >
              <ArrowRightLeft className="h-4 w-4" />
            </Button>
          )}
        </div>
        <div className="text-foreground/90 leading-relaxed">
          {renderText(displayedContent)}
>>>>>>> 47b58837317ce981497a0fdbdeaed3c3f8cb75d3
        </div>
      </div>
    );
  }

  return null;
};

// === COMPONENTE PRINCIPAL ===
export default function PrayerDetail({
  prayer,
  searchState,
}: {
  prayer: Prayer;
  searchState?: { term: string; activeIndex: number; resultsCount: number };
}) {
  const { isDistractionFree } = useSettings();
  const [localAudioSrc, setLocalAudioSrc] = useState<string | null>(null);
<<<<<<< HEAD
  const scrollContainerRef = useRef<HTMLDivElement>(null);
=======
>>>>>>> 47b58837317ce981497a0fdbdeaed3c3f8cb75d3
  useScreenWakeLock(Boolean(prayer.isLongText));

  const predefinedAudios = [
    { title: 'Discurso San Josemaría', src: '/media/Discurso San Josemaría.mp3' },
    { title: 'Discurso San Juan Pablo II', src: '/media/Discurso San Juan Pablo II.mp3' },
  ];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const url = URL.createObjectURL(file);
          setLocalAudioSrc(url);
      }
  };
  
  const showAudioPlayer = (prayer.audio || prayer.id === 'lectura-audio') && !isDistractionFree;
  const audioSrc = localAudioSrc || prayer.audio || '';

  const objectPosition = getImageObjectPosition(prayer.id);

  return (
<<<<<<< HEAD
    <div className={cn('flex min-h-0 flex-col', isDistractionFree ? 'py-20' : 'p-4')}>
=======
    <div className={cn(isDistractionFree ? 'py-20' : 'p-4')}>
>>>>>>> 47b58837317ce981497a0fdbdeaed3c3f8cb75d3
      {prayer.imageUrl && (
        <div
          className={cn(
            'relative overflow-hidden sticky z-0',
            isDistractionFree
              ? 'mb-8 top-20 left-1/2 w-screen max-w-none -translate-x-1/2 rounded-none'
              : 'mb-4 top-4 rounded-lg'
          )}
          style={{ height: isDistractionFree ? 'min(42vh, 420px)' : '200px' }}
        >
          <Image
            src={prayer.imageUrl}
            alt={prayer.title || 'Imagen de la oracion'}
            fill
            className="object-cover"
            style={{ objectPosition }}
            priority
          />
        </div>
      )}

<<<<<<< HEAD
      <div className={cn('flex-1 min-h-0', isDistractionFree && 'mx-auto max-w-3xl px-4 sm:px-6 lg:px-8')}>
=======
      <div className={cn(isDistractionFree && 'mx-auto max-w-3xl px-4 sm:px-6 lg:px-8')}>
>>>>>>> 47b58837317ce981497a0fdbdeaed3c3f8cb75d3
        {showAudioPlayer && (
          <div className="mb-6 space-y-4">
             {audioSrc ? (
               <AudioPlayer src={audioSrc} title={localAudioSrc ? 'Audio seleccionado' : 'Escuchar meditacion'} />
             ) : (
               <div className="rounded-lg bg-secondary/50 p-4 text-center text-sm text-muted-foreground">
                 Selecciona un audio para escuchar
               </div>
             )}

             {prayer.id === 'lectura-audio' && (
               <div className="space-y-3">
                 <div className="grid gap-2">
                   <Label className="text-sm font-medium">Audios Disponibles</Label>
                   {predefinedAudios.map((audio, idx) => (
                     <Button
                      key={idx}
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left',
                        localAudioSrc === audio.src && 'border-primary bg-primary/5 text-primary'
                      )}
                      onClick={() => setLocalAudioSrc(audio.src)}
                     >
                       <Icon.Play className="mr-2 h-4 w-4" />
                       {audio.title}
                     </Button>
                   ))}
                 </div>

                 <div className="border-t pt-2">
                    <Label htmlFor="audio-upload" className="mb-2 block text-sm font-medium">
                      O subir archivo personal (.mp3)
                    </Label>
                    <Input
                      id="audio-upload"
                      type="file"
                      accept="audio/*"
                      onChange={handleFileUpload}
                      className="cursor-pointer"
                    />
                 </div>
               </div>
             )}
          </div>
        )}

        <Card
          className={cn(
<<<<<<< HEAD
            'overflow-hidden border bg-card shadow-md flex-1',
            isDistractionFree && 'border-0 bg-transparent shadow-none'
          )}
        >
          <CardContent className={cn('p-6 pt-6 flex h-full flex-col', isDistractionFree && 'p-0 pt-0 text-[1.05rem] leading-[1.85]')}>
            <div
              ref={scrollContainerRef}
              data-app-scroll-container="true"
              className="flex-1 min-h-0 overflow-y-auto touch-pan-y scrollbar-hide overscroll-contain"
            >
              {prayer.content ? (
                <PrayerContent prayer={prayer} searchState={searchState} scrollContainerRef={scrollContainerRef} />
              ) : (
                <div className="p-4 text-sm text-muted-foreground">Contenido no disponible.</div>
              )}
            </div>
=======
            'overflow-hidden border bg-card shadow-md',
            isDistractionFree && 'border-0 bg-transparent shadow-none'
          )}
        >
          <CardContent className={cn('p-6 pt-6', isDistractionFree && 'p-0 pt-0 text-[1.05rem] leading-[1.85]')}>
            {prayer.content ? (
              <PrayerContent prayer={prayer} searchState={searchState} />
            ) : (
              <p className="text-sm text-muted-foreground">Contenido no disponible.</p>
            )}
>>>>>>> 47b58837317ce981497a0fdbdeaed3c3f8cb75d3
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


