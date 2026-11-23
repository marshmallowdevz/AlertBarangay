import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "User Management | AlertBarangay",
  description: "Manage AlertBarangay dashboard accounts.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
