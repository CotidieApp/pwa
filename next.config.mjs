import { PHASE_DEVELOPMENT_SERVER } from "next/constants.js";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
  // Cotidie is a static-export SPA: "/" always returns the same index.html.
  // With the default (dynamicStartUrl: true) the start URL is served
  // NetworkFirst, so offline the PWA waits on the network before falling back
  // to cache (the "inicio se queda cargando" / "la rechaza por no tener
  // conexion" symptom). Setting it false precaches the start URL, so the home
  // shell loads instantly from cache with no connection.
  dynamicStartUrl: false,
});

function hideFunctionProperties(value, seen = new WeakSet()) {
  if (!value || (typeof value !== "object" && typeof value !== "function") || seen.has(value)) {
    return;
  }

  seen.add(value);

  for (const key of Object.keys(value)) {
    const current = value[key];

    if (typeof current === "function") {
      Object.defineProperty(value, key, {
        value: current,
        enumerable: false,
        configurable: true,
        writable: true,
      });
      continue;
    }

    hideFunctionProperties(current, seen);
  }
}

export default function nextConfig(phase) {
  const config = {
    ...(phase === PHASE_DEVELOPMENT_SERVER ? {} : { output: "export" }),
    distDir: phase === PHASE_DEVELOPMENT_SERVER ? ".next-dev" : ".next",
    eslint: {
      ignoreDuringBuilds: true,
    },
    typescript: {
      ignoreBuildErrors: true,
    },
    experimental: {
      cpus: 1,
      webpackBuildWorker: false,
      workerThreads: true,
    },
    images: {
      unoptimized: true,
    },
  };

  const finalConfig = withPWA(config);
  hideFunctionProperties(finalConfig);

  return finalConfig;
}
