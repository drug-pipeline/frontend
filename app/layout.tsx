import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Script from "next/script";

// ✅ 클라이언트 전용 전환 래퍼만 불러와서 사용
import PageTransition from "./components/PageTransition";

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
    icon: "/favicon.svg",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <head>
        <Script src="/examples/ngl/ngl.js" strategy="beforeInteractive" />
        <Script src="/examples/js/lib/signals.min.js" strategy="beforeInteractive" />
        <Script src="/examples/js/lib/tether.min.js" strategy="beforeInteractive" />
        <Script src="/examples/js/lib/colorpicker.min.js" strategy="beforeInteractive" />
        <Script src="/examples/js/ui/ui.js" strategy="beforeInteractive" />
        <Script src="/examples/js/ui/ui.extra.js" strategy="beforeInteractive" />
        <Script src="/examples/js/ui/ui.ngl.js" strategy="beforeInteractive" />
      </head>
      <body className="bg-white text-zinc-900">
        {/* ✅ 여기만 전환 래퍼로 감싸기 */}
        <PageTransition>{children}</PageTransition>
      </body>
    </html>
  );
}
