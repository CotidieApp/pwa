import { useEffect, useMemo } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import type { ImagePlaceholder } from '@/lib/types';
import { defaultThemeColors, defaultHomeBackgroundId } from './defaults';
import type { CustomThemeColors } from './types';

type UseHomeBackgroundRotationParams = {
  isLoaded: boolean;
  userHomeBackgrounds: ImagePlaceholder[];
  homeBackgroundId: string | null;
  setHomeBackgroundId: Dispatch<SetStateAction<string | null>>;
  autoRotateBackground: boolean;
  lastBackgroundRotationDate: string | null;
  setLastBackgroundRotationDate: Dispatch<SetStateAction<string | null>>;
  simulatedDate: string | null;
  isCustomThemeActive: boolean;
  customThemeColors: CustomThemeColors;
};

export const useHomeBackgroundRotation = ({
  isLoaded,
  userHomeBackgrounds,
  homeBackgroundId,
  setHomeBackgroundId,
  autoRotateBackground,
  lastBackgroundRotationDate,
  setLastBackgroundRotationDate,
  simulatedDate,
  isCustomThemeActive,
  customThemeColors,
}: UseHomeBackgroundRotationParams) => {
  const allHomeBackgrounds = useMemo(() => {
      return [
        ...PlaceHolderImages.filter(img => img.id.startsWith('home-')),
        ...userHomeBackgrounds
      ];
  }, [userHomeBackgrounds]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (!isLoaded) return;

    const activeUrl = homeBackgroundId
      ? allHomeBackgrounds.find((img) => img.id === homeBackgroundId)?.imageUrl ?? null
      : null;
    const defaultUrl = defaultHomeBackgroundId
      ? PlaceHolderImages.find((img) => img.id === defaultHomeBackgroundId)?.imageUrl ?? null
      : null;
    const url = activeUrl ?? defaultUrl;

    if (!url) {
      document.documentElement.style.removeProperty('--home-bg-image');
      return;
    }

    const escaped = url.replace(/"/g, '\\"');
    document.documentElement.style.setProperty('--home-bg-image', `url("${escaped}")`);

    if (typeof window === 'undefined') return;
    try {
      if (window.localStorage && typeof window.localStorage.setItem === 'function') {
        window.localStorage.setItem('cotidie_home_bg_url', url);
      }
    } catch {}
  }, [allHomeBackgrounds, homeBackgroundId, isLoaded]);

  const activeThemeColors: CustomThemeColors = useMemo(() => {
      if (isCustomThemeActive) return customThemeColors;

      if (homeBackgroundId) {
        const activeBackground = allHomeBackgrounds.find(img => img.id === homeBackgroundId);
        if (activeBackground?.themeColors) return activeBackground.themeColors as CustomThemeColors;
      }

      return defaultThemeColors;
  }, [isCustomThemeActive, customThemeColors, homeBackgroundId, allHomeBackgrounds]);

  useEffect(() => {
    if (!autoRotateBackground || !isLoaded) return;

    const getLocalDateKey = (d: Date) => {
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    };

    const toUtcDayNumber = (d: Date) =>
      Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000);

    const toUtcDayNumberFromDateKey = (dateKey: string) => {
      const parts = dateKey.split('-');
      if (parts.length !== 3) return null;
      const yyyy = Number(parts[0]);
      const mm = Number(parts[1]);
      const dd = Number(parts[2]);
      if (!Number.isFinite(yyyy) || !Number.isFinite(mm) || !Number.isFinite(dd)) return null;
      return Math.floor(Date.UTC(yyyy, mm - 1, dd) / 86400000);
    };

    const getNow = () => (simulatedDate ? new Date(simulatedDate) : new Date());

    const getRotationIds = () => {
      const ids = allHomeBackgrounds.map((img) => img.id).filter(Boolean);
      if (!defaultHomeBackgroundId) return ids;
      const idx = ids.indexOf(defaultHomeBackgroundId);
      if (idx <= 0) return ids;
      return [ids[idx], ...ids.slice(0, idx), ...ids.slice(idx + 1)];
    };

    const applyDailyRotation = () => {
      const now = getNow();
      const dateKey = getLocalDateKey(now);
      if (lastBackgroundRotationDate === dateKey) return;

      const rotationIds = getRotationIds();
      if (rotationIds.length === 0) {
        setLastBackgroundRotationDate(dateKey);
        return;
      }

      if (!lastBackgroundRotationDate) {
        if (!homeBackgroundId) setHomeBackgroundId(rotationIds[0]);
        setLastBackgroundRotationDate(dateKey);
        return;
      }

      const lastUtcDay = toUtcDayNumberFromDateKey(lastBackgroundRotationDate);
      const todayUtcDay = toUtcDayNumber(now);
      const rawDiffDays = lastUtcDay === null ? 1 : todayUtcDay - lastUtcDay;
      const diffDays =
        rawDiffDays === 0 ? 1 : Number.isFinite(rawDiffDays) ? rawDiffDays : 1;

      const currentIndex = homeBackgroundId ? rotationIds.indexOf(homeBackgroundId) : -1;
      const baseIndex = currentIndex >= 0 ? currentIndex : 0;
      const shift = diffDays % rotationIds.length;
      const nextIndex = (baseIndex + shift + rotationIds.length) % rotationIds.length;

      setHomeBackgroundId(rotationIds[nextIndex]);
      setLastBackgroundRotationDate(dateKey);
    };

    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const scheduleNextMidnight = () => {
      const now = new Date();
      const next = new Date(now);
      next.setHours(24, 0, 0, 0);
      const delay = Math.max(0, next.getTime() - now.getTime());

      timeoutId = setTimeout(() => {
        applyDailyRotation();
        scheduleNextMidnight();
      }, delay);
    };

    applyDailyRotation();
    scheduleNextMidnight();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [
    autoRotateBackground,
    simulatedDate,
    lastBackgroundRotationDate,
    isLoaded,
    homeBackgroundId,
    allHomeBackgrounds,
  ]);

  return { allHomeBackgrounds, activeThemeColors };
};
