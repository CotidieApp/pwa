"use client";

import { useMemo } from "react";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { appVersion } from "@/lib/version";
import { useSettings } from "@/context/SettingsContext";

export default function SplashScreen() {
  const settings = useSettings();

  const allHomeBackgrounds = settings?.allHomeBackgrounds || PlaceHolderImages;

  const defaultSplashImage = useMemo(() => {
    return allHomeBackgrounds.find((img) => img.id.startsWith("home-")) || allHomeBackgrounds[0] || null;
  }, [allHomeBackgrounds]);

  const bgImageForSplash = useMemo(() => {
    const homeBackgroundId = settings?.homeBackgroundId;
    if (!homeBackgroundId) return defaultSplashImage;
    return allHomeBackgrounds.find((img) => img.id === homeBackgroundId) || defaultSplashImage;
  }, [allHomeBackgrounds, defaultSplashImage, settings?.homeBackgroundId]);

  return (
    <div className="relative flex flex-col h-full bg-background text-foreground font-body">
      {/* Fondo animado */}
      <div className="absolute inset-0 overflow-hidden">
        <div
          className="h-full w-full bg-cover bg-center animate-in fade-in-0 duration-1000"
          style={{ backgroundImage: "var(--home-bg-image)" }}
          data-ai-hint={bgImageForSplash?.imageHint}
        />
      </div>

      {/* Título central */}
      <div className="relative flex-grow flex items-center justify-center">
        <div className="flex flex-col items-center p-4">
          <h1 className="!text-[clamp(4.25rem,18vw,7.25rem)] leading-none font-premium text-white text-center [text-shadow:0_4px_16px_rgba(0,0,0,0.9)]">
            Cotidie
          </h1>
          <p className="text-white/90 italic mt-2 text-[clamp(1.15rem,4.8vw,1.65rem)] leading-snug [text-shadow:0_4px_16px_rgba(0,0,0,0.9)]">
            Sérviam cum gaudio magno!
          </p>
        </div>
      </div>

      {/* Versión dinámica sincronizada con package.json */}
      <div className="absolute bottom-3 right-4 text-white/70 text-xs font-medium tracking-wide [text-shadow:0_2px_8px_rgba(0,0,0,0.9)]">
        v{appVersion}
      </div>
    </div>
  );
}
