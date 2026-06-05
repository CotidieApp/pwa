'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Eye } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useSettings } from '@/context/SettingsContext';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { resolveDevotionDayPrayerId } from '@/lib/devotion-day-images';
import { cn } from '@/lib/utils';
import { getLiturgicalColor } from '@/lib/getLiturgicalColor';
import { renderText } from '@/lib/textFormatter';
import { getImageObjectPosition } from '@/lib/image-display';

type SaintOfTheDayCardProps = {
  onOpenPrayerById?: (id: string) => void;
};

const isLightHexColor = (color: string) => {
  const match = color.match(/^#([0-9a-f]{6})$/i);
  if (!match) return false;
  const value = match[1];
  const r = parseInt(value.slice(0, 2), 16) / 255;
  const g = parseInt(value.slice(2, 4), 16) / 255;
  const b = parseInt(value.slice(4, 6), 16) / 255;
  const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luma > 0.6;
};

export default function SaintOfTheDayCard({ onOpenPrayerById }: SaintOfTheDayCardProps) {
  const {
    saintOfTheDay,
    saintOfTheDayImage,
    saintOfTheDayPrayerId,
    overriddenFixedSaint,
    overriddenFixedSaintImage,
    simulatedDate,
  } = useSettings();

  const [isPeeking, setIsPeeking] = useState(false);

<<<<<<< HEAD
  const canPeekHiddenSaint = Boolean(overriddenFixedSaint);
  const isShowingHiddenSaint = Boolean(isPeeking && overriddenFixedSaint);
  const activeSaint = isShowingHiddenSaint ? overriddenFixedSaint : saintOfTheDay;
  const activeImage = isShowingHiddenSaint ? overriddenFixedSaintImage : saintOfTheDayImage;
=======
  const showFixed = isPeeking && overriddenFixedSaint;
  const activeSaint = showFixed ? overriddenFixedSaint : saintOfTheDay;
  const activeImage = showFixed ? overriddenFixedSaintImage : saintOfTheDayImage;
>>>>>>> 47b58837317ce981497a0fdbdeaed3c3f8cb75d3

  if (!activeSaint) return null;

  const now = simulatedDate ? new Date(simulatedDate) : new Date();
  const isAnnunciationDay = now.getMonth() === 2 && now.getDate() === 25;
  const annunciationOverlayImage = isAnnunciationDay
    ? PlaceHolderImages.find((img) => img.id === 'annunciation-overlay-image') || null
    : null;
<<<<<<< HEAD
  const activePrayerId = isShowingHiddenSaint
=======
  const activePrayerId = showFixed
>>>>>>> 47b58837317ce981497a0fdbdeaed3c3f8cb75d3
    ? resolveDevotionDayPrayerId(activeSaint)
    : saintOfTheDayPrayerId ?? resolveDevotionDayPrayerId(activeSaint);
  const isClickable = Boolean(activePrayerId && onOpenPrayerById);
  const color = getLiturgicalColor(activeSaint, simulatedDate);
  const isLightColor = isLightHexColor(color);
  const textColor = isLightColor ? 'text-slate-800' : 'text-white';
  const objectPosition = getImageObjectPosition(activeImage?.id);

  const handleOpen = () => {
    if (!activePrayerId || !onOpenPrayerById) return;
    onOpenPrayerById(activePrayerId);
  };

  return (
    <Card
      className={cn(
        'shadow-md mb-4 overflow-hidden relative',
        textColor,
        isClickable && 'cursor-pointer transition-colors hover:bg-accent/20'
      )}
      style={{ backgroundColor: color }}
      onClick={isClickable ? handleOpen : undefined}
      onKeyDown={isClickable ? (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          handleOpen();
        }
      } : undefined}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      aria-label={isClickable ? `Abrir ${activeSaint.name}` : undefined}
    >
      {activeImage && (
        <div className="relative w-full aspect-[3/2]">
          <Image
            src={activeImage.imageUrl}
            alt={activeImage.description || 'Imagen del Santo del Día'}
            fill
            sizes="(max-width: 768px) 100vw, 33vw"
            className="object-cover"
            style={{ objectPosition }}
            data-ai-hint={activeImage.imageHint}
            priority
          />
          {annunciationOverlayImage && (
            <div className="absolute bottom-3 left-3 z-10 w-[42%] max-w-[11rem] min-w-[6.5rem] overflow-hidden rounded-2xl border border-white/45 bg-white/10 shadow-[0_18px_45px_rgba(0,0,0,0.4)] backdrop-blur-[1px]">
              <div className="relative aspect-square">
                <Image
                  src={annunciationOverlayImage.imageUrl}
                  alt={annunciationOverlayImage.description || 'Anunciación del Señor'}
                  fill
                  sizes="180px"
                  className="object-cover"
                  priority
                />
              </div>
            </div>
          )}
<<<<<<< HEAD
          {canPeekHiddenSaint && (
=======
          {overriddenFixedSaint && (
>>>>>>> 47b58837317ce981497a0fdbdeaed3c3f8cb75d3
            <button
              className="absolute bottom-2 right-2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full backdrop-blur-sm transition-all active:scale-95 z-20"
              onClick={(event) => event.stopPropagation()}
              onPointerDown={(event) => {
                event.stopPropagation();
                setIsPeeking(true);
              }}
              onPointerUp={(event) => {
                event.stopPropagation();
                setIsPeeking(false);
              }}
<<<<<<< HEAD
              onPointerCancel={(event) => {
                event.stopPropagation();
                setIsPeeking(false);
              }}
=======
>>>>>>> 47b58837317ce981497a0fdbdeaed3c3f8cb75d3
              onPointerLeave={(event) => {
                event.stopPropagation();
                setIsPeeking(false);
              }}
<<<<<<< HEAD
              aria-label="Mantener presionado para ver el santo del día"
=======
              aria-label="Ver santo fijo"
>>>>>>> 47b58837317ce981497a0fdbdeaed3c3f8cb75d3
            >
              <Eye className="size-5" />
            </button>
          )}
        </div>
      )}
      <CardHeader>
        <CardTitle className="font-headline text-base font-bold flex justify-between items-start gap-2">
          <span>{activeSaint.name}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div
          className={cn(
            'text-sm leading-relaxed space-y-2',
            isLightColor ? 'text-slate-700' : 'text-white/90'
          )}
        >
          {renderText(activeSaint.bio || '')}
        </div>
      </CardContent>
    </Card>
  );
}
