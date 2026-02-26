import React from "react";
import "./globals.css";

import { Toaster } from "@/components/ui/toaster";
import { SettingsProvider } from '@/context/SettingsContext';
import ThemeManager from "@/components/ThemeManager";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import ServiceWorkerCleanup from "@/components/ServiceWorkerCleanup";

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

const devServiceWorkerCleanupScript = `(function(){try{var host=location.hostname||'';var isLocal=host==='localhost'||host==='127.0.0.1'||host==='0.0.0.0';if(!isLocal){return;}if('serviceWorker' in navigator){navigator.serviceWorker.getRegistrations().then(function(regs){regs.forEach(function(r){r.unregister();});});}if('caches' in window){caches.keys().then(function(keys){keys.forEach(function(k){caches.delete(k);});});}}catch(e){}})();`;

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
        <script dangerouslySetInnerHTML={{ __html: devServiceWorkerCleanupScript }} />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, user-scalable=no, viewport-fit=cover"
        />
        <meta name="theme-color" content="#000000" />
        <meta name="google" content="notranslate" />

        <link rel="manifest" href="/manifest.json" />
        
        <link rel="icon" href="/icons/icon.png" />
        <link rel="apple-touch-icon" href="/icons/icon.png" />

        {/* Fuentes Locales */}
        <link rel="stylesheet" href="/fonts/fonts.css" />
      </head>

      <body className="h-full font-body">
        <SettingsProvider>
          <ThemeManager>
            <ServiceWorkerCleanup />
            {children}
            <Toaster />
          </ThemeManager>
        </SettingsProvider>
      </body>
    </html>
  );
}
