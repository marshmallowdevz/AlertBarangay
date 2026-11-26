import { PageSkeleton } from "@/components/ui/page-skeleton";

export default function Loading() {
  return <div className="page-wrap"><PageSkeleton label="Loading…" cards={5} /></div>;
}
