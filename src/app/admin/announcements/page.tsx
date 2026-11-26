import type { Metadata } from "next";
import { AnnouncementsDashboard } from "@/components/admin/announcements-dashboard";

export const metadata: Metadata = { title: "Announcements" };

export default function AdminAnnouncementsPage() {
  return <AnnouncementsDashboard />;
}
