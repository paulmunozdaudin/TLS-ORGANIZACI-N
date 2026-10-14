import type { Metadata, Viewport } from "next";
import { Albert_Sans } from "next/font/google";
import { BRAND, SITE_URL } from "@/config/site";
import { hero } from "@/content/landing";
import RevealObserver from "@/components/RevealObserver";
import "./globals.css";

const albert = Albert_Sans({
  variable: "--font-albert",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const title = `${BRAND}: ${hero.title.join(" ").replace(/\.$/, "")}`;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: title, template: `%s · ${BRAND}` },
  description: hero.lead,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "es_ES",
    siteName: BRAND,
    title,
    description: hero.lead,
    url: "/",
  },
  twitter: { card: "summary_large_image", title, description: hero.lead },
};

export const viewport: Viewport = {
  themeColor: "#f7f5ef",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={albert.variable} suppressHydrationWarning>
      <body>
        {/* Activa las animaciones solo si hay JavaScript: sin él, todo se ve. */}
        <script
          dangerouslySetInnerHTML={{
            __html: "document.documentElement.classList.add('js')",
          }}
        />
        {children}
        <RevealObserver />
      </body>
    </html>
  );
}
