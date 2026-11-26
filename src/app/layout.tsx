import type { Metadata, Viewport } from "next";
import Script from "next/script";
import NextTopLoader from "nextjs-toploader";
import { Toaster } from "@/components/ui/toaster";
import { themeBootScript } from "@/lib/theme";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "AlertBarangay", template: "%s | AlertBarangay" },
  description: "Report emergencies and coordinate barangay response.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#4A101E",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <Script
          id="theme-boot"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: themeBootScript }}
        />
      </head>
      <body>
        {/* Thin progress bar at the top of the page on every route change. */}
        <NextTopLoader color="#D4A843" height={3} showSpinner={false} shadow="0 0 10px #D4A843,0 0 5px #D4A843" />
        {children}
        <Toaster />
      </body>
    </html>
  );
}
