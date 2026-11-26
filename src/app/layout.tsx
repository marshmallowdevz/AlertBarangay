import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { cookies } from "next/headers";
import NextTopLoader from "nextjs-toploader";
import { Toaster } from "@/components/ui/toaster";
import { ServiceWorkerRegistration } from "@/components/ui/service-worker";
import { themeBootScript } from "@/lib/theme";
import { I18nProvider } from "@/lib/i18n/provider";
import { LANG_COOKIE, isLang } from "@/lib/i18n/messages";
import "./globals.css";
import "leaflet/dist/leaflet.css";

export const metadata: Metadata = {
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "AlertBarangay", statusBarStyle: "default" },
  title: { default: "AlertBarangay", template: "%s | AlertBarangay" },
  description: "Report emergencies and coordinate barangay response.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#4A101E",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const saved = (await cookies()).get(LANG_COOKIE)?.value;
  const lang = isLang(saved) ? saved : "en";
  return (
    <html lang={lang} suppressHydrationWarning>
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
        <I18nProvider initialLang={lang}>
          {children}
          <ServiceWorkerRegistration />
        </I18nProvider>
        <Toaster />
      </body>
    </html>
  );
}
