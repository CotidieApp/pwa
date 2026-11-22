'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import PrayerDetail from '@/components/PrayerDetail';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { languageModeLabel } from '@/components/main/language-mode';
import { useSettings } from '@/context/SettingsContext';
import { getLocalDateKey } from '@/lib/calendar-date';
import { LITURGY_HOURS, parseLiturgyDate, type LiturgyHour } from '@/lib/liturgy-hours';
import { loadLiturgyCorpus, readLiturgy, type LiturgyReading, type LiturgySection } from '@/lib/liturgy-hours-reader';
import { loadLectionary, readMass } from '@/lib/liturgy-mass-reader';
import { loadRegionalHours } from '@/lib/liturgy-hours-chile';
import type { ChileanLiturgicalDay } from '@/lib/liturgy-chile';
import type { Prayer } from '@/lib/types';

const middleHours = LITURGY_HOURS.slice(3, 6);
const psalmHeading = /^(?:Salmo|Psalmus|Cántico)\s+\d/;

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
      return <h4 key={index} className="mt-4 font-headline text-sm font-semibold text-foreground">{heading}</h4>;
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

function ReadingSection({ section, lang }: { section: LiturgySection; lang: 'es' | 'la' }) {
  const [heading, reference] = section.title?.split(' · ', 2) ?? [];
  return <section lang={lang} className="min-w-0 [overflow-wrap:anywhere]">
    {heading && <h3 className="mb-2 font-headline text-sm font-semibold text-foreground">{heading}
      {reference && <>{' '}<span className="ml-1 font-sans font-normal text-muted-foreground">{reference}</span></>}
    </h3>}
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

  return (
    <div className="flex h-full min-h-0 flex-col">
      {!isDistractionFree && <div className="mx-auto grid w-full max-w-3xl shrink-0 gap-2 px-4 pb-3 pt-2 sm:grid-cols-2">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex min-w-0 flex-1 items-center rounded-lg border bg-card shadow-sm">
            <Button type="button" variant="ghost" size="icon" className="shrink-0" aria-label="Día anterior" onClick={() => shiftDate(-1)}>
              <ChevronLeft className="size-5" />
            </Button>
            <div className="flex min-w-0 flex-1 justify-center">
              <Input aria-label="Fecha de la liturgia" type="date" value={date} onChange={event => changeDate(event.target.value)}
                className="relative w-36 max-w-full border-0 bg-transparent pl-5 pr-7 text-center tabular-nums [color-scheme:light] dark:[color-scheme:dark] [&::-webkit-date-and-time-value]:text-center [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-1" />
            </div>
            <Button type="button" variant="ghost" size="icon" className="shrink-0" aria-label="Día siguiente" onClick={() => shiftDate(1)}>
              <ChevronRight className="size-5" />
            </Button>
          </div>
          <Button type="button" variant="ghost" size="sm" className="shrink-0" onClick={() => changeDate(getLocalDateKey(new Date()))}>Hoy</Button>
        </div>
        {!mass && <div className="flex min-w-0 gap-2">
          <Select value={hour} onValueChange={value => {
            setOption(0);
            setHour(value as LiturgyHour);
          }}>
            <SelectTrigger aria-label="Hora litúrgica" className="min-w-0 flex-1 rounded-lg bg-card shadow-sm">
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
            <SelectTrigger aria-label="Idioma de las Completas" className="w-auto shrink-0 gap-2 rounded-lg bg-card shadow-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(languageModeLabel).map(([mode, label]) => <SelectItem key={mode} value={mode}>{label}</SelectItem>)}
            </SelectContent>
          </Select>}
        </div>}
        {!!current?.optional?.length && <Select value={memorial || 'dia'} onValueChange={value => {
          setOption(0);
          setMemorial(value === 'dia' ? '' : value);
        }}>
          <SelectTrigger aria-label="Memoria libre" className="rounded-lg bg-card sm:col-span-2"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="dia">Celebración del día</SelectItem>
            {current.optional.map(({ id, name }) => <SelectItem key={id} value={id}>{name}</SelectItem>)}
          </SelectContent>
        </Select>}
        {current && current.readings.length > 1 && <Select value={String(option)} onValueChange={value => setOption(Number(value))}>
          <SelectTrigger aria-label={formsLabel} className="rounded-lg bg-card sm:col-span-2"><SelectValue /></SelectTrigger>
          <SelectContent>
            {current.readings.map(({ label }, index) => <SelectItem key={index} value={String(index)}>{label}</SelectItem>)}
          </SelectContent>
        </Select>}
      </div>}
      <div className="min-h-0 flex-1">
        <PrayerDetail prayer={readerPrayer} keepScreenAwake={Boolean(reading)} readingBilingual={language === 'ambos'} readingContent={
          reading ? (
            <>
              <div className="mb-5 border-b pb-4">
                {!mass && <p className="mb-1 text-sm font-semibold text-primary">{currentHour}</p>}
                <h2 className="font-headline text-xl font-semibold leading-tight text-foreground">{reading.celebration}</h2>
                {reading.label !== reading.celebration && reading.label !== currentHour && (
                  <p className="mt-1 text-sm text-muted-foreground">{reading.label}</p>
                )}
                {reading.notice && <p className="mt-3 text-sm text-muted-foreground">{reading.notice}</p>}
              </div>
              {language === 'ambos' && latinSections ? (
                <div className="prayer-bilingual-text space-y-4">
                  <div className="grid grid-cols-2 gap-2 text-xs font-semibold uppercase text-muted-foreground">
                    <span>Latín</span><span>Español</span>
                  </div>
                  {reading.sections.map((section, index) => (
                    <div key={index} className="grid grid-cols-2 gap-2 border-b border-border/40 pb-4 last:border-0 last:pb-0 sm:gap-4">
                      <ReadingSection section={latinSections[index]} lang="la" />
                      <ReadingSection section={section} lang="es" />
                    </div>
                  ))}
                </div>
              ) : (language === 'latin' && latinSections ? latinSections : reading.sections).map((section, index) => (
                <div className="mb-6 last:mb-0" key={index}>
                  <ReadingSection section={section} lang={language === 'latin' ? 'la' : 'es'} />
                </div>
              ))}
              {mass && <p className="mt-6 border-t pt-3 text-xs text-muted-foreground">
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
        } />
      </div>
    </div>
  );
}
