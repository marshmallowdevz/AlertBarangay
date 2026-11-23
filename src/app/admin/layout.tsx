import { AdminSidebar } from "@/components/admin/sidebar";

export default function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <div className="app-shell"><AdminSidebar email="Preview mode" /><main className="main-content">{children}</main></div>;
}
