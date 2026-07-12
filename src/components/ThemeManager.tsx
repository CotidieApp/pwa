'use client';

import React, { useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { useSettings } from '@/context/SettingsContext';
import BackgroundActions from '@/plugins/BackgroundActions';

type RgbaColor = { r: number; g: number; b: number; a: number };

const parseCssColor = (value: string): RgbaColor | null => {
  const match = value.match(
    /^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:\s*[,/]\s*([\d.]+))?\s*\)$/i
  );
  if (!match) return null;
  return {
    r: Number(match[1]),
    g: Number(match[2]),
    b: Number(match[3]),
    a: match[4] === undefined ? 1 : Number(match[4]),
  };
};

const compositeColors = (frontToBack: RgbaColor[]) => {
  let r = 0;
  let g = 0;
  let b = 0;
  let alpha = 0;
  for (const color of frontToBack) {
    const contribution = Math.max(0, Math.min(1, color.a)) * (1 - alpha);
    r += color.r * contribution;
    g += color.g * contribution;
    b += color.b * contribution;
    alpha += contribution;
    if (alpha >= 0.995) break;
  }
  return { r, g, b, a: alpha };
};

const relativeLuminance = ({ r, g, b }: RgbaColor) => {
  const linearize = (channel: number) => {
    const normalized = channel / 255;
    return normalized <= 0.04045
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);
};

const getLayerZIndex = (element: HTMLElement) => {
  const parsed = Number(window.getComputedStyle(element).zIndex);
  return Number.isFinite(parsed) ? parsed : 0;
};

const collectPointBackgrounds = (side: 'top' | 'bottom') => {
  const selector = `[data-system-bar-layer="${side}"]`;
  const explicitLayers = Array.from(document.querySelectorAll<HTMLElement>(selector))
    .filter((element) => window.getComputedStyle(element).display !== 'none')
    .sort((a, b) => getLayerZIndex(b) - getLayerZIndex(a));

  const colors: RgbaColor[] = [];
  for (const element of explicitLayers) {
    const style = window.getComputedStyle(element);
    const color = parseCssColor(style.backgroundColor);
    if (color && color.a > 0) {
      colors.push({ ...color, a: color.a * Number(style.opacity || 1) });
    }
  }

  const current = compositeColors(colors);
  if (current.a < 0.995) {
    const x = Math.max(1, Math.floor(window.innerWidth / 2));
    const y = side === 'top' ? 1 : Math.max(1, window.innerHeight - 2);
    for (const element of document.elementsFromPoint(x, y)) {
      if (!(element instanceof HTMLElement) || element.matches(selector)) continue;
      const style = window.getComputedStyle(element);
      const color = parseCssColor(style.backgroundColor);
      if (!color || color.a <= 0) continue;
      colors.push({ ...color, a: color.a * Number(style.opacity || 1) });
      if (compositeColors(colors).a >= 0.995) break;
    }
  }

  if (compositeColors(colors).a < 0.995) {
    const rootColor = parseCssColor(window.getComputedStyle(document.documentElement).backgroundColor);
    if (rootColor) colors.push(rootColor);
  }

  return compositeColors(colors);
};

const shouldUseDarkIcons = (side: 'top' | 'bottom') => {
  const background = collectPointBackgrounds(side);
  const luminance = relativeLuminance(background);
  const contrastWithBlack = (luminance + 0.05) / 0.05;
  const contrastWithWhite = 1.05 / (luminance + 0.05);
  return contrastWithBlack >= contrastWithWhite;
};

export default function ThemeManager({ children }: { children: React.ReactNode }) {
  const settings = useSettings();
  const lastSystemBarAppearanceRef = useRef<string>('');

  const theme = settings?.theme;
  const fontSize = settings?.fontSize;
  const fontFamily = settings?.fontFamily;
  const appScale = settings?.appScale ?? 1.0;
  const activeThemeColors = settings?.activeThemeColors;

  useEffect(() => {
    if (!settings) return;
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.remove('font-literata', 'font-lora', 'font-merriweather', 'font-ebgaramond', 'font-timesnewroman');

    if (theme) {
      root.classList.add(theme);
    }

    // Task 5: App-wide scaling
    const baseSize = 15;
    const scaledSize = baseSize * appScale;
    root.style.fontSize = `${scaledSize}px`;

    if (fontFamily) {
      root.classList.add(`font-${fontFamily}`);
    } else {
      root.classList.add('font-literata');
    }

  }, [settings, theme, appScale, fontFamily]);

  useEffect(() => {
    if (!settings || !activeThemeColors) return;
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
  }, [settings, activeThemeColors]);

  useEffect(() => {
    if (!settings) return;
    let animationFrame = 0;
    let settleTimer = 0;

    const synchronize = () => {
      animationFrame = 0;
      const darkStatusIcons = shouldUseDarkIcons('top');
      const darkNavigationIcons = shouldUseDarkIcons('bottom');
      const appearanceKey = `${darkStatusIcons}:${darkNavigationIcons}`;
      document.documentElement.dataset.systemBarIcons = appearanceKey;
      if (appearanceKey === lastSystemBarAppearanceRef.current) return;
      lastSystemBarAppearanceRef.current = appearanceKey;
      if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android') {
        void BackgroundActions.setSystemBarAppearance({
          darkStatusIcons,
          darkNavigationIcons,
        }).catch(() => {});
      }
    };

    const scheduleSynchronization = () => {
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
      if (settleTimer) window.clearTimeout(settleTimer);
      animationFrame = window.requestAnimationFrame(synchronize);
      settleTimer = window.setTimeout(synchronize, 250);
    };

    const observer = new MutationObserver(scheduleSynchronization);
    observer.observe(document.documentElement, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['class', 'style', 'data-state', 'data-system-bar-layer'],
    });
    window.addEventListener('resize', scheduleSynchronization);
    document.addEventListener('transitionend', scheduleSynchronization, true);
    scheduleSynchronization();

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', scheduleSynchronization);
      document.removeEventListener('transitionend', scheduleSynchronization, true);
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
      if (settleTimer) window.clearTimeout(settleTimer);
    };
  }, [activeThemeColors, settings, theme]);

  return <>{children}</>;
}
