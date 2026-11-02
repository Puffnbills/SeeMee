import { Outfit, Syne } from "next/font/google";
import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

const outfit = Outfit({ subsets: ["latin"], variable: "--font-body" });
const syne = Syne({ subsets: ["latin"], variable: "--font-display" });

export const metadata: Metadata = {
  title: { default: "SeeMee", template: "%s · SeeMee" },
  description: "A public, mobile-first livestreaming network.",
};

export const viewport: Viewport = {
  themeColor: "#09090d",
  width: "device-width",
  initialScale: 1,
};

export const dynamic = "force-dynamic";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className={`${outfit.variable} ${syne.variable}`}>{children}</body>
    </html>
  );
}
