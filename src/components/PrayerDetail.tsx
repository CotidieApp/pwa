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
  if (normalized === 'ambos') return 'Ambos';
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

const BOTH_VARIANT_KEY = 'ambos';

const isBothVariantKey = (key?: string | null) => normalizeVariantKey(key || '') === BOTH_VARIANT_KEY;
const isSpanishVariantKey = (key: string) => normalizeVariantKey(key) === 'espanol';
const isLatinVariantKey = (key: string) => normalizeVariantKey(key) === 'latin';

type AngelusPrayerMode = 'angelus' | 'reginaCoeli';

const isAngelusReginaPrayer = (prayerId?: string) => prayerId === 'angelus-regina-coeli';

const getAngelusLanguageContent = (
  contentObj: Record<string, string>,
  prayerMode: AngelusPrayerMode,
): Record<string, string> => ({
  espanol: contentObj[`${prayerMode}Espanol`] || '',
  latin: contentObj[`${prayerMode}Latin`] || '',
});

const getPrimaryVariantKey = (contentObj: Record<string, string>) => Object.keys(contentObj)[0] || '';

const getLanguageModeOrder = (contentObj: Record<string, string>) => {
  const entries = Object.keys(contentObj);
  const primary = getPrimaryVariantKey(contentObj);
  const singleModes = [
    primary,
    ...entries.filter((entry) => normalizeVariantKey(entry) !== normalizeVariantKey(primary)),
  ].filter(Boolean);
  const hasSpanish = entries.some(isSpanishVariantKey);
  const hasLatin = entries.some(isLatinVariantKey);
  return hasSpanish && hasLatin ? [...singleModes, BOTH_VARIANT_KEY] : singleModes;
};

const resolveLanguageMode = (contentObj: Record<string, string>, preferredKey?: string | null) => {
  const order = getLanguageModeOrder(contentObj);
  if (order.length === 0) return '';
  if (preferredKey && isBothVariantKey(preferredKey) && order.includes(BOTH_VARIANT_KEY)) {
    return BOTH_VARIANT_KEY;
  }
  if (preferredKey) return resolveVariantKey(contentObj, preferredKey);
  return order[0] || '';
};

const splitTextBlocks = (text: string) =>
  text
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);

const splitComparableLines = (block: string) =>
  block
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

const buildBilingualBlockRows = (leftBlock: string, rightBlock: string) => {
  const leftLines = splitComparableLines(leftBlock);
  const rightLines = splitComparableLines(rightBlock);
  const canAlignByLine =
    leftLines.length > 1 &&
    rightLines.length > 1 &&
    Math.abs(leftLines.length - rightLines.length) <= 1;

  if (!canAlignByLine) {
    return [{ left: leftBlock, right: rightBlock }];
  }

  const rows = [];
  const max = Math.max(leftLines.length, rightLines.length);
  for (let i = 0; i < max; i += 1) {
    rows.push({
      left: leftLines[i] || '',
      right: rightLines[i] || '',
    });
  }
  return rows;
};

const buildBilingualBlocks = (leftText: string, rightText: string) => {
  const leftBlocks = splitTextBlocks(leftText);
  const rightBlocks = splitTextBlocks(rightText);
  const max = Math.max(leftBlocks.length, rightBlocks.length);
  const blocks = [];

  for (let i = 0; i < max; i += 1) {
    blocks.push(buildBilingualBlockRows(leftBlocks[i] || '', rightBlocks[i] || ''));
  }

  return blocks;
};

const BilingualText = ({
  leftLabel,
  leftText,
  rightLabel,
  rightText,
}: {
  leftLabel: string;
  leftText: string;
  rightLabel: string;
  rightText: string;
}) => (
  <div className="w-full space-y-3">
    <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-2 text-xs font-semibold uppercase text-muted-foreground">
      <div className="min-w-0 [overflow-wrap:anywhere]">{leftLabel}</div>
      <div className="min-w-0 [overflow-wrap:anywhere]">{rightLabel}</div>
    </div>
    {buildBilingualBlocks(leftText, rightText).map((rows, blockIndex) => (
      <div key={`bilingual-block-${blockIndex}`} className="space-y-2">
        {rows.map((row, rowIndex) => (
          <div
            key={`bilingual-row-${blockIndex}-${rowIndex}`}
            className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-2 border-b border-border/40 pb-2 last:border-b-0 last:pb-0"
          >
            <div className="min-w-0 [overflow-wrap:anywhere]">{row.left ? renderText(row.left) : null}</div>
            <div className="min-w-0 [overflow-wrap:anywhere]">{row.right ? renderText(row.right) : null}</div>
          </div>
        ))}
      </div>
    ))}
  </div>
);

