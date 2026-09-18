import { randomUUID } from "node:crypto";
import withSerwistInit from "@serwist/next";
import type { NextConfig } from "next";

const revision = randomUUID();

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
  additionalPrecacheEntries: [{ url: "/~offline", revision }],
});

const nextConfig: NextConfig = {
  reactCompiler: true,
  // .jwpub tem vários MB (a action valida o máximo de 200 MB).
  experimental: {
    serverActions: {
      bodySizeLimit: "200MB",
    },
  },
};

// Serwist exige webpack, que só usamos no build de produção (`next build --webpack`).
// No `next dev` (Turbopack) o wrapper é ignorado para não injetar config webpack.
export default process.env.NODE_ENV === "development" ? nextConfig : withSerwist(nextConfig);
