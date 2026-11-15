"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
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
import { FriendlyControlPlaneError } from "@/components/guide/friendly-error";
import { listApps, type RunningApp } from "@/lib/control";

export function AppsPanel({ user }: { user: string }) {
  const router = useRouter();
  const [apps, setApps] = useState<RunningApp[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(Boolean(user));

  const refresh = useCallback(async (handle: string) => {
    try {
      const next = await listApps(handle);
      setApps(next);
      setError("");
    } catch (e) {
      setApps([]);
      setError(e instanceof Error ? e.message : "Could not reach the control plane");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    refresh(user);
  }, [user, refresh]);

  if (!user) {
    return (
      <PageHeader
        title="Enter your account name"
        description="Set your name in the top bar, then come back to deploy apps."
      />
    );
  }

  const count = apps.length === 1 ? "1 app" : `${apps.length} apps`;

  return (
    <div className="grid gap-5">
      <PageHeader
        title="Apps"
        description={`${count} for ${user}. Each one has its own URL on this computer.`}
        actions={
          <Button size="sm" nativeButton={false} render={<Link href="/apps/new" />}>
            <Plus className="size-3.5" />
            New app
          </Button>
        }
      />
      <Section title="Running">

      {error && (
        <div className="border-b px-5 py-3">
          <FriendlyControlPlaneError message={error} />
        </div>
      )}

      {loading ? (
        <div className="grid gap-3 px-5 py-4">
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
        </div>
      ) : apps.length === 0 && !error ? (
        <div className="px-5 py-10">
          <p className="text-sm font-medium">Nothing deployed yet</p>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">
            Start with the demo template. It deploys a small test site in one click.
          </p>
          <Button size="sm" className="mt-4" nativeButton={false} render={<Link href="/apps/new?template=whoami" />}>
            Deploy demo app
          </Button>
        </div>
      ) : (
        apps.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="h-9 px-5 text-xs font-medium text-muted-foreground">App</TableHead>
                <TableHead className="h-9 text-xs font-medium text-muted-foreground">Image</TableHead>
                <TableHead className="h-9 text-xs font-medium text-muted-foreground">Replicas</TableHead>
                <TableHead className="h-9 px-5 text-xs font-medium text-muted-foreground">Address</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {apps.map((app) => {
                const healthy = app.ready >= app.desired && app.desired > 0;
                return (
                  <TableRow
                    key={app.name}
                    className="cursor-pointer"
                    onClick={() => router.push(`/apps/manage?name=${encodeURIComponent(app.name)}`)}
                  >
                    <TableCell className="px-5 py-3">
                      <span className="mr-2 font-medium">{app.name}</span>
                      <StatusBadge tone={healthy ? "ready" : "starting"} />
                    </TableCell>
                    <TableCell className="max-w-56 truncate py-3 font-mono text-xs text-muted-foreground">
                      {app.image}
                    </TableCell>
                    <TableCell className="py-3 tabular-nums text-muted-foreground">
                      {app.ready}/{app.desired}
                    </TableCell>
                    <TableCell className="px-5 py-3 font-mono text-xs text-muted-foreground">
                      {app.name}-{user}.localhost
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )
      )}
      {apps.length > 0 && (
        <p className="border-t px-5 py-3 text-xs text-muted-foreground">Click a row to manage copies, logs, and restarts.</p>
      )}
      </Section>
    </div>
  );
}
