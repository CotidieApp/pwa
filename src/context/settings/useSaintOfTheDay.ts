import { useEffect, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import BackgroundActions from '@/plugins/BackgroundActions';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { resolveDevotionDayMatch } from '@/lib/devotion-day-images';
import { getLiturgicalColor } from '@/lib/getLiturgicalColor';
import { parseCalendarDate } from '@/lib/calendar-date';
import { getSaintDaySelection } from '@/lib/movable-feasts';
import saintDayImages from '@/lib/saint-day-images.json';
import type { ImagePlaceholder, SaintOfTheDay } from '@/lib/types';

type UseSaintOfTheDayParams = {
  isLoaded: boolean;
  simulatedDate: string | null;
  movableFeastsEnabled: boolean;
  lastSaintUpdate: string | null;
  setLastSaintUpdate: Dispatch<SetStateAction<string | null>>;
  saintOfTheDay: SaintOfTheDay | null;
  setSaintOfTheDay: Dispatch<SetStateAction<SaintOfTheDay | null>>;
  saintOfTheDayImage: ImagePlaceholder | null;
  setSaintOfTheDayImage: Dispatch<SetStateAction<ImagePlaceholder | null>>;
  saintOfTheDayPrayerId: string | null;
  setSaintOfTheDayPrayerId: Dispatch<SetStateAction<string | null>>;
  overriddenFixedSaint: SaintOfTheDay | null;
  setOverriddenFixedSaint: Dispatch<SetStateAction<SaintOfTheDay | null>>;
  overriddenFixedSaintImage: ImagePlaceholder | null;
  setOverriddenFixedSaintImage: Dispatch<SetStateAction<ImagePlaceholder | null>>;
};

export const useSaintOfTheDay = ({
  isLoaded,
  simulatedDate,
  movableFeastsEnabled,
  lastSaintUpdate,
  setLastSaintUpdate,
  saintOfTheDay,
  setSaintOfTheDay,
  saintOfTheDayImage,
  setSaintOfTheDayImage,
  saintOfTheDayPrayerId,
  setSaintOfTheDayPrayerId,
  overriddenFixedSaint,
  setOverriddenFixedSaint,
  overriddenFixedSaintImage,
  setOverriddenFixedSaintImage,
}: UseSaintOfTheDayParams) => {
  const [saintRefreshClock, setSaintRefreshClock] = useState(() => Date.now());

  useEffect(() => {
    if (!isLoaded || !saintOfTheDay) return;
    if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') return;
    void BackgroundActions.refreshSaintWidgets({
      name: saintOfTheDay.name,
      bio: saintOfTheDay.bio,
      prayerId: saintOfTheDayPrayerId ?? '',
      imageId: saintOfTheDayImage?.id,
      imageUrl: saintOfTheDayImage?.imageUrl,
      backgroundColor: getLiturgicalColor(saintOfTheDay, simulatedDate),
    }).catch(() => {});
  }, [
    isLoaded,
    saintOfTheDay,
    saintOfTheDayImage?.id,
    saintOfTheDayImage?.imageUrl,
    saintOfTheDayPrayerId,
    simulatedDate,
  ]);

  useEffect(() => {
    let midnightTimeout: ReturnType<typeof setTimeout> | null = null;
    let nativeListener: { remove: () => void } | null = null;
    let disposed = false;

    const refreshSaintDate = () => setSaintRefreshClock(Date.now());
    const scheduleMidnightRefresh = () => {
      if (midnightTimeout) clearTimeout(midnightTimeout);
      const now = new Date();
      const nextMidnight = new Date(now);
      nextMidnight.setHours(24, 0, 0, 0);
      midnightTimeout = setTimeout(() => {
        refreshSaintDate();
        scheduleMidnightRefresh();
      }, Math.max(0, nextMidnight.getTime() - now.getTime()) + 50);
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') refreshSaintDate();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    scheduleMidnightRefresh();

    if (Capacitor.isNativePlatform()) {
      void App.addListener('appStateChange', ({ isActive }) => {
        if (isActive) refreshSaintDate();
      }).then((listener) => {
        if (disposed) {
          void listener.remove();
        } else {
          nativeListener = listener;
        }
      }).catch(() => undefined);
    }

    return () => {
      disposed = true;
      if (midnightTimeout) clearTimeout(midnightTimeout);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      void nativeListener?.remove();
    };
  }, []);

  // Saints logic
  useEffect(() => {
    const now = (simulatedDate && parseCalendarDate(simulatedDate)) || new Date();
    const currentMonth = now.getMonth() + 1;
    const currentDay = now.getDate();
    const pad2 = (n: number) => String(n).padStart(2, '0');
    const dateKey = `${now.getFullYear()}-${pad2(currentMonth)}-${pad2(currentDay)}`;

    const { effectiveSaint, hiddenFixedSaint } = getSaintDaySelection(now, movableFeastsEnabled);

    const dow = now.getDay(); // 0..6
    const dayImageId = `saintoftheday-${dow}`;
    const dayImage = PlaceHolderImages.find(img => img.id === dayImageId) || null;
    const marianNamePattern =
      /(Nuestra Señora|Virgen María|Inmaculada Concepción|Asunción de la Virgen|Presentación de la Virgen|Natividad de la Virgen|Visitación de la Virgen)/i;
    const marianImage = PlaceHolderImages.find((img) => img.id === 'saintoftheday-6') || dayImage;
    const resolveSaintVisuals = (saint: SaintOfTheDay | null) => {
      const devotionMatch = resolveDevotionDayMatch(saint);
      const specificImage = saint && saintDayImages.find(({ names }) => names.includes(saint.name));
      const isMarian = saint?.type === 'marian' || marianNamePattern.test(saint?.name ?? '');
      const image = specificImage || devotionMatch?.image || (isMarian && dow !== 0 ? marianImage : dayImage);

      return {
        image,
        prayerId: devotionMatch?.prayerId ?? null,
      };
    };

    const { image, prayerId } = resolveSaintVisuals(effectiveSaint);
    const hiddenFixedImage = hiddenFixedSaint
      ? resolveSaintVisuals(hiddenFixedSaint).image
      : null;
    const sameHiddenSaint =
      overriddenFixedSaint?.name === hiddenFixedSaint?.name &&
      overriddenFixedSaint?.bio === hiddenFixedSaint?.bio &&
      overriddenFixedSaint?.title === hiddenFixedSaint?.title &&
      overriddenFixedSaint?.type === (hiddenFixedSaint as any)?.type;
    const sameHiddenImage =
      overriddenFixedSaintImage?.id === hiddenFixedImage?.id &&
      overriddenFixedSaintImage?.imageUrl === hiddenFixedImage?.imageUrl;

    const sameSaint =
      saintOfTheDay?.name === effectiveSaint?.name &&
      saintOfTheDay?.bio === effectiveSaint?.bio &&
      saintOfTheDay?.title === effectiveSaint?.title &&
      saintOfTheDay?.type === (effectiveSaint as any)?.type;
    const sameImage =
      saintOfTheDayImage?.id === image?.id &&
      saintOfTheDayImage?.imageUrl === image?.imageUrl;
    const samePrayerId = saintOfTheDayPrayerId === prayerId;
    if (
      lastSaintUpdate === dateKey &&
      sameSaint &&
      sameImage &&
      samePrayerId &&
      sameHiddenSaint &&
      sameHiddenImage
    ) {
      return;
    }

    setSaintOfTheDay(effectiveSaint || null);
    setSaintOfTheDayImage(image || null);
    setSaintOfTheDayPrayerId(prayerId);
    setOverriddenFixedSaint(hiddenFixedSaint || null);
    setOverriddenFixedSaintImage(hiddenFixedImage || null);
    setLastSaintUpdate(dateKey);
  }, [
    simulatedDate,
    lastSaintUpdate,
    movableFeastsEnabled,
    saintOfTheDay,
    saintOfTheDayImage,
    saintOfTheDayPrayerId,
    overriddenFixedSaint,
    overriddenFixedSaintImage,
    saintRefreshClock,
    setSaintOfTheDay,
    setSaintOfTheDayImage,
    setSaintOfTheDayPrayerId,
    setOverriddenFixedSaint,
    setOverriddenFixedSaintImage,
    setLastSaintUpdate,
  ]);
};
