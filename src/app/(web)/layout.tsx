import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import { BRAND } from "@/lib/web/brand";
import "./web.css";

const display = Fraunces({
  variable: "--font-web-display",
  subsets: ["latin"],
});

const sans = Inter({
  variable: "--font-web-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: `${BRAND.name} — ${BRAND.tagline}`,
  description: BRAND.description,
};

export default function WebLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${display.variable} ${sans.variable} antialiased`}>
      <body>{children}</body>
    </html>
  );
}
