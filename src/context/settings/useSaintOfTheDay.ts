import { useEffect, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import BackgroundActions from '@/plugins/BackgroundActions';
import saintsDataRaw from '@/lib/saints-data.json';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { resolveDevotionDayMatch } from '@/lib/devotion-day-images';
import { getLiturgicalColor } from '@/lib/getLiturgicalColor';
import { getMovableFeast, getEasterDate } from '@/lib/movable-feasts';
import type { ImagePlaceholder, SaintOfTheDay } from '@/lib/types';

const saintsData = saintsDataRaw as { saints: SaintOfTheDay[] };

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
    saintOfTheDay?.name,
    saintOfTheDay?.bio,
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
    const now = simulatedDate ? new Date(simulatedDate) : new Date();
    const currentMonth = now.getMonth() + 1;
    const currentDay = now.getDate();
    const pad2 = (n: number) => String(n).padStart(2, '0');
    const dateKey = `${now.getFullYear()}-${pad2(currentMonth)}-${pad2(currentDay)}`;

    // 1. Check Movable Feasts first (Ash Wednesday, Easter, etc.)
    const easter = getEasterDate(now.getFullYear());
    const movable = getMovableFeast(now, easter);

    // 2. Check Fixed Saints
    const fixed = saintsData.saints.find(s => s.month === currentMonth && s.day === currentDay) || null;

    // Priority logic based on user setting
    // If enabled: Movable takes precedence (e.g. Ash Wednesday > San Simeón)
    // If disabled: Fixed takes precedence (e.g. San Simeón > Ash Wednesday)
    const effectiveSaintBase = movableFeastsEnabled
      ? (movable || fixed)
      : (fixed || movable);

    // Task 16: Combine names if a movable feast overlaps a high importance fixed saint
    let effectiveSaint = effectiveSaintBase;
    if (movableFeastsEnabled && movable && fixed && fixed.isHighImportance && movable.name !== fixed.name) {
      effectiveSaint = {
        ...movable,
        name: `${movable.name} / ${fixed.name}`,
        bio: `**${movable.name}**: ${movable.bio}\n\n**${fixed.name}**: ${fixed.bio}`,
      };
    }

    const hiddenFixedSaint =
      movableFeastsEnabled && movable && fixed && !fixed.isHighImportance
        ? fixed
        : null;

    const dow = now.getDay(); // 0..6
    const dayImageId = `saintoftheday-${dow}`;
    const dayImage = PlaceHolderImages.find(img => img.id === dayImageId) || null;
    const marianNamePattern =
      /(Nuestra Señora|Virgen María|Inmaculada Concepción|Asunción de la Virgen|Presentación de la Virgen|Natividad de la Virgen|Visitación de la Virgen)/i;
    const marianImage = PlaceHolderImages.find((img) => img.id === 'saintoftheday-6') || dayImage;

    const resolveSaintVisuals = (saint: SaintOfTheDay | null) => {
      const devotionMatch = resolveDevotionDayMatch(saint);
      let image = dayImage;

      if (currentMonth === 12 && (currentDay === 24 || currentDay === 25)) {
        const christmasImage = PlaceHolderImages.find((img) => img.id === 'christmas-image') || null;
        image = christmasImage || dayImage;
      } else if (saint?.name?.includes('Pentecostés')) {
        image = PlaceHolderImages.find((img) => img.id === 'pentecost-image') || dayImage;
      } else if (saint?.name?.includes('Santísima Trinidad')) {
        image = PlaceHolderImages.find((img) => img.id === 'holy-trinity-image') || dayImage;
      } else if (saint?.name?.includes('Corpus Christi')) {
        image = PlaceHolderImages.find((img) => img.id === 'corpus-christi-image') || dayImage;
      } else if (saint?.name?.includes('Sagrado Corazón')) {
        image = PlaceHolderImages.find((img) => img.id === 'home-sacred-heart') || dayImage;
      } else if (saint?.name?.includes('Inmaculado Corazón')) {
        image = PlaceHolderImages.find((img) => img.id === 'home-immaculate-heart') || dayImage;
      } else {
        const isMarian = Boolean(
          (saint as any)?.type === 'marian' || (saint?.name && marianNamePattern.test(saint.name))
        );

        if (devotionMatch?.image) {
          image = devotionMatch.image;
        } else if (isMarian) {
          image = marianImage;
        }
      }

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
      overriddenFixedSaint?.type === (hiddenFixedSaint as any)?.type;
    const sameHiddenImage =
      overriddenFixedSaintImage?.id === hiddenFixedImage?.id &&
      overriddenFixedSaintImage?.imageUrl === hiddenFixedImage?.imageUrl;

    const sameSaint =
      saintOfTheDay?.name === effectiveSaint?.name &&
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
  ]);
};
