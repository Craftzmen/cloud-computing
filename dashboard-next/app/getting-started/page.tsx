"use client";

import Link from "next/link";
import { PageHeader } from "@/components/console/page-header";
import { Section } from "@/components/console/section";
import { Button } from "@/components/ui/button";
import { GettingStartedChecklist } from "@/components/guide/getting-started";
import { WelcomeBanner } from "@/components/guide/welcome-banner";
import { useDashboard } from "@/components/dashboard-context";

export default function GettingStartedPage() {
  const { active } = useDashboard();

  return (
    <div className="grid gap-5">
      <PageHeader
        title="Getting started"
        description="Work through the checklist once. Overview shows live stats only."
      />
      <WelcomeBanner />
      {!active && (
        <Section title="Step 1 — Account name">
          <p className="px-5 py-4 text-sm text-muted-foreground">
            Type your account name in the top bar and press Load. It appears in URLs (for example hello-abdullah.localhost) and on your bill.
          </p>
        </Section>
      )}
      <GettingStartedChecklist />
      <Section title="Next">
        <div className="flex flex-wrap gap-2 px-5 py-4">
          <Button variant="outline" size="sm" nativeButton={false} render={<Link href="/how-it-works" />}>
            How MiniPaaS works
          </Button>
          <Button variant="outline" size="sm" nativeButton={false} render={<Link href="/apps/new?template=whoami" />}>
            Deploy demo app
          </Button>
          {active && (
            <Button size="sm" nativeButton={false} render={<Link href="/" />}>
              Overview
            </Button>
          )}
        </div>
      </Section>
    </div>
  );
}