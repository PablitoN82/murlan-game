import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
    metadataBase: new URL("https://murlan-game.pages.dev"),
    title: "Murlan Game",
    description: "Murlan online per quattro giocatori, a squadre, con amici o bot.",
    applicationName: "Murlan Game",
    manifest: "/manifest.webmanifest",
    icons: {
      icon: [
        { url: "/favicon.ico", sizes: "any" },
        { url: "/murlan-icon-32.png", type: "image/png", sizes: "32x32" },
        { url: "/murlan-icon-192.png", type: "image/png", sizes: "192x192" },
      ],
      apple: [{ url: "/murlan-apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    },
    appleWebApp: { capable: true, title: "Murlan Game", statusBarStyle: "black-translucent" },
    openGraph: {
      type: "website",
      title: "murlan-game.dev",
      description: "Murlan online con amici o bot, in quattro lingue.",
      images: [{ url: "/og.png", width: 1200, height: 630, alt: "Murlan" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "murlan-game.dev",
      description: "Murlan online con amici o bot, in quattro lingue.",
      images: ["/og.png"],
    },
};

export const viewport: Viewport = {
  themeColor: "#080b0c",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="it">
      <head>
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="icon" href="/murlan-icon-192.png" type="image/png" sizes="192x192" />
        <link rel="apple-touch-icon" href="/murlan-apple-touch-icon.png" sizes="180x180" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <script dangerouslySetInnerHTML={{ __html: `if('serviceWorker' in navigator){window.addEventListener('load',function(){navigator.serviceWorker.register('/sw.js',{scope:'/'}).then(function(r){r.update()}).catch(function(){})})}` }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
