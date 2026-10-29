import { SiteHeader } from "@/components/site-header";
import type { Metadata } from "next";
import { Cormorant_Garamond, Outfit } from "next/font/google";
import "./globals.css";

const display = Cormorant_Garamond({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const sans = Outfit({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Shagun — festive looks, rendered on you",
  description:
    "An Indian occasion-styling store. Pick Diwali, a sangeet, an office party or a wedding, set a rupee budget, and see the whole look on your selfie before you buy.",
};

export const dynamic = "force-dynamic";

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${sans.variable} h-full antialiased`}
    >
      <body className="paper-grid flex min-h-full flex-col">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <footer className="border-t border-gold/30 px-4 py-8 text-center text-xs text-ink/60">
          Shagun uses YouCam Clothes VTO, Earrings 2D VTO, Hairstyle transfer and
          Makeup VTO. MIT licence. Not affiliated with Perfect Corp.
        </footer>
      </body>
    </html>
  );
}
