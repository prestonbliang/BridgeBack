import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./phase2.css";
import "./workspace.css";
import "./guide.css";
import "./mobile.css";
import "./official.css";
export const metadata: Metadata = {
  title: "BridgeBack · Your path to housing",
  description:
    "Understand housing paperwork, keep track of documents, and see what to do next.",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon-192.png", apple: "/icon-192.png" },
  appleWebApp: {
    capable: true,
    title: "BridgeBack",
    statusBarStyle: "default",
  },
};
export const viewport: Viewport = {
  themeColor: "#172f43",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link
          rel="preload"
          href="/fonts/AtkinsonHyperlegible-Regular.ttf"
          as="font"
          type="font/ttf"
          crossOrigin="anonymous"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
