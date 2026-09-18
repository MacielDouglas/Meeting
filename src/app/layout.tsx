import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import type { ReactNode } from "react";
import { getCurrentUser } from "@/features/auth/application/session";
import { OnlineStatus } from "@/features/offline/OnlineStatus";
import { QueryProvider } from "@/features/offline/QueryProvider";
import { BottomNav } from "@/shared/components/BottomNav";
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

export default async function RootLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  return (
    <html lang="es" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full">
        <QueryProvider>
          <div className="app-shell flex flex-col gap-3 pb-20">
            <OnlineStatus />
            {children}
          </div>
          <BottomNav showSettings={user?.role === "owner"} />
        </QueryProvider>
      </body>
    </html>
  );
}
