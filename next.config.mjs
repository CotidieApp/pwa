import { PHASE_DEVELOPMENT_SERVER } from "next/constants.js";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
});

export default function nextConfig(phase) {
  const config = {
    ...(phase === PHASE_DEVELOPMENT_SERVER ? {} : { output: "export" }),
    images: {
      unoptimized: true,
    },
  };
  
  return withPWA(config);
}
