import type { Metadata } from "next";
import { MaintenanceSettings } from "@/components/admin/maintenance-settings";

export const metadata: Metadata = { title: "Maintenance mode" };

export default function MaintenanceSettingsPage() {
  return <MaintenanceSettings />;
}
