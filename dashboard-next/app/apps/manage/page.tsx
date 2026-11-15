"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ExternalLink, RotateCw, Trash2 } from "lucide-react";
import { AppConsole, type AppConsoleHandle } from "@/components/console/app-console";
import { Essentials } from "@/components/console/essentials";
import { PageHeader } from "@/components/console/page-header";
import { Section } from "@/components/console/section";
import { StatusBadge } from "@/components/console/status-badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useDashboard } from "@/components/dashboard-context";
import { TryItLab } from "@/components/guide/try-it-lab";
import { markGuideStep } from "@/lib/guide-progress";
import { getApp, removeApp, restartApp, scaleApp, type AppDetail } from "@/lib/control";

function ago(iso: string) {
  const seconds = Math.max(0, (Date.now() - Date.parse(iso)) / 1000);
  if (!Number.isFinite(seconds)) return "—";
  if (seconds < 60) return `${Math.floor(seconds)}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export default function ManagePage() {
  return (
    <Suspense fallback={<Skeleton className="mx-auto h-80 max-w-6xl rounded-xl" />}>
      <ManageApp />
    </Suspense>
  );
}

function ManageApp() {
  const params = useSearchParams();
  const name = params.get("name") || "";
  const router = useRouter();
  const { active } = useDashboard();
  const [app, setApp] = useState<AppDetail | null>(null);
  const consoleRef = useRef<AppConsoleHandle>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");

  const load = useCallback(async (user: string, appName: string) => {
    try {
      const next = await getApp(user, appName);
      setApp(next);
      setError("");
    } catch (err) {
      setApp(null);
      setError(err instanceof Error ? err.message : "Could not load the app");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!active || !name) return;
    setLoading(true);
    load(active, name);
    const timer = setInterval(() => load(active, name), 8000);
    return () => clearInterval(timer);
  }, [active, name, load]);

  if (!active) {
    return (
      <PageHeader title="Enter your account name" description="Set your name in the top bar first." />
    );
  }

  if (!name) {
    return (
      <PageHeader
        title="Pick an app"
        description="Open one from the apps list."
        actions={
          <Button variant="outline" size="sm" nativeButton={false} render={<Link href="/apps" />}>
            Back to apps
          </Button>
        }
      />
    );
  }

  async function onScale(replicas: number) {
    setBusy("scale");
    try {
      await scaleApp(active, name, replicas);
      await load(active, name);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Scale failed");
    } finally {
      setBusy("");
    }
  }

  async function onRestart() {
    setBusy("restart");
    try {
      await restartApp(active, name);
      await load(active, name);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Restart failed");
    } finally {
      setBusy("");
    }
  }

  async function onRemove() {
    setBusy("remove");
    try {
      await removeApp(active, name);
      router.push("/apps");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Remove failed");
      setBusy("");
    }
  }

  const podsReady = Boolean(app && app.ready >= app.desired && app.desired > 0);
  const urlLive = app?.urlLive !== false;
  const healthy = podsReady && urlLive;

  return (
    <div className="grid gap-5">
      {loading && !app && <Skeleton className="h-40 rounded-lg" />}
      {error && !app && (
        <Section title={`Could not load ${name}`}>
          <p className="px-4 py-3 text-sm text-destructive">{error}</p>
        </Section>
      )}

      {app && (
        <>
          <PageHeader
            parent={{ href: "/apps", label: "Apps" }}
            title={app.name}
            description={app.image}
            actions={
              <>
                <StatusBadge tone={healthy ? "ready" : "starting"} />
                <Button
                  variant="outline"
                  size="sm"
                  nativeButton={false}
                  render={<a href={app.url} target="_blank" rel="noreferrer" />}
                  disabled={!urlLive}
                  onClick={() => markGuideStep("opened")}
                >
                  <ExternalLink className="size-3.5" />
                  {urlLive ? "Open" : "URL not ready"}
                </Button>
                <Button variant="outline" size="sm" disabled={Boolean(busy)} onClick={onRestart}>
                  <RotateCw className="size-3.5" />
                  {busy === "restart" ? "Restarting" : "Restart"}
                </Button>
                <Button variant="destructive" size="sm" disabled={Boolean(busy)} onClick={onRemove}>
                  <Trash2 className="size-3.5" />
                  Remove
                </Button>
              </>
            }
          />
          <ul className="grid gap-1 text-sm text-muted-foreground sm:grid-cols-3">
            <li>Your public link on this computer.</li>
            <li>Copies scale up when CPU stays high.</li>
            <li>Logs show what the app printed.</li>
          </ul>
          {podsReady && !urlLive && (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              The cluster reports your app is running, but the load balancer has not picked up the URL yet. Wait a few
              seconds — this page refreshes automatically — then open the link again.
            </p>
          )}
          <Essentials
            items={[
              {
                label: "URL",
                value: (
                  <a href={app.url} target="_blank" rel="noreferrer" className="text-base font-medium text-primary hover:underline">
                    {app.url}
                  </a>
                ),
              },
              { label: "Running", value: `${app.ready} of ${app.desired}`, detail: "copies" },
              { label: "Limits", value: app.limits.cpu || "200m", detail: `${app.limits.memory || "128Mi"} memory` },
              { label: "Minimum", value: String(app.hpa.min), detail: `up to ${app.hpa.max} at 50% CPU` },
            ]}
          />
          <TryItLab
            url={app.url}
            urlLive={urlLive}
            busy={Boolean(busy)}
            onOpen={() => markGuideStep("opened")}
            onScaleTwo={() => onScale(2)}
            onRefreshLogs={async () => {
              await consoleRef.current?.refreshLogs();
            }}
          />

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="grid items-start gap-5 lg:grid-cols-2">
            <Section
              title="Copies"
              description={`Minimum is ${app.hpa.min}. It can grow to ${app.hpa.max} when CPU stays above 50%.`}
            >
              <div className="flex gap-2 px-5 py-4">
                {[1, 2, 3, 4, 5, 6].map((count) => (
                  <button
                    key={count}
                    type="button"
                    disabled={Boolean(busy)}
                    onClick={() => onScale(count)}
                    className={
                      count === app.hpa.min
                        ? "grid size-9 place-items-center rounded-md bg-primary text-sm font-medium text-primary-foreground"
                        : "grid size-9 place-items-center rounded-md bg-muted text-sm font-medium hover:bg-accent"
                    }
                  >
                    {count}
                  </button>
                ))}
              </div>
            </Section>

            <Section title="Pods" description={`${app.pods.length} on this computer`}>
              {app.pods.length === 0 ? (
                <p className="px-5 py-8 text-sm text-muted-foreground">No pods yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="h-9 px-5 text-xs font-medium text-muted-foreground">Pod</TableHead>
                      <TableHead className="h-9 text-xs font-medium text-muted-foreground">Status</TableHead>
                      <TableHead className="h-9 px-5 text-right text-xs font-medium text-muted-foreground">Restarts</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {app.pods.map((pod) => (
                      <TableRow key={pod.name}>
                        <TableCell className="px-5 py-3">
                          <p className="max-w-56 truncate font-mono text-xs">{pod.name}</p>
                          <p className="text-xs text-muted-foreground">{ago(pod.started)}</p>
                        </TableCell>
                        <TableCell className="py-3 text-sm">{pod.phase}</TableCell>
                        <TableCell className="px-5 py-3 text-right tabular-nums">{pod.restarts}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Section>
          </div>

          <AppConsole ref={consoleRef} user={active} appName={name} enabled={podsReady} />

          <Section title="Events" description="What the cluster did for this app.">
            {app.events.length === 0 ? (
              <p className="px-5 py-8 text-sm text-muted-foreground">No recent events.</p>
            ) : (
              <ul>
                {app.events.map((event, index) => (
                  <li key={`${event.at}-${index}`} className="flex gap-4 border-b px-5 py-3 last:border-b-0">
                    <span className="w-16 shrink-0 pt-0.5 text-xs text-muted-foreground">{ago(event.at)}</span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium">
                        {event.reason}
                        {event.type === "Warning" && <span className="ml-2 text-xs font-normal text-destructive">Warning</span>}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{event.message}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </>
      )}
    </div>
  );
}
