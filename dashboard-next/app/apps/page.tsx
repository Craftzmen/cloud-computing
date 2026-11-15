"use client";

import { AppsPanel } from "@/components/apps-panel";
import { useDashboard } from "@/components/dashboard-context";

export default function AppsPage() {
  const { active } = useDashboard();
  return (
    <div className="mx-auto max-w-6xl">
      <AppsPanel user={active} />
    </div>
  );
}
