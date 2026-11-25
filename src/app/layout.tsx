import type { Metadata, Viewport } from "next";
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
  return <html lang="en" suppressHydrationWarning>
    <head>
      {/* Applies the saved light/dark theme before first paint. */}
      <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
    </head>
    <body>{children}</body>
  </html>;
}
