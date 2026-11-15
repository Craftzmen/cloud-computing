"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Check, ChevronDown, ChevronUp, RotateCcw } from "lucide-react";
import { Section } from "@/components/console/section";
import { Button } from "@/components/ui/button";
import { useDashboard } from "@/components/dashboard-context";
import { listApps } from "@/lib/control";
import {
  dismissGuide,
  loadGuide,
  resetGuide,
  saveGuide,
  type GuideStep,
} from "@/lib/guide-progress";
import { cn } from "cn";

type StepDef = {
  id: GuideStep;
  title: string;
  hint: string;
  href?: string;
};

const steps: StepDef[] = [
  { id: "account", title: "Set your account name", hint: "Type a name in the top bar and press Load.", href: "/getting-started" },
  { id: "deploy", title: "Deploy an app", hint: "Use New app or the demo template.", href: "/apps/new?template=whoami" },
  { id: "opened", title: "Open your live URL", hint: "From the app page, click Open in your browser.", href: "/apps" },
  { id: "quality", title: "See uptime", hint: "Quality shows health checks and the 99.5% target.", href: "/quality" },
  { id: "billing", title: "See this month's bill", hint: "Billing splits cost by app.", href: "/billing" },
];

export function GettingStartedChecklist() {
  const { active, sla } = useDashboard();
  const [guide, setGuide] = useState(loadGuide);
  const [deployed, setDeployed] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const refreshDeployed = useCallback(async () => {
    if (!active) {
      setDeployed(false);
      return;
    }
    try {
      const apps = await listApps(active);
      setDeployed(apps.length > 0 || Boolean(sla?.apps.length));
    } catch {
      setDeployed(Boolean(sla?.apps.length));
    }
  }, [active, sla?.apps.length]);

  useEffect(() => {
    refreshDeployed();
  }, [refreshDeployed]);

  const done = useMemo(() => {
    const map: Record<GuideStep, boolean> = {
      account: Boolean(active) || Boolean(guide.manual.account),
      deploy: deployed || Boolean(guide.manual.deploy),
      opened: Boolean(guide.manual.opened),
      quality: Boolean(guide.manual.quality),
      billing: Boolean(guide.manual.billing),
    };
    return map;
  }, [active, deployed, guide.manual]);

  const completeCount = steps.filter((step) => done[step.id]).length;
  const allDone = completeCount === steps.length;

  useEffect(() => {
    if (allDone) setCollapsed(true);
  }, [allDone]);

  if (guide.dismissed && allDone) return null;

  function persist(next: ReturnType<typeof loadGuide>) {
    saveGuide(next);
    setGuide(next);
  }

  if (guide.dismissed && !allDone) {
    return (
      <div className="flex items-center justify-between rounded-lg border bg-card px-4 py-3 text-sm">
        <span className="text-muted-foreground">Getting started checklist hidden.</span>
        <Button type="button" variant="outline" size="sm" onClick={() => persist({ ...guide, dismissed: false })}>
          Show checklist
        </Button>
      </div>
    );
  }

  return (
    <Section
      title="Your progress"
      description={`${completeCount} of ${steps.length} done`}
      action={
        <div className="flex items-center gap-2">
          {allDone && (
            <span className="text-xs font-medium text-emerald-700">You are set for the demo</span>
          )}
          <Button type="button" variant="ghost" size="sm" onClick={() => setCollapsed((value) => !value)}>
            {collapsed ? <ChevronDown className="size-3.5" /> : <ChevronUp className="size-3.5" />}
            {collapsed ? "Expand" : "Collapse"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              resetGuide();
              setGuide({ dismissed: false, manual: {} });
            }}
          >
            <RotateCcw className="size-3.5" />
            Reset
          </Button>
          {!allDone && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                dismissGuide();
                setGuide(loadGuide());
              }}
            >
              Dismiss
            </Button>
          )}
        </div>
      }
    >
      {!collapsed && (
        <ol className="divide-y">
          {steps.map((step) => {
            const isDone = done[step.id];
            return (
              <li key={step.id} className="flex flex-wrap items-start justify-between gap-3 px-5 py-3">
                <div className="flex min-w-0 gap-3">
                  <span
                    className={cn(
                      "mt-0.5 grid size-5 shrink-0 place-items-center rounded-full text-xs",
                      isDone ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    )}
                  >
                    {isDone ? <Check className="size-3" /> : steps.indexOf(step) + 1}
                  </span>
                  <div>
                    <p className="text-sm font-medium">{step.title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{step.hint}</p>
                  </div>
                </div>
                {step.href && !isDone && (
                  <Button variant="outline" size="sm" nativeButton={false} render={<Link href={step.href} />}>
                    Go
                  </Button>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </Section>
  );
}