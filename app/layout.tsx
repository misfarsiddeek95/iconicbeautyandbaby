import type { Metadata, Viewport } from "next";
import Script from "next/script";
import ChromeBefore from "@/components/chrome/ChromeBefore";
import ChromeAfter from "@/components/chrome/ChromeAfter";
import ChatGreeting from "@/components/chrome/ChatGreeting";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: "Iconic Beauty & Baby | Cosmetics & Baby Care Sri Lanka",
  description:
    "Shop skin care, hair care, makeup, fragrance and baby essentials at Iconic Beauty & Baby in Colombo 02. 798 products, 129 brands, delivery across Sri Lanka.",
  manifest: "/site.webmanifest",
  icons: {
    icon: [
      { url: "/assets/img/app-icon.svg", type: "image/svg+xml" },
      { url: "/assets/img/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/assets/img/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#064027",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&family=Jost:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <link rel="preload" as="image" href="/assets/img/jar-sage.svg" fetchPriority="high" />
        <link rel="stylesheet" href="/assets/css/app.min.css" />
        <link rel="stylesheet" href="/assets/css/pages.css?v=3" />
      </head>
      <body>
        <ChromeBefore />
        {children}
        <ChromeAfter />
        <ChatGreeting />
        <Script
          id="iconic-catalog"
          src="/assets/js/catalog.min.js?v=1"
          strategy="beforeInteractive"
        />
        <Script id="iconic-app" src="/assets/js/app.min.js?v=13" strategy="afterInteractive" />
        <Script
          id="iconic-tracking-config"
          src="/assets/js/tracking-config.js?v=1"
          strategy="afterInteractive"
        />
        <Script id="iconic-tracking" src="/assets/js/tracking.js?v=1" strategy="afterInteractive" />
      </body>
    </html>
  );
}
