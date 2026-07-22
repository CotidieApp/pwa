'use client';

import { useCallback, useMemo, useState } from 'react';
import { ChevronDown, X } from 'lucide-react';

import ImmersivePrayerIndexOverlay, {
  type ImmersiveIndexSection,
} from '@/components/immersive/ImmersivePrayerIndexOverlay';
import { Button } from '@/components/ui/button';
import { useSettings } from '@/context/SettingsContext';
import { useScreenWakeLock } from '@/hooks/useScreenWakeLock';
import { exposicionBendicion } from '@/lib/prayers/oraciones/exposicion-bendicion';
import { exposicionBendicionPlanAdicional } from '@/lib/prayers/oraciones/exposicion-bendicion-plan';
import { renderText } from '@/lib/textFormatter';
import { cn } from '@/lib/utils';
import { handleTouchNavigation } from '@/utils/touchNavigation';

type ExpositionImmersiveProps = {
  onClose: () => void;
};

type ExpositionStep = {
  id: string;
  title: string;
  content: string;
  spanishContent?: string;
  latinContent?: string;
  singleColumn: boolean;
};

const normalizeLanguageKey = (key: string) =>
  key
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

const getLanguageContent = (content: Record<string, string>, language: 'espanol' | 'latin') => {
  const key = Object.keys(content).find((entry) => normalizeLanguageKey(entry) === language);
  return key ? content[key] : '';
};

const splitTextBlocks = (text: string) =>
  text
    .split(/\r?\n(?:[ \t]*\r?\n)+/)
    .map((block) => block.trim())
    .filter(Boolean);

const splitComparableLines = (block: string) =>
  block
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

const mergeTrailingExtraLine = (lines: string[], targetLength: number) => {
  if (lines.length !== targetLength + 1 || lines.length < 2) return lines;

  return [
    ...lines.slice(0, -2),
    `${lines[lines.length - 2]}\n${lines[lines.length - 1]}`,
  ];
};

const buildBilingualBlockRows = (leftBlock: string, rightBlock: string) => {
  const leftLines = splitComparableLines(leftBlock);
  const rightLines = splitComparableLines(rightBlock);
  const canAlignByLine =
    leftLines.length > 1 &&
    rightLines.length > 1 &&
    Math.abs(leftLines.length - rightLines.length) <= 1;

  if (!canAlignByLine) return [{ left: leftBlock, right: rightBlock }];

  const alignedLeftLines = mergeTrailingExtraLine(leftLines, rightLines.length);
  const alignedRightLines = mergeTrailingExtraLine(rightLines, leftLines.length);
  const rows = [];
  const max = Math.max(alignedLeftLines.length, alignedRightLines.length);
  for (let index = 0; index < max; index += 1) {
    rows.push({
      left: alignedLeftLines[index] || '',
      right: alignedRightLines[index] || '',
    });
  }
  return rows;
};

const buildBilingualBlocks = (leftText: string, rightText: string) => {
  const leftBlocks = splitTextBlocks(leftText);
  const rightBlocks = splitTextBlocks(rightText);
  const max = Math.max(leftBlocks.length, rightBlocks.length);
  const blocks = [];

  for (let index = 0; index < max; index += 1) {
    blocks.push(buildBilingualBlockRows(leftBlocks[index] || '', rightBlocks[index] || ''));
  }
  return blocks;
};

