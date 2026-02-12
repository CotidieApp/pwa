'use client';

import React, { useEffect } from 'react';
import { useSettings } from '@/context/SettingsContext';

export default function ThemeManager({ children }: { children: React.ReactNode }) {
  const settings = useSettings();

  // This can happen on first load if the context is not immediately available.
  if (!settings) {
    return <>{children}</>;
  }

  const { theme, fontSize, fontFamily, activeThemeColors } = settings;

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.remove('font-literata', 'font-lora', 'font-merriweather', 'font-ebgaramond', 'font-timesnewroman');

    if (theme) {
      root.classList.add(theme);
    }

    const clampedFontSize = Math.min(21, Math.max(11, Number.isFinite(fontSize) ? fontSize : 15));
    root.style.fontSize = `${clampedFontSize}px`;

    if (fontFamily) {
      root.classList.add(`font-${fontFamily}`);
    } else {
      root.classList.add('font-literata');
    }

  }, [theme, fontSize, fontFamily]);

  useEffect(() => {
    const root = document.documentElement;
    
    if (activeThemeColors.primary) {
      root.style.setProperty('--primary-hue', String(activeThemeColors.primary.h));
      root.style.setProperty('--primary-saturation', `${activeThemeColors.primary.s}%`);
    } else {
      root.style.removeProperty('--primary-hue');
      root.style.removeProperty('--primary-saturation');
    }

    if (activeThemeColors.background) {
      root.style.setProperty('--background-hue', String(activeThemeColors.background.h));
      root.style.setProperty('--background-saturation', `${activeThemeColors.background.s}%`);
    } else {
      root.style.removeProperty('--background-hue');
      root.style.removeProperty('--background-saturation');
    }
    
    if (activeThemeColors.accent) {
      root.style.setProperty('--accent-hue', String(activeThemeColors.accent.h));
      root.style.setProperty('--accent-saturation', `${activeThemeColors.accent.s}%`);
    } else {
      root.style.removeProperty('--accent-hue');
      root.style.removeProperty('--accent-saturation');
    }
  }, [activeThemeColors]);

  return <>{children}</>;
}
