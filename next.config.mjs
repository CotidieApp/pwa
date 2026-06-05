import { PHASE_DEVELOPMENT_SERVER } from "next/constants.js";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
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
