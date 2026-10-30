import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { ServiceWorkerRegister } from "@/components/service-worker-register";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

/**
 * Terapkan tema sebelum paint pertama (pola Next.js
 * "preventing-flash-before-hydration"): pilihan manual di localStorage
 * menang, selain itu ikut `prefers-color-scheme`.
 */
const SKRIP_TEMA = `(function(){try{var t=localStorage.getItem("sp-theme");var d=t==="dark"||(t!=="light"&&window.matchMedia("(prefers-color-scheme: dark)").matches);var r=document.documentElement;r.classList.toggle("dark",d);r.classList.toggle("light",!d);r.style.colorScheme=d?"dark":"light";}catch(e){}})();`;

export const metadata: Metadata = {
  title: {
    default: "SecurePatrol",
    template: "%s · SecurePatrol",
  },
  description:
    "Aplikasi absensi kehadiran dan patroli sekuriti berbasis QR & GPS.",
  applicationName: "SecurePatrol",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "SecurePatrol",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f3f5f8" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1220" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="id"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: SKRIP_TEMA }} />
      </head>
      <body className="min-h-dvh bg-background text-foreground">
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
