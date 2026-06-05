"use client";

import { appVersion } from "@/lib/version";

export default function SplashScreen() {
  return (
    <div className="relative flex h-full flex-col bg-background text-foreground font-body">
      <div className="absolute inset-0 overflow-hidden">
        <div
          className="h-full w-full bg-cover bg-center animate-in fade-in-0 duration-1000"
          style={{ backgroundImage: "var(--home-bg-image)" }}
        />
      </div>

      <div className="relative flex flex-grow items-center justify-center">
        <div className="flex flex-col items-center p-4">
          <h1 className="!text-[clamp(4.25rem,18vw,7.25rem)] leading-none font-premium text-white text-center [text-shadow:0_4px_16px_rgba(0,0,0,0.9)]">
            Cotidie
          </h1>
          <p className="mt-2 text-[clamp(1.15rem,4.8vw,1.65rem)] leading-snug italic text-white/90 [text-shadow:0_4px_16px_rgba(0,0,0,0.9)]">
            Serviam cum gaudio magno!
          </p>
        </div>
      </div>

      <div className="absolute bottom-3 right-4 text-xs font-medium tracking-wide text-white/70 [text-shadow:0_2px_8px_rgba(0,0,0,0.9)]">
        v{appVersion}
      </div>
    </div>
  );
}
