import { IBM_Plex_Mono, Instrument_Sans } from "next/font/google";

// One family for everything — heading and body both resolve to this (see globals.css's
// @theme inline remap of --font-heading to --font-sans). Matches the landing page's own
// Instrument Sans config exactly, so the whole app reads as one product.
export const fontSans = Instrument_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  display: "swap",
});

export const fontMono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

export const fontVariables = `${fontSans.variable} ${fontMono.variable}`;
