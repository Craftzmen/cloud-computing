"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Essentials } from "@/components/console/essentials";
import { PageHeader } from "@/components/console/page-header";
import { Section } from "@/components/console/section";
import { StatusBadge } from "@/components/console/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { QuickActions } from "@/components/guide/quick-actions";
import { Button } from "@/components/ui/button";
import { useDashboard } from "@/components/dashboard-context";
import type { Invoice, SlaApp } from "@/lib/api";

function usd(value: number) {
  return `$${value.toFixed(4)}`;
}

function monthLabel(month: string) {
  const [year, index] = month.split("-").map(Number);
  if (!year || !index) return month;
  return new Date(year, index - 1, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

export default function OverviewPage() {
  const { active, sla, invoice, error, loading } = useDashboard();

  if (!active) {
    return (
      <div className="grid gap-5">
        <PageHeader
          title="Enter your account name"
          description="Type a name in the top bar and press Load."
        />
        <Section title="First time here?">
          <p className="px-5 pt-4 text-sm text-muted-foreground">
            The step-by-step checklist is on its own page in the sidebar under Start here.
          </p>
          <div className="px-5 pb-4">
            <Button size="sm" nativeButton={false} render={<Link href="/getting-started" />}>
              Open getting started
            </Button>
          </div>
        </Section>
      </div>
    );
  }

  return (
    <div className="grid gap-5">
      {loading && (
        <>
          <Skeleton className="h-[92px] rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
          <div className="grid gap-5 lg:grid-cols-2">
            <Skeleton className="h-56 rounded-xl" />
            <Skeleton className="h-56 rounded-xl" />
          </div>
        </>
      )}

      {error && (
        <Section title={`Could not load ${active}`}>
          <p className="px-4 py-3 text-sm text-destructive">{error}</p>
        </Section>
      )}

      {sla && invoice && <Overview slaApps={sla.apps} days={sla.days} invoice={invoice} />}
    </div>
  );
}

function Overview({ slaApps, days, invoice }: { slaApps: SlaApp[]; days: number; invoice: Invoice }) {
  const apps = [...slaApps].sort((a, b) => a.app.localeCompare(b.app));
  const avgUptime = apps.length
    ? `${(apps.reduce((sum, app) => sum + app.uptimePct, 0) / apps.length).toFixed(2)}%`
    : "—";
  const slaMet = apps.filter((app) => app.meetsSla).length;
  const costByApp = new Map(invoice.lineItems.map((item) => [item.app, item.cost.total]));
  const pods = invoice.lineItems.reduce((sum, item) => sum + item.cost.pods, 0);
  const cpu = invoice.lineItems.reduce((sum, item) => sum + item.cost.cpu, 0);
  const memory = invoice.lineItems.reduce((sum, item) => sum + item.cost.memory, 0);
  const metrics = [
    { label: "Apps", value: String(apps.length), detail: "With health checks" },
    { label: "Average uptime", value: avgUptime, detail: `Last ${days} days` },
    { label: "SLA met", value: apps.length ? `${slaMet} / ${apps.length}` : "—", detail: "Target 99.5%" },
    { label: "This month", value: usd(invoice.total), detail: monthLabel(invoice.month) },
  ];

  return (
    <>
      <PageHeader
        title="Overview"
        description="What is running, whether it stayed up, and what it cost."
      />
      <QuickActions />
      <Essentials items={metrics} />

      <div className="grid items-start gap-5">
        <Section
          title="Apps"
          description={`Health checks from the last ${days} days`}
          action={
            <Link href="/apps" className="inline-flex items-center gap-1 text-sm font-medium text-primary">
              Manage
              <ArrowRight className="size-3.5" />
            </Link>
          }
        >
          {apps.length === 0 ? (
            <div className="px-5 py-10">
              <p className="text-sm font-medium">Nothing has reported yet</p>
              <p className="mt-1 max-w-md text-sm text-muted-foreground">
                Deploy an image from Apps. The collector records the first health check within a minute.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="h-9 px-5 text-xs font-medium text-muted-foreground">App</TableHead>
                  <TableHead className="h-9 text-xs font-medium text-muted-foreground">Uptime</TableHead>
                  <TableHead className="h-9 text-xs font-medium text-muted-foreground">Latency</TableHead>
                  <TableHead className="h-9 text-right text-xs font-medium text-muted-foreground">This month</TableHead>
                  <TableHead className="h-9 px-5 text-right text-xs font-medium text-muted-foreground">SLA</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {apps.map((app) => (
                  <TableRow key={app.app}>
                    <TableCell className="px-5 py-3">
                      <Link href={`/apps/manage?name=${encodeURIComponent(app.app)}`} className="font-medium hover:underline">
                        {app.app}
                      </Link>
                      <p className="text-xs text-muted-foreground tabular-nums">{app.checks} checks</p>
                    </TableCell>
                    <TableCell className="py-3">
                      <p className="tabular-nums">{app.uptimePct.toFixed(2)}%</p>
                      <div className="mt-1.5 h-1 w-24 overflow-hidden rounded-full bg-foreground/10">
                        <div
                          className="h-full rounded-full bg-foreground"
                          style={{ width: `${Math.max(0, Math.min(100, app.uptimePct))}%` }}
                        />
                      </div>
                    </TableCell>
                    <TableCell className="py-3 text-muted-foreground tabular-nums">
                      {Math.round(app.avgLatencyMs)} ms avg
                      <span className="mt-0.5 block text-xs">{Math.round(app.p95LatencyMs)} ms p95</span>
                    </TableCell>
                    <TableCell className="py-3 text-right tabular-nums">{usd(costByApp.get(app.app) ?? 0)}</TableCell>
                    <TableCell className="px-5 py-3 text-right">
                      <StatusBadge tone={app.meetsSla ? "met" : "missed"} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Section>

        <Section
          title="Invoice"
          description={monthLabel(invoice.month)}
          action={
            <Link href="/billing" className="inline-flex items-center gap-1 text-sm font-medium text-primary">
              Open
              <ArrowRight className="size-3.5" />
            </Link>
          }
        >
          <div className="px-5 py-5">
            <p className="text-3xl font-semibold tracking-tight tabular-nums">{usd(invoice.total)}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {invoice.lineItems.length} {invoice.lineItems.length === 1 ? "app" : "apps"} on this bill
            </p>
            <dl className="mt-5 grid gap-2.5 text-sm">
              <CostRow label="Pods" detail="$0.01 / hour" value={usd(pods)} />
              <CostRow label="CPU" detail="$0.05 / hour" value={usd(cpu)} />
              <CostRow label="Memory" detail="$0.01 / GiB-hour" value={usd(memory)} />
            </dl>
          </div>
        </Section>
      </div>
    </>
  );
}

function CostRow({ label, detail, value }: { label: string; detail: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt>
        <span className="font-medium">{label}</span>
        <span className="ml-2 text-xs text-muted-foreground">{detail}</span>
      </dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}
