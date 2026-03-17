'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Eye } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useSettings } from '@/context/SettingsContext';
import { cn } from '@/lib/utils';
import { getLiturgicalColor } from '@/lib/getLiturgicalColor';
import { renderText } from '@/lib/textFormatter';
import { getImageObjectPosition } from '@/lib/image-display';

export default function SaintOfTheDayCard() {
  const {
    saintOfTheDay,
    saintOfTheDayImage,
    overriddenFixedSaint,
    overriddenFixedSaintImage,
    simulatedDate,
  } = useSettings();

  const [isPeeking, setIsPeeking] = useState(false);

  const showFixed = isPeeking && overriddenFixedSaint;
  const activeSaint = showFixed ? overriddenFixedSaint : saintOfTheDay;
  const activeImage = showFixed ? overriddenFixedSaintImage : saintOfTheDayImage;

  if (!activeSaint) return null;

  const color = getLiturgicalColor(activeSaint, simulatedDate);
  const isLightColor = color === '#D4AF37' || color === '#F8F9FA' || color === '#B8860B';
  const textColor = isLightColor ? 'text-slate-800' : 'text-white';
  const objectPosition = getImageObjectPosition(activeImage?.id);

  return (
    <Card className={cn('shadow-md mb-4 overflow-hidden relative', textColor)} style={{ backgroundColor: color }}>
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
          {overriddenFixedSaint && (
            <button
              className="absolute bottom-2 right-2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full backdrop-blur-sm transition-all active:scale-95 z-10"
              onPointerDown={() => setIsPeeking(true)}
              onPointerUp={() => setIsPeeking(false)}
              onPointerLeave={() => setIsPeeking(false)}
              aria-label="Ver santo fijo"
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
