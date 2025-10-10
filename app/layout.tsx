import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Script from "next/script";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Drug Discovery Pipeline",
  description: "Build, run, and visualize your drug-discovery workflows",
  icons: {
    icon: "/favicon.svg"
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <Script src="/examples/ngl/ngl.js" strategy="beforeInteractive" />
        <Script src="/examples/js/lib/signals.min.js" strategy="beforeInteractive" />
        <Script src="/examples/js/lib/tether.min.js" strategy="beforeInteractive" />
        <Script src="/examples/js/lib/colorpicker.min.js" strategy="beforeInteractive" />
        <Script src="/examples/js/ui/ui.js" strategy="beforeInteractive" />
        <Script src="/examples/js/ui/ui.extra.js" strategy="beforeInteractive" />
        <Script src="/examples/js/ui/ui.ngl.js" strategy="beforeInteractive" />
      </head>
      <body>{children}</body>
    </html>
  );
}