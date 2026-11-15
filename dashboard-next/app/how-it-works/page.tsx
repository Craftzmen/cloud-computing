"use client";

import Link from "next/link";
import { PageHeader } from "@/components/console/page-header";
import { Section } from "@/components/console/section";
import { Button } from "@/components/ui/button";
import { HowItWorks } from "@/components/how-it-works";

export default function HowItWorksPage() {
  return (
    <div className="grid gap-5">
      <PageHeader
        title="How MiniPaaS works"
        description="Apps run on this computer. Usage, uptime, and billing are stored in Azure."
      />
      <HowItWorks />
      <Section title="Architecture">
        <dl className="divide-y text-sm">
          <Row term="Local cluster" detail="k3d runs your apps on this machine with limits and autoscaling." />
          <Row term="Collector" detail="Every minute it reads CPU, memory, and whether each app answered." />
          <Row term="Azure" detail="Tables hold usage, health checks, and invoices. The dashboard reads them through a proxy." />
          <Row term="SLA" detail="99.5% uptime target from health checks. Missed apps are flagged on Quality." />
          <Row term="Pricing" detail="$0.01 per pod-hour, $0.05 per vCPU-hour, $0.01 per GiB-hour of memory." />
        </dl>
      </Section>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" nativeButton={false} render={<Link href="/getting-started" />}>
          Getting started checklist
        </Button>
        <Button variant="outline" size="sm" nativeButton={false} render={<Link href="/" />}>
          Overview
        </Button>
      </div>
    </div>
  );
}

function Row({ term, detail }: { term: string; detail: string }) {
  return (
    <div className="px-5 py-3">
      <dt className="font-medium">{term}</dt>
      <dd className="mt-0.5 text-muted-foreground">{detail}</dd>
    </div>
  );
}