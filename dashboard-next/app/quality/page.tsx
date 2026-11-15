"use client";

import { useEffect } from "react";
import { Essentials } from "@/components/console/essentials";
import { markGuideStep } from "@/lib/guide-progress";
import { PageHeader } from "@/components/console/page-header";
import { Section } from "@/components/console/section";
import { Skeleton } from "@/components/ui/skeleton";
import { UptimeChart } from "@/components/uptime-chart";
import { SlaCard } from "@/components/ui/sla-card";
import { useDashboard } from "@/components/dashboard-context";

export default function QualityPage() {
  const { active, sla, uptime, error, loading } = useDashboard();

  useEffect(() => {
    if (active && sla && uptime) markGuideStep("quality");
  }, [active, sla, uptime]);

  if (!active) {
    return (
      <PageHeader
        title="Enter your account name"
        description="Quality is the share of health checks that answered, scored against 99.5%."
      />
    );
  }

  if (loading) {
    return (
      <div className="grid gap-5">
        <Skeleton className="h-[92px] rounded-xl" />
        <Skeleton className="h-80 rounded-xl" />
        <Skeleton className="h-40 rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <Section title="Could not load quality">
        <p className="px-4 py-3 text-sm text-destructive">{error}</p>
      </Section>
    );
  }

  if (!sla || !uptime) return null;

  const apps = sla.apps;
  const average = apps.length
    ? `${(apps.reduce((sum, app) => sum + app.uptimePct, 0) / apps.length).toFixed(2)}%`
    : "—";
  const met = apps.filter((app) => app.meetsSla).length;
  const checks = apps.reduce((sum, app) => sum + app.checks, 0);
  const slowest = apps.length ? Math.max(...apps.map((app) => app.p95LatencyMs)) : null;
  const metrics = [
    { label: "Average uptime", value: average, detail: `Last ${sla.days} days` },
    { label: "SLA met", value: apps.length ? `${met} / ${apps.length}` : "—", detail: "Target 99.5%" },
    { label: "Checks", value: String(checks), detail: "Health requests" },
    { label: "Slowest p95", value: slowest === null ? "—" : `${Math.round(slowest)} ms`, detail: "Highest response time" },
  ];

  return (
    <div className="grid gap-5">
      <PageHeader title="Quality" description="Uptime against the 99.5% target." />
      <Section title="Reading this page">
        <p className="px-5 py-4 text-sm leading-6 text-muted-foreground">
          Uptime is the share of health checks that got a response. The target is 99.5%. Met means the app beat that
          target for the window; Missed means it fell short. Latency is how long each check took.
        </p>
      </Section>
      <Essentials items={metrics} />
      <UptimeChart uptime={uptime} />
      <SlaCard sla={sla} />
    </div>
  );
}
