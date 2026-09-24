import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import type { ReactNode } from "react";
import { Suspense } from "react";
import { OnlineStatus } from "@/features/offline/OnlineStatus";
import { QueryProvider } from "@/features/offline/QueryProvider";
import { BottomNavShell } from "@/shared/components/BottomNavShell";
import { SiteHeaderShell } from "@/shared/components/SiteHeaderShell";
import { es } from "@/shared/i18n/es";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  applicationName: es.appName,
  title: {
    default: `${es.appName} | ${es.appDescription}`,
    template: `%s | ${es.appName}`,
  },
  description: es.appDescription,
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: es.appName,
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "48x48", type: "image/x-icon" },
      { url: "/icons/icon.svg", type: "image/svg+xml" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0b",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="es"
      // O script de tema e extensões ajustam classes do <html> antes da hidratação;
      // React deve aceitar o atributo do cliente sem reclamar.
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        {/* Tema salvo antes da primeira pintura (evita flash claro/escuro). */}
        <Script src="/theme-init.js" strategy="beforeInteractive" />
        <QueryProvider>
          <div className="app-shell flex flex-col gap-6">
            <Suspense fallback={null}>
              <OnlineStatus />
            </Suspense>
            <SiteHeaderShell />
            {children}
          </div>
          <BottomNavShell />
        </QueryProvider>
      </body>
    </html>
  );
}
