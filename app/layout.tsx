import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import type { ReactNode } from "react";

import { Providers } from "@/app/providers";
import { ServiceWorker } from "@/components/shell/service-worker";
import { cn } from "@/lib/utils";

import "./globals.css";

// Self-hosted at build time by next/font – no runtime request to Google.
const sans = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });

export const metadata: Metadata = {
  title: { default: "PersoDash", template: "%s · PersoDash" },
  description: "Personal command center",
  applicationName: "PersoDash",
  appleWebApp: { capable: true, title: "PersoDash", statusBarStyle: "black-translucent" },
  robots: { index: false, follow: false },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0b0c0d" },
    { media: "(prefers-color-scheme: light)", color: "#f6f6f5" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={cn(sans.variable, mono.variable)}>
      <body>
        <Providers>{children}</Providers>
        <ServiceWorker />
      </body>
    </html>
  );
}
