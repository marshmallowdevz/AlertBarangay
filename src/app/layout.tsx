import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "User Management | AlertBarangay",
  description: "Manage AlertBarangay dashboard accounts.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><head>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/7.3.1/css/all.min.css" crossOrigin="anonymous" />
  </head><body>{children}</body></html>;
}
