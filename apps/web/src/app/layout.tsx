import type { Metadata } from "next";
import "./globals.css";
import { LiveRegionProvider } from "@/components/accessibility/LiveRegion";
import { SkipLink } from "@/components/accessibility/SkipLink";

export const metadata: Metadata = {
  title: "GLIMPSE | JWST Transit Spectroscopy Explorer",
  description:
    "Getting Light IMprints from Planetary Spectral Emissions - Interactive visualization of James Webb Space Telescope exoplanet transit spectroscopy data",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <SkipLink targetId="main-content">Skip to main content</SkipLink>
        <SkipLink targetId="target-selector">Skip to target selector</SkipLink>
        <LiveRegionProvider>
          {children}
        </LiveRegionProvider>
      </body>
    </html>
  );
}
