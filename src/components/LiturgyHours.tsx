'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import PrayerDetail from '@/components/PrayerDetail';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { languageModeLabel } from '@/components/main/language-mode';
import { useSettings } from '@/context/SettingsContext';
import { getLocalDateKey } from '@/lib/calendar-date';
import { LITURGY_HOURS, MAX_LITURGY_YEAR, parseLiturgyDate, type LiturgyHour } from '@/lib/liturgy-hours';
import { loadLiturgyCorpus, readLiturgy, type LiturgyReading, type LiturgySection } from '@/lib/liturgy-hours-reader';
import { loadLectionary, readMass } from '@/lib/liturgy-mass-reader';
import { loadRegionalHours } from '@/lib/liturgy-hours-chile';
import type { ChileanLiturgicalDay } from '@/lib/liturgy-chile';
import type { Prayer } from '@/lib/types';
import { cn } from '@/lib/utils';

const middleHours = LITURGY_HOURS.slice(3, 6);
const psalmHeading = /^(?:Salmo|Psalmus|Cántico)\s+\d/;
const readingSectionSeparator = 'mt-5 border-t border-border pt-5';

function ReadingText({ text }: { text: string }) {
  const content = text
    .replace(/\r\n?/g, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?p\b[^>]*>/gi, '\n\n')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&(?:amp|lt|gt|quot|apos);|&#39;/gi, value => ({
      '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&apos;': "'", '&#39;': "'",
    })[value.toLowerCase()] ?? value)
    .replace(/<\/?(?!i>|em>|strong>|b>)[a-z][^>]*>/gi, '');
  let italics = false;
  let bold = false;
  return content.trim().split(/\n\s*\n/).map((part, index) => {
    const heading = part.trim();
    if (psalmHeading.test(heading) && !heading.includes('\n')) {
      return <h4 key={index} className="mt-4 break-after-avoid font-headline font-semibold text-foreground">{heading}</h4>;
    }
    const nodes: ReactNode[] = [];
    part.trim().split(/(\$[^$]+\$|_[^_]+_|<\/?(?:i|em|strong|b)>)/gi).forEach((token, tokenIndex) => {
      if (/^<\/?(?:i|em)>$/i.test(token)) italics = token[1] !== '/';
      else if (/^<\/?(?:strong|b)>$/i.test(token)) bold = token[1] !== '/';
      else if (token.startsWith('$') && token.endsWith('$') && token.length > 1) {
        nodes.push(<span key={tokenIndex} className="text-red-700 dark:text-red-300">{token.slice(1, -1)}</span>);
      } else if (token.startsWith('_') && token.endsWith('_') && token.length > 1) {
        nodes.push(<em key={tokenIndex}>{token.slice(1, -1)}</em>);
      } else if (italics) nodes.push(<em key={tokenIndex}>{token}</em>);
      else if (bold) nodes.push(<strong key={tokenIndex}>{token}</strong>);
      else nodes.push(token);
    });
    return <p key={index} className="mt-3 whitespace-pre-line first:mt-0">{nodes}</p>;
  });
}

function ReadingSection({ section, lang, className }: { section: LiturgySection; lang: 'es' | 'la'; className?: string }) {
  const [heading, reference] = section.title?.split(' · ', 2) ?? [];
  return <section lang={lang} className={cn('min-w-0 [overflow-wrap:anywhere]', className)}>
    {heading && (
      <div className="mb-2 break-after-avoid">
        <h3 className="font-headline text-[1.1em] font-semibold leading-snug text-foreground">{heading}</h3>
        {reference && <p className="mt-0.5 text-[0.875em] text-muted-foreground">{reference}</p>}
        {section.notice && <p className="mt-1 text-[0.875em] text-muted-foreground">{section.notice}</p>}
      </div>
    )}
    <ReadingText text={section.text} />
  </section>;
}