// === CONTENIDO ===
const PrayerContent = ({
  prayer,
  searchState,
  scrollContainerRef,
  onBilingualModeChange,
}: {
  prayer: Prayer;
  searchState?: { term: string; activeIndex: number; resultsCount: number };
  scrollContainerRef?: React.RefObject<HTMLDivElement>;
  onBilingualModeChange?: (active: boolean) => void;
}) => {
  const {
    setScrollPosition,
    scrollPositions,
    theme,
    pinchToZoomEnabled,
    prayerTextZoom,
    setPrayerTextZoom,
    prayerLanguagePreferences,
    prayerLanguageProfile,
  } = useSettings();
  const throttleTimeout = useRef<NodeJS.Timeout | null>(null);
  const restoredScrollKeyRef = useRef<string | null>(null);

  // Pinch-to-zoom logic
  const [initialDistance, setInitialDistance] = useState<number | null>(null);
  const [initialZoom, setInitialZoom] = useState<number | null>(null);

  useEffect(() => {
    const el = scrollContainerRef?.current;
    if (!pinchToZoomEnabled || !el) return;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        // Only prevent default if we're actually starting a pinch
        const d = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        setInitialDistance(d);
        setInitialZoom(prayerTextZoom);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && initialDistance !== null && initialZoom !== null) {
        e.preventDefault(); // Prevent default browser zoom
        const d = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );

        // Calculate scale factor
        const scale = d / initialDistance;

        // New zoom
        let newZoom = initialZoom * scale;

        // Clamp between 0.5 and 2.0 (same as SettingsContext normalization)
        newZoom = Math.max(0.5, Math.min(newZoom, 2.0));

        setPrayerTextZoom(newZoom);
      }
    };

    const handleTouchEnd = () => {
      setInitialDistance(null);
      setInitialZoom(null);
    };

    el.addEventListener('touchstart', handleTouchStart, { passive: false });
    el.addEventListener('touchmove', handleTouchMove, { passive: false });
    el.addEventListener('touchend', handleTouchEnd);

    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('touchend', handleTouchEnd);
    };
  }, [pinchToZoomEnabled, initialDistance, initialZoom, prayerTextZoom, setPrayerTextZoom, scrollContainerRef]);

  const themeMode: 'light' | 'dark' = theme === 'dark' ? 'dark' : 'light';
  const prayerId: string = prayer.id ?? '';
  const isCamino = prayerId === 'camino-libro';

  useEffect(() => {
    if (prayer.isLongText) return;
    const el = scrollContainerRef?.current;
    if (el) {
      el.scrollTo(0, 0);
    }
    window.scrollTo(0, 0);
  }, [prayerId, prayer.isLongText, scrollContainerRef]);

  const handleScroll = useCallback(() => {
    if (!prayer.isLongText || !prayerId) return;
    const container = scrollContainerRef?.current;
    if (!container) return;
    if (throttleTimeout.current) clearTimeout(throttleTimeout.current);
    throttleTimeout.current = setTimeout(() => {
      setScrollPosition(prayerId, container.scrollTop);
    }, 200);
  }, [prayerId, prayer.isLongText, setScrollPosition, scrollContainerRef]);

  useLayoutEffect(() => {
    if (!prayerId) return;
    const container = scrollContainerRef?.current;
    if (!container) return;
    const restoreKey = `${prayerId}:${prayer.isLongText ? 'long' : 'short'}`;
    if (restoredScrollKeyRef.current === restoreKey) return;

    if (prayer.isLongText) {
      const saved = scrollPositions[prayerId];
      if (typeof saved === 'number') {
        container.scrollTo({ top: saved });
        restoredScrollKeyRef.current = restoreKey;
        return;
      }
    }

    // Normal prayer or no saved position: always reset to top
    container.scrollTo({ top: 0 });
    restoredScrollKeyRef.current = restoreKey;
  }, [prayerId, scrollPositions, prayer.isLongText, scrollContainerRef]);

  useEffect(() => {
    const container = scrollContainerRef?.current;
    if (!container) return;
    container.addEventListener('scroll', handleScroll, { passive: true });

    const flushScrollPosition = () => {
      if (!prayer.isLongText || !prayerId) return;
      const currentContainer = scrollContainerRef?.current;
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
  }, [handleScroll, prayer.isLongText, prayerId, setScrollPosition, scrollContainerRef]);

  useEffect(() => {
    if (searchState?.term && searchState.activeIndex !== -1) {
      const el = document.getElementById(`search-result-${searchState.activeIndex}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [searchState?.activeIndex, searchState?.term]);

  const [selectedAngelusPrayer, setSelectedAngelusPrayer] = useState<AngelusPrayerMode>('angelus');

  const getPreferredVariant = useCallback(() => {
    if (!prayer.content || typeof prayer.content !== 'object') return '';
    const rawContentObj = prayer.content as Record<string, string>;
    const contentObj = isAngelusReginaPrayer(prayer.id)
      ? getAngelusLanguageContent(rawContentObj, selectedAngelusPrayer)
      : rawContentObj;
    const preferredLang = prayer.id
      ? prayerLanguagePreferences[prayer.id] ?? prayerLanguageProfile
      : prayerLanguageProfile;
    return resolveLanguageMode(contentObj, preferredLang);
  }, [prayer.content, prayer.id, prayerLanguagePreferences, prayerLanguageProfile, selectedAngelusPrayer]);

  const selectedLang = getPreferredVariant();

  useEffect(() => {
    onBilingualModeChange?.(isBothVariantKey(selectedLang));
  }, [onBilingualModeChange, selectedLang]);

  if (typeof prayer.content === 'string') {
    const { term = '', activeIndex = -1 } = searchState || {};
    return (
      <div
        className="text-foreground/90 leading-relaxed touch-pan-y"
        style={{ fontSize: `${prayerTextZoom}em` }}
      >
        {isCamino
          ? renderCaminoLines(prayer.content, term, activeIndex, themeMode)
          : term
            ? parseAndHighlight(prayer.content, term, activeIndex, themeMode)
            : renderText(prayer.content)}
      </div>
    );
  }

  if (prayer.content && typeof prayer.content === 'object') {
    const rawContentObj = prayer.content as Record<string, string>;
    const isAngelusRegina = isAngelusReginaPrayer(prayer.id);
    const contentObj = isAngelusRegina
      ? getAngelusLanguageContent(rawContentObj, selectedAngelusPrayer)
      : rawContentObj;
    const langs = Object.keys(contentObj);
    const modeOrder = getLanguageModeOrder(contentObj);
    const hasBothMode = modeOrder.includes(BOTH_VARIANT_KEY);

    const resolvedMode =
      isBothVariantKey(selectedLang) && hasBothMode
        ? BOTH_VARIANT_KEY
        : resolveVariantKey(contentObj, selectedLang);
    const displayedContent =
      resolvedMode && !isBothVariantKey(resolvedMode) ? contentObj[resolvedMode] || '' : '';
    const spanishLang = langs.find(isSpanishVariantKey);
    const latinLang = langs.find(isLatinVariantKey);
    const fallbackLeftLang = modeOrder.find((mode) => !isBothVariantKey(mode)) || langs[0] || '';
    const fallbackRightLang =
      modeOrder.find((mode) => !isBothVariantKey(mode) && normalizeVariantKey(mode) !== normalizeVariantKey(fallbackLeftLang)) ||
      langs.find((lang) => normalizeVariantKey(lang) !== normalizeVariantKey(fallbackLeftLang)) ||
      '';
    const leftLang = latinLang || fallbackLeftLang;
    const rightLang = spanishLang || fallbackRightLang;

    const toggleAngelusPrayer = () => {
      setSelectedAngelusPrayer((current) => current === 'angelus' ? 'reginaCoeli' : 'angelus');
    };

    return (
      <div className="touch-pan-y">
        {isAngelusRegina ? (
          <div className="mb-2 flex items-center justify-end gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs font-normal text-muted-foreground hover:text-foreground"
              onClick={toggleAngelusPrayer}
              title={`Cambiar a ${selectedAngelusPrayer === 'angelus' ? 'Regina Coeli' : 'Ángelus'}`}
            >
              {selectedAngelusPrayer === 'angelus' ? 'Ángelus' : 'Regina Coeli'}
            </Button>
          </div>
        ) : null}
        <div
          className="text-foreground/90 leading-relaxed"
          style={{ fontSize: `${prayerTextZoom}em` }}
        >
          {isBothVariantKey(resolvedMode) && leftLang && rightLang ? (
            <BilingualText
              leftLabel={formatVariantLabel(leftLang)}
              leftText={contentObj[leftLang] || ''}
              rightLabel={formatVariantLabel(rightLang)}
              rightText={contentObj[rightLang] || ''}
            />
          ) : (
            renderText(displayedContent)
          )}
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
  const { isDistractionFree, isDeveloperMode, perpetualBackgroundEnabled } = useSettings();
  const showsPerpetualBackground = isDeveloperMode && perpetualBackgroundEnabled;
  const [localAudioSrc, setLocalAudioSrc] = useState<string | null>(null);
  const [isBilingualMode, setIsBilingualMode] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
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
    <div className={cn(
      'flex min-h-0 flex-col h-full overscroll-contain',
      showsPerpetualBackground ? 'bg-transparent' : 'bg-background',
      isDistractionFree
        ? 'pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] px-0'
        : 'p-0'
    )}>
      {prayer.imageUrl && (
        <div className={cn('px-4 py-4 shrink-0 z-10', showsPerpetualBackground ? 'bg-transparent' : 'bg-background')}>
          <div
            className={cn(
              'relative overflow-hidden rounded-lg shadow-sm border border-border/10',
              isDistractionFree && 'rounded-none border-0 shadow-none'
            )}
            style={{ height: isDistractionFree ? 'min(42vh, 420px)' : '180px' }}
          >
            <Image
              src={prayer.imageUrl}
              alt={prayer.title || 'Imagen de la oración'}
              fill
              className="object-cover"
              style={{ objectPosition }}
              priority
            />
          </div>
        </div>
      )}

      <div className={cn('flex-1 min-h-0 flex flex-col', isDistractionFree && 'mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 w-full')}>
        {showAudioPlayer && (
          <div className="px-4 mb-4 shrink-0">
            <div className="sticky top-0 z-20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-2 rounded-xl border shadow-sm">
              {audioSrc ? (
                <AudioPlayer src={audioSrc} title={localAudioSrc ? 'Audio seleccionado' : 'Escuchar meditación'} />
              ) : (
                <div className="rounded-lg bg-secondary/50 p-4 text-center text-sm text-muted-foreground">
                  Selecciona un audio para escuchar
                </div>
              )}
            </div>
          </div>
        )}

        <div className={cn("flex-1 min-h-0 flex flex-col", !isDistractionFree && "px-4 pb-4")}>
          <Card
            className={cn(
              'overflow-hidden border shadow-md flex flex-col min-h-0 h-full mx-auto w-full',
              showsPerpetualBackground ? 'bg-card/65 backdrop-blur-[1px]' : 'bg-card',
              isDistractionFree ? 'border-0 bg-transparent shadow-none' : 'flex-1'
            )}
          >
            <CardContent className={cn(
              'flex flex-1 flex-col min-h-0',
              isBilingualMode ? 'px-2 py-4' : 'p-6',
              isDistractionFree && 'p-0 text-[1.05rem] leading-[1.85]'
            )}>
              <div
                ref={scrollContainerRef}
                data-app-scroll-container="true"
                className={cn(
                  'flex-1 min-h-0 overflow-y-auto touch-pan-y overscroll-contain scroll-smooth',
                  !isBilingualMode && 'pr-6'
                )}
              >
                {prayer.content ? (
                  <PrayerContent
                    prayer={prayer}
                    searchState={searchState}
                    scrollContainerRef={scrollContainerRef}
                    onBilingualModeChange={setIsBilingualMode}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">Contenido no disponible.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
