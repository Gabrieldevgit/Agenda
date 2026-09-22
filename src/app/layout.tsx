import type { Metadata } from "next";
import { FAVICON_SVG_DATA_URI } from "@/lib/icons";
import { AppProviders } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tempo",
  description: "Calendar for people who actually keep it up to date.",
  icons: { icon: FAVICON_SVG_DATA_URI }, // SVG favicon — no emoji glyph
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body><AppProviders>{children}</AppProviders></body>
    </html>
  );
}
