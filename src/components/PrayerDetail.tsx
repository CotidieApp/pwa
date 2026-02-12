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

// Encadre centralizado por id (si no tienes este archivo, coméntalo o ajusta):
import { getImageObjectPosition } from '@/lib/image-display';

// ---------- util: escapar HTML ----------
const escapeHtml = (str: string) =>
  str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

const formatInlineHtml = (escaped: string) => {
  const withStrong = escaped
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(.+?)__/g, '<strong>$1</strong>');

  return withStrong
    .replace(/(^|[^\w*])\*(?!\*)(.+?)\*(?!\w)/g, '$1<em>$2</em>')
    .replace(/(^|[^\w_])_(?!_)(.+?)_(?!\w)/g, '$1<em>$2</em>');
};

const getAppScrollContainer = (): HTMLElement | null => {
  if (typeof document === 'undefined') return null;
  return document.querySelector('[data-app-scroll-container="true"]');
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
        .map((ln, j) => {
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

const formatVariantLabel = (key: string) => {
  if (!key) return '';
  if (key === 'reginaCoeli') return 'Regina Coeli';
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
}: {
  prayer: Prayer;
  searchState?: { term: string; activeIndex: number; resultsCount: number };
}) => {
  const { setScrollPosition, scrollPositions, theme } = useSettings();
  const throttleTimeout = useRef<NodeJS.Timeout | null>(null);

  const themeMode: 'light' | 'dark' = theme === 'dark' ? 'dark' : 'light';
  const prayerId: string = prayer.id ?? '';
  const isCamino = prayerId === 'camino-libro';

  const handleScroll = useCallback(() => {
    if (!prayer.isLongText || !prayerId) return;
    const container = getAppScrollContainer();
    if (!container) return;
    if (throttleTimeout.current) clearTimeout(throttleTimeout.current);
    throttleTimeout.current = setTimeout(() => {
      setScrollPosition(prayerId, container.scrollTop);
    }, 200);
  }, [prayerId, prayer.isLongText, setScrollPosition]);

  useLayoutEffect(() => {
    if (!prayerId) return;
    const container = getAppScrollContainer();
    if (!container) return;
    if (prayer.isLongText) {
      const saved = scrollPositions[prayerId];
      if (typeof saved === 'number' && (!searchState || !searchState.term)) {
        container.scrollTo({ top: saved });
      }
    } else {
      container.scrollTo({ top: 0 });
    }
  }, [prayerId, scrollPositions, searchState, prayer.isLongText]);

  useEffect(() => {
    const container = getAppScrollContainer();
    if (!container) return;
    container.addEventListener('scroll', handleScroll, { passive: true });

    const flushScrollPosition = () => {
      if (!prayer.isLongText || !prayerId) return;
      const currentContainer = getAppScrollContainer();
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
    if (searchState?.term && searchState.activeIndex !== -1) {
      const el = document.getElementById(`search-result-${searchState.activeIndex}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [searchState?.activeIndex, searchState?.term]);

  const [selectedLang, setSelectedLang] = useState(() =>
    prayer.id === 'preces' ? 'latín' : 'español'
  );

  useEffect(() => {
    if (!prayer.content || typeof prayer.content !== 'object') return;
    const contentObj = prayer.content as Record<string, string>;
    const langs = Object.keys(contentObj);
    if (langs.length === 0) return;
    if (prayer.id === 'preces' && langs.includes('latín')) {
      setSelectedLang('latín');
      return;
    }
    if (!langs.includes(selectedLang)) {
      setSelectedLang(langs[0] || 'español');
    }
  }, [prayer.content, prayer.id]);

  if (typeof prayer.content === 'string') {
    const { term = '', activeIndex = -1 } = searchState || {};
    return (
      <div className="text-foreground/90 leading-relaxed">
        {isCamino
          ? renderCaminoLines(prayer.content, term, activeIndex, themeMode)
          : term
            ? parseAndHighlight(prayer.content, term, activeIndex, themeMode)
            : renderText(prayer.content)}
      </div>
    );
  }

  if (prayer.content && typeof prayer.content === 'object') {
    const contentObj = prayer.content as Record<string, string>;
    const langs = Object.keys(contentObj);

    const displayedContent = contentObj[selectedLang] || '';
    const otherLang = langs.find((lang) => lang !== selectedLang);
    const selectedLabel = formatVariantLabel(selectedLang);
    const otherLabel = otherLang ? formatVariantLabel(otherLang) : '';

    const toggleLang = () => {
      if (otherLang) setSelectedLang(otherLang);
    };

    return (
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
        <div className="text-foreground/90 leading-relaxed">
          {renderText(displayedContent)}
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
  const [showRosaryGuide, setShowRosaryGuide] = useState(false);
  
  const isRosaryMystery = prayer.id?.startsWith('rosario-') || prayer.id?.startsWith('misterios-') || prayer.id === 'santo-rosario' || prayer.title?.toLowerCase().includes('rosario');

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

  useEffect(() => {
    // Wake Lock
    let wakeLock: any = null;
    const requestWakeLock = async () => {
        try {
            if ('wakeLock' in navigator) {
                wakeLock = await (navigator as any).wakeLock.request('screen');
            }
        } catch (err) {
            console.error(err);
        }
    };
    requestWakeLock();
    return () => {
        if (wakeLock) wakeLock.release();
    };
  }, []);

  const objectPosition = getImageObjectPosition(prayer.id);

  return (
    <div
      className={cn(
        'p-4',
        isDistractionFree ? 'max-w-3xl mx-auto py-20 sm:px-6 lg:px-8' : ''
      )}
    >
      {prayer.imageUrl && !isDistractionFree && (
        <div className="relative mb-4 rounded-lg overflow-hidden" style={{ height: '200px' }}>
          <Image
            src={prayer.imageUrl}
            alt={prayer.title || 'Imagen de la oración'}
            fill
            className="object-cover"
            style={{ objectPosition }}
            priority
          />
        </div>
      )}

      {showAudioPlayer && (
        <div className="mb-6 space-y-4">
           {audioSrc ? (
             <AudioPlayer src={audioSrc} title={localAudioSrc ? "Audio seleccionado" : "Escuchar meditación"} />
           ) : (
             <div className="p-4 bg-secondary/50 rounded-lg text-center text-sm text-muted-foreground">
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
                      "w-full justify-start text-left",
                      localAudioSrc === audio.src && "border-primary bg-primary/5 text-primary"
                    )}
                    onClick={() => setLocalAudioSrc(audio.src)}
                   >
                     <Icon.Play className="mr-2 h-4 w-4" />
                     {audio.title}
                   </Button>
                 ))}
               </div>

               <div className="pt-2 border-t">
                  <Label htmlFor="audio-upload" className="block text-sm font-medium mb-2">
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
          'bg-card shadow-md border overflow-hidden',
          isDistractionFree && 'border-0 shadow-none bg-transparent'
        )}
      >
        <CardContent className={cn('p-6 pt-6', isDistractionFree && 'p-0 pt-0 text-[1.05rem] leading-[1.85]')}>
          {prayer.content ? (
            <PrayerContent prayer={prayer} searchState={searchState} />
          ) : (
            <p className="text-sm text-muted-foreground">Contenido no disponible.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
