"use client";

import { useEffect } from "react";
import { Essentials } from "@/components/console/essentials";
import { markGuideStep } from "@/lib/guide-progress";
import { PageHeader } from "@/components/console/page-header";
import { Section } from "@/components/console/section";
import { Skeleton } from "@/components/ui/skeleton";
import { CostChart } from "@/components/cost-chart";
import { InvoiceCard } from "@/components/invoice-card";
import { useDashboard } from "@/components/dashboard-context";

function usd(value: number) {
  return `$${value.toFixed(4)}`;
}

function monthLabel(month: string) {
  const [year, index] = month.split("-").map(Number);
  if (!year || !index) return month;
  return new Date(year, index - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export default function BillingPage() {
  const { active, invoice, error, loading } = useDashboard();

  useEffect(() => {
    if (active && invoice) markGuideStep("billing");
  }, [active, invoice]);

  if (!active) {
    return (
      <PageHeader
        title="Enter your account name"
        description="Billing is pod time, CPU, and memory for the month, priced from the samples the collector stored."
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
      <Section title="Could not load billing">
        <p className="px-4 py-3 text-sm text-destructive">{error}</p>
      </Section>
    );
  }

  if (!invoice) return null;

  const pods = invoice.lineItems.reduce((sum, item) => sum + item.cost.pods, 0);
  const cpu = invoice.lineItems.reduce((sum, item) => sum + item.cost.cpu, 0);
  const memory = invoice.lineItems.reduce((sum, item) => sum + item.cost.memory, 0);
  const metrics = [
    { label: "This month", value: usd(invoice.total), detail: monthLabel(invoice.month) },
    { label: "Pods", value: usd(pods), detail: "$0.01 / hour" },
    { label: "CPU", value: usd(cpu), detail: "$0.05 / hour" },
    { label: "Memory", value: usd(memory), detail: "$0.01 / GiB-hour" },
  ];

  return (
    <div className="grid gap-5">
      <PageHeader title="Billing" description="This month, split by app." />
      <Section title="Reading this page">
        <p className="px-5 py-4 text-sm leading-6 text-muted-foreground">
          The bill adds up time your apps ran: $0.01 per pod-hour, $0.05 per vCPU-hour, and $0.01 per GiB-hour of memory.
          Samples arrive about once a minute from the collector.
        </p>
      </Section>
      <Essentials items={metrics} />
      <CostChart invoice={invoice} />
      <InvoiceCard invoice={invoice} />
    </div>
  );
}