export default function LiturgyHours({ prayer, mass = false }: { prayer: Prayer; mass?: boolean }) {
  const { isDistractionFree, prayerLanguagePreferences, prayerLanguageProfile, setPrayerLanguagePreference } = useSettings();
  const [date, setDate] = useState(() => getLocalDateKey(new Date()));
  const [hour, setHour] = useState<LiturgyHour>('completas');
  const [option, setOption] = useState(0);
  const [memorial, setMemorial] = useState('');
  const [result, setResult] = useState<{ key: string; readings: LiturgyReading[]; optional?: ChileanLiturgicalDay['optional']; failed?: boolean }>();
  const key = `${date}:${mass ? 'misa' : hour}:${memorial}`;

  useEffect(() => {
    let active = true;
    const civilDate = parseLiturgyDate(date);
    if (!civilDate) return;
    void loadLiturgyCorpus().then(async corpus => {
      const day = await corpus.getChileanLiturgicalDay(civilDate);
      if (mass) return { readings: readMass(await loadLectionary(), civilDate, day) };
      const regional = await loadRegionalHours();
      const readings = await readLiturgy(corpus, civilDate, hour, regional, memorial || undefined);
      return {
        readings,
        optional: day.optional.filter(entry => entry.id === 'laura_vicuna_virgin' || entry.id === 'ceferino_namuncura'),
      };
    }).then(
      reading => { if (active) setResult({ key, ...reading }); },
      () => { if (active) setResult({ key, readings: [], failed: true }); },
    );
    return () => { active = false; };
  }, [date, hour, key, mass, memorial]);

  const current = result?.key === key ? result : undefined;
  const reading = current?.readings[option];
  const latinSections = reading?.latinSections;
  const preferredLanguage = (prayer.id && prayerLanguagePreferences[prayer.id]) || prayerLanguageProfile;
  const language = latinSections ? preferredLanguage : 'espanol';
  const currentHour = LITURGY_HOURS.find(item => item.id === hour)?.label;
  const formsLabel = !mass && hour === 'invitatorio' ? 'Salmo del Invitatorio' : 'Formulario';
  const hasForms = current && current.readings.length > 1;
  const displayDate = date.split('-').reverse().join('/');
  const changeDate = (value: string) => {
    if (!parseLiturgyDate(value)) return;
    setOption(0);
    setMemorial('');
    setDate(value);
  };
  const shiftDate = (days: number) => {
    const next = parseLiturgyDate(date);
    if (!next) return;
    next.setDate(next.getDate() + days);
    changeDate(getLocalDateKey(next));
  };
  const readerPrayer = { ...prayer, id: `${prayer.id}:${key}:${option}`, imageUrl: undefined };

  const controls = (
    <div
      role="group"
      aria-label="Seleccionar lectura litúrgica"
      className={cn('grid shrink-0 items-start gap-2 border-b bg-muted/30 px-3 py-2 sm:px-4', (!mass || hasForms) && 'sm:grid-cols-2')}
    >
      <div className="flex w-full min-w-0 max-w-sm items-center gap-2">
        <div className="flex h-10 min-w-0 flex-1 items-center justify-between rounded-md border border-input bg-background">
          <Button type="button" variant="ghost" size="icon" className="h-full shrink-0 text-muted-foreground" aria-label="Día anterior" onClick={() => shiftDate(-1)}>
            <ChevronLeft />
          </Button>
          <div className="relative flex h-full flex-1 items-center justify-center gap-2 rounded-md px-1 focus-within:ring-2 focus-within:ring-inset focus-within:ring-ring">
            <time dateTime={date} aria-hidden="true" className="whitespace-nowrap text-sm tabular-nums">{displayDate}</time>
            <ChevronDown aria-hidden="true" className="size-4 shrink-0 opacity-50" />
            <Input
              aria-label="Fecha de la liturgia"
              type="date"
              max={`${MAX_LITURGY_YEAR}-12-31`}
              value={date}
              onChange={event => changeDate(event.target.value)}
              className="absolute inset-0 h-full cursor-pointer opacity-0 [color-scheme:light] dark:[color-scheme:dark] [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:p-0"
            />
          </div>
          <Button type="button" variant="ghost" size="icon" className="h-full shrink-0 text-muted-foreground" aria-label="Día siguiente" onClick={() => shiftDate(1)}>
            <ChevronRight />
          </Button>
        </div>
        <Button type="button" variant="ghost" className="shrink-0 px-2" onClick={() => changeDate(getLocalDateKey(new Date()))}>Hoy</Button>
      </div>
      {!mass && <div className="flex min-w-0 gap-2">
        <Select value={hour} onValueChange={value => {
          setOption(0);
          setHour(value as LiturgyHour);
        }}>
          <SelectTrigger aria-label="Hora litúrgica" className="min-w-0 flex-1 gap-2">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LITURGY_HOURS.slice(0, 3).map(({ id, label }) => <SelectItem key={id} value={id}>{label}</SelectItem>)}
            <SelectGroup>
              <SelectLabel>Hora intermedia</SelectLabel>
              {middleHours.map(({ id, label }) => <SelectItem key={id} value={id}>{label}</SelectItem>)}
            </SelectGroup>
            {LITURGY_HOURS.slice(6).map(({ id, label }) => <SelectItem key={id} value={id}>{label}</SelectItem>)}
          </SelectContent>
        </Select>
        {latinSections && prayer.id && <Select value={language} onValueChange={value => setPrayerLanguagePreference(prayer.id!, value)}>
          <SelectTrigger aria-label="Idioma de las Completas" className="w-auto shrink-0 gap-2"><SelectValue /></SelectTrigger>
          <SelectContent>
            {Object.entries(languageModeLabel).map(([mode, label]) => <SelectItem key={mode} value={mode}>{label}</SelectItem>)}
          </SelectContent>
        </Select>}
      </div>}
      {!!current?.optional?.length && <Select value={memorial || 'dia'} onValueChange={value => {
        setOption(0);
        setMemorial(value === 'dia' ? '' : value);
      }}>
        <SelectTrigger aria-label="Memoria libre" className="min-w-0 gap-2"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="dia">Celebración del día</SelectItem>
          {current.optional.map(({ id, name }) => <SelectItem key={id} value={id}>{name}</SelectItem>)}
        </SelectContent>
      </Select>}
      {hasForms && <Select value={String(option)} onValueChange={value => setOption(Number(value))}>
        <SelectTrigger aria-label={formsLabel} className="min-w-0 gap-2"><SelectValue /></SelectTrigger>
        <SelectContent>
          {current.readings.map(({ label }, index) => <SelectItem key={index} value={String(index)}>{label}</SelectItem>)}
        </SelectContent>
      </Select>}
    </div>
  );

  return (
    <PrayerDetail
      prayer={readerPrayer}
      keepScreenAwake={Boolean(reading)}
      readingBilingual={language === 'ambos'}
      readingControls={controls}
      readingContent={
        reading ? (
          <>
            <header className={cn('mb-5 space-y-1 border-b pb-4 [column-span:all]', isDistractionFree && 'pr-10')}>
              {!mass && isDistractionFree && <p className="text-sm font-semibold text-muted-foreground">{currentHour}</p>}
              <h2 className="font-headline text-[1.5em] font-semibold leading-tight text-foreground">{reading.celebration}</h2>
              {reading.label !== reading.celebration && reading.label !== currentHour && (
                <p className="text-[0.875em] text-muted-foreground">{reading.label}</p>
              )}
              {reading.notice && <p className="text-[0.875em] italic text-muted-foreground">{reading.notice}</p>}
              {mass && reading.santiago && (
                <a href={`https://www.eucaristiadiaria.cl/dia_cal.php?fecha=${reading.santiago}`} target="_blank" rel="noreferrer" className="text-[0.875em] text-muted-foreground underline">
                  Eucaristía Diaria · Arzobispado de Santiago
                </a>
              )}
              {mass && (reading.ordo ? (
                <details key={date} open={reading.ordo.pending || undefined} className="text-[0.875em] text-muted-foreground">
                  <summary className="cursor-pointer">Citas del Ordo chileno</summary>
                  {reading.ordo.references.map((reference, index) => <p key={index} className="mt-1">{reference}</p>)}
                  {reading.ordo.pending && <p className="mt-1">Alguna variante o delimitación del texto incluido sigue pendiente de cotejo.</p>}
                  <a href={reading.ordo.url} target="_blank" rel="noreferrer" className="mt-1 inline-block underline">
                    Ver página del Ordo
                  </a>
                </details>
              ) : (
                <p className="text-[0.875em] text-muted-foreground">Proyección del calendario chileno.</p>
              ))}
            </header>
            {language === 'ambos' && latinSections ? (
              <div className="prayer-bilingual-text">
                <div className="mb-4 grid grid-cols-2 gap-2 text-xs font-semibold uppercase text-muted-foreground">
                  <span>Latín</span><span>Español</span>
                </div>
                {reading.sections.map((section, index) => (
                  <div key={index} className={cn('grid grid-cols-2 gap-2 sm:gap-4', index > 0 && readingSectionSeparator)}>
                    <ReadingSection section={latinSections[index]} lang="la" />
                    <ReadingSection section={section} lang="es" />
                  </div>
                ))}
              </div>
            ) : (language === 'latin' && latinSections ? latinSections : reading.sections).map((section, index) => (
              <ReadingSection
                key={index}
                section={section}
                lang={language === 'latin' ? 'la' : 'es'}
                className={index > 0 ? readingSectionSeparator : undefined}
              />
            ))}
            {mass && <p className="mt-6 border-t pt-3 text-[0.8em] text-muted-foreground [column-span:all]">
              Leccionario del Cono Sur. Traducción bíblica: El Libro del Pueblo de Dios.
            </p>}
          </>
        ) : (
          <p role={current ? 'alert' : 'status'} className="text-sm text-muted-foreground">
            {current?.failed ? 'No se pudo abrir la edición incluida en Cotidie.'
              : current ? 'La edición incluida no contiene este formulario para la fecha elegida.'
                : mass ? 'Preparando las lecturas…' : 'Preparando la oración…'}
          </p>
        )
      }
    />
  );
}
