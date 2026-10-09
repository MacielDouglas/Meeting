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
  // .jwpub tem vários MB (as actions validam o máximo de 100 MB).
  experimental: {
    serverActions: {
      bodySizeLimit: "100MB",
    },
    // Barris react-icons/* viram imports por ícone: menos JS por rota.
    optimizePackageImports: ["react-icons"],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "same-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
    ];
  },
};

// Serwist exige webpack, que só usamos no build de produção (`next build --webpack`).
// No `next dev` (Turbopack) o wrapper é ignorado para não injetar config webpack.
export default process.env.NODE_ENV === "development" ? nextConfig : withSerwist(nextConfig);
