"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLink, Plus } from "lucide-react";
import { Section } from "@/components/console/section";
import { Button } from "@/components/ui/button";
import { useDashboard } from "@/components/dashboard-context";
import { listApps } from "@/lib/control";
import { markGuideStep } from "@/lib/guide-progress";

export function QuickActions() {
  const { active, sla } = useDashboard();
  const [appName, setAppName] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!active) return;
    try {
      const apps = await listApps(active);
      if (apps.length) setAppName(apps[0].name);
      else if (sla?.apps[0]) setAppName(sla.apps[0].app);
    } catch {
      if (sla?.apps[0]) setAppName(sla.apps[0].app);
    }
  }, [active, sla]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  if (!active || !appName) return null;

  return (
    <Section title="Quick actions" description="Common next steps for your account.">
      <div className="flex flex-wrap gap-2 px-5 py-4">
        <Button size="sm" nativeButton={false} render={<Link href="/apps/new" />}>
          <Plus className="size-3.5" />
          New app
        </Button>
        <Button
          size="sm"
          variant="outline"
          nativeButton={false}
          render={<Link href={`/apps/manage?name=${encodeURIComponent(appName)}`} />}
        >
          Manage {appName}
        </Button>
        <Button
          size="sm"
          variant="outline"
          nativeButton={false}
          render={<a href={`http://${appName}-${active}.localhost`} target="_blank" rel="noreferrer" />}
          onClick={() => markGuideStep("opened")}
        >
          <ExternalLink className="size-3.5" />
          Open {appName}
        </Button>
        <Button
          size="sm"
          variant="outline"
          nativeButton={false}
          render={<Link href="/quality" />}
          onClick={() => markGuideStep("quality")}
        >
          Quality
        </Button>
        <Button
          size="sm"
          variant="outline"
          nativeButton={false}
          render={<Link href="/billing" />}
          onClick={() => markGuideStep("billing")}
        >
          Billing
        </Button>
      </div>
    </Section>
  );
}