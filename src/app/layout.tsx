import React from "react";
import "./globals.css";

import { Toaster } from "@/components/ui/toaster";
import { SettingsProvider } from '@/context/SettingsContext';
import ThemeManager from "@/components/ThemeManager";
import { PlaceHolderImages } from "@/lib/placeholder-images";

const HOME_BG_URL_KEY = "cotidie_home_bg_url";

const defaultHomeBackgroundUrl: string | null =
  PlaceHolderImages.find((img) => img.id.startsWith("home-"))?.imageUrl ?? null;

const escapeJsonForInlineScript = (value: string) =>
  JSON.stringify(value).replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");

const defaultHomeBackgroundCssValue =
  defaultHomeBackgroundUrl && defaultHomeBackgroundUrl.length > 0
    ? `url("${defaultHomeBackgroundUrl.replace(/"/g, '\\"')}")`
    : "none";

const preloadHomeBackgroundScript = `(function(){try{var urlKey=${escapeJsonForInlineScript(
  HOME_BG_URL_KEY
)};var url=localStorage.getItem(urlKey)||${defaultHomeBackgroundUrl ? escapeJsonForInlineScript(defaultHomeBackgroundUrl) : "null"};if(!url){return;}var cleaned=String(url).replace(/[\\n\\r\\u2028\\u2029]/g,'');var escaped=cleaned.replace(/"/g,'\\\\\"');document.documentElement.style.setProperty('--home-bg-image','url(\"'+escaped+'\")');}catch(e){}})();`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="es"
      translate="no"
      className="h-full"
      suppressHydrationWarning
      style={{ ["--home-bg-image" as any]: defaultHomeBackgroundCssValue }}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: preloadHomeBackgroundScript }} />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, user-scalable=no, viewport-fit=cover"
        />
        <meta name="theme-color" content="#000000" />
        <meta name="google" content="notranslate" />

        <link rel="manifest" href="/manifest.json" />
        
        {/* Íconos Adaptativos (Dark/Light) */}
        <link rel="icon" href="/icons/icon.png" />
        <link rel="icon" href="/icons/black_icon.png" media="(prefers-color-scheme: light)" />
        <link rel="icon" href="/icons/white_icon.png" media="(prefers-color-scheme: dark)" />

        {/* Fuentes Locales */}
        <link rel="stylesheet" href="/fonts/fonts.css" />
      </head>

      <body className="h-full font-body">
        <SettingsProvider>
          <ThemeManager>
            {children}
            <Toaster />
          </ThemeManager>
        </SettingsProvider>
      </body>
    </html>
  );
}
