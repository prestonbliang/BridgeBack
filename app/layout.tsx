import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./phase2.css";
import "./workspace.css";
export const metadata: Metadata = {
  title: "BridgeBack · Your path to housing",
  description: "A private, local-first housing preparation companion.",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon-192.png", apple: "/icon-192.png" },
  appleWebApp: {
    capable: true,
    title: "BridgeBack",
    statusBarStyle: "default",
  },
};
export const viewport: Viewport = {
  themeColor: "#133e3c",
  width: "device-width",
  initialScale: 1,
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