export default function ExpositionImmersive({ onClose }: ExpositionImmersiveProps) {
  const { prayerTextZoom, theme } = useSettings();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [showIndex, setShowIndex] = useState(false);

  useScreenWakeLock(true);

  const steps = useMemo<ExpositionStep[]>(() =>
    exposicionBendicionPlanAdicional
      .map((prayer, index) => {
        if (prayer.singleColumn) {
          return {
            id: prayer.id || `exposicion-adicional-${index + 1}`,
            title: prayer.title,
            content: prayer.content,
            spanishContent: '',
            latinContent: '',
            singleColumn: true,
          };
        }

        return {
          id: prayer.id || `exposicion-adicional-${index + 1}`,
          title: prayer.title,
          content: '',
          spanishContent: getLanguageContent(prayer.content, 'espanol'),
          latinContent: getLanguageContent(prayer.content, 'latin'),
          singleColumn: false,
        };
      })
      .filter((step) => step.content.trim().length > 0 || step.spanishContent || step.latinContent),
  []);

  const currentStep = steps[currentStepIndex] || steps[0];
  const isDark = theme === 'dark';

  const goPrev = useCallback(() => {
    setCurrentStepIndex((current) => Math.max(0, current - 1));
  }, []);

  const goNext = useCallback(() => {
    setCurrentStepIndex((current) => Math.min(steps.length - 1, current + 1));
  }, [steps.length]);

  const indexSections = useMemo<ImmersiveIndexSection[]>(() => [{
    title: 'Recorrido',
    items: steps.map((step, index) => ({
      id: step.id,
      label: step.title,
      active: index === currentStepIndex,
      onSelect: () => {
        setCurrentStepIndex(index);
        setShowIndex(false);
      },
    })),
  }], [currentStepIndex, steps]);

  if (!currentStep) return null;

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex overflow-hidden pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)] pt-[env(safe-area-inset-top)]',
        isDark ? 'bg-black text-white' : 'bg-zinc-50 text-zinc-950'
      )}
      onClick={(event) => handleTouchNavigation(event, goPrev, goNext)}
    >
      <div
        className="absolute inset-0 bg-cover bg-top"
        style={{ backgroundImage: `url(${exposicionBendicion.imageUrl})` }}
      />
      <div className={cn('absolute inset-0', isDark ? 'bg-black/80' : 'bg-white/75')} />

      <div className="relative z-10 flex min-h-0 w-full flex-col">
        <div className="flex items-start justify-between gap-2 px-4 py-3">
          <div className="w-11" />
          <button
            type="button"
            data-no-touch-nav
            className="flex min-w-0 flex-1 items-start justify-center gap-2 rounded-md px-3 py-2 text-center"
            onClick={() => setShowIndex((open) => !open)}
          >
            <span className="min-w-0 text-xl font-semibold leading-snug whitespace-normal [overflow-wrap:anywhere]">
              {currentStep.title}
            </span>
            <ChevronDown className={cn('mt-1 size-5 shrink-0 transition-transform', showIndex && 'rotate-180')} />
          </button>
          <Button variant="ghost" size="icon" data-no-touch-nav onClick={onClose} aria-label="Cerrar">
            <X className="size-6" />
          </Button>
        </div>

        <ImmersivePrayerIndexOverlay
          open={showIndex}
          title="Exposición y Bendición"
          description="Elige una parte del recorrido."
          sections={indexSections}
          onClose={() => setShowIndex(false)}
        />

        <main className="flex min-h-0 flex-1 items-start justify-center px-5 pb-4 pt-1 sm:px-8">
          <article
            className="max-h-full w-full max-w-2xl overflow-y-auto overscroll-contain px-5 py-6 text-foreground sm:px-8"
            style={{ fontSize: `${prayerTextZoom}em` }}
          >
            {currentStep.singleColumn ? (
              <div className="leading-relaxed">
                {renderText(currentStep.content)}
              </div>
            ) : currentStep.spanishContent || currentStep.latinContent ? (
              <div className="space-y-3 leading-relaxed">
                <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-3 text-xs font-semibold uppercase text-muted-foreground">
                  <div className="min-w-0 [overflow-wrap:anywhere]">Latín</div>
                  <div className="min-w-0 [overflow-wrap:anywhere]">Español</div>
                </div>
                {buildBilingualBlocks(
                  currentStep.latinContent || '',
                  currentStep.spanishContent || ''
                ).map((rows, blockIndex) => (
                  <div key={`exposition-block-${blockIndex}`} className="space-y-2">
                    {rows.map((row, rowIndex) => (
                      <div
                        key={`exposition-row-${blockIndex}-${rowIndex}`}
                        className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-3"
                      >
                        <div className="min-w-0 [overflow-wrap:anywhere]">
                          {row.left ? renderText(row.left) : null}
                        </div>
                        <div className="min-w-0 [overflow-wrap:anywhere]">
                          {row.right ? renderText(row.right) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ) : (
              <div className="leading-relaxed">{renderText(currentStep.content)}</div>
            )}
          </article>
        </main>

        <div className="flex justify-center px-4 py-4">
          <div className="h-1.5 w-32 overflow-hidden rounded-full bg-foreground/15">
            <div
              className="h-full bg-primary transition-[width]"
              style={{ width: `${((currentStepIndex + 1) / steps.length) * 100}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
