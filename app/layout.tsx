import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Rummy 500",
  description: "Rummy 500 scoring app",
  manifest: "/manifest.webmanifest",
  icons: { apple: "/apple-touch-icon.png", icon: "/icon-192.png" },
  appleWebApp: { capable: true, title: "Rummy 500", statusBarStyle: "black-translucent" }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#efe9dc"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
