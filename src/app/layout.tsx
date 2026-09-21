import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
    icon: "/favicon.ico",
    apple: "/icons/icon.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#171717",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full">
        {/* Aplica o tema salvo antes da primeira pintura (evita flash claro/escuro). */}
        <script src="/theme-init.js" />
        <QueryProvider>
          <div className="app-shell flex flex-col gap-3 pb-20">
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
