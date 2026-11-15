"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Box, CloudUpload, ExternalLink, GitBranch, Loader2, Rocket, Terminal } from "lucide-react";
import { PageHeader } from "@/components/console/page-header";
import { Section } from "@/components/console/section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDashboard } from "@/components/dashboard-context";
import { getBuild, listBuilds, startBuild, type BuildRecord } from "@/lib/control";
import { cn } from "cn";

const pipelineSteps = [
  {
    title: "Clone",
    detail: "Build worker checks out the branch from your public GitHub repo.",
    icon: GitBranch,
  },
  {
    title: "Build & push",
    detail: "Docker builds the image and pushes to the local k3d registry.",
    icon: Box,
  },
  {
    title: "Deploy",
    detail: "Control plane applies the new image to your namespace on the cluster.",
    icon: Rocket,
  },
  {
    title: "Archive logs",
    detail: "Build output goes to Azure blob build-logs when storage is configured.",
    icon: CloudUpload,
  },
] as const;

const statusTone: Record<BuildRecord["status"], string> = {
  queued: "bg-zinc-100 text-zinc-700",
  building: "bg-amber-100 text-amber-900",
  succeeded: "bg-emerald-100 text-emerald-900",
  failed: "bg-red-100 text-red-800",
};

export default function BuildFromGitPage() {
  const { active } = useDashboard();
  const [app, setApp] = useState("gitapp");
  const [repo, setRepo] = useState("");
  const [branch, setBranch] = useState("main");
  const [port, setPort] = useState("80");
  const [subdir, setSubdir] = useState("samples/git-hello");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [builds, setBuilds] = useState<BuildRecord[]>([]);
  const [watchId, setWatchId] = useState("");
  const [watch, setWatch] = useState<BuildRecord | null>(null);
  const [loadError, setLoadError] = useState("");

  const refresh = useCallback(async () => {
    if (!active) return;
    try {
      setBuilds(await listBuilds(active));
      setLoadError("");
    } catch (err) {
      setBuilds([]);
      const message = err instanceof Error ? err.message : "Could not load builds";
      if (message.includes("404")) {
        setLoadError("Build API is not available. Restart the control plane: cd api && node server.js");
      } else {
        setLoadError(message);
      }
    }
  }, [active]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!active || !watchId) return;
    let cancel = false;
    const tick = async () => {
      try {
        const row = await getBuild(active, watchId);
        if (cancel) return;
        setWatch(row);
        if (row.status === "queued" || row.status === "building") {
          setTimeout(tick, 2500);
        } else {
          void refresh();
        }
      } catch {
        if (!cancel) setTimeout(tick, 4000);
      }
    };
    tick();
    return () => {
      cancel = true;
    };
  }, [active, refresh, watchId]);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!active) return;
    setError("");
    setBusy(true);
    try {
      const row = await startBuild({
        user: active,
        app: app.trim().toLowerCase(),
        repo: repo.trim(),
        branch: branch.trim() || "main",
        port: Number(port) || 80,
        subdir: subdir.trim(),
      });
      setWatchId(row.id);
      setWatch(row);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start build");
    } finally {
      setBusy(false);
    }
  }

  if (!active) {
    return (
      <PageHeader
        parent={{ href: "/apps", label: "Apps" }}
        title="Build from Git"
        description="Load your account in the top bar first."
      />
    );
  }

  return (
    <div className="grid gap-6">
      <PageHeader
        parent={{ href: "/apps", label: "Apps" }}
        title="Build from Git"
        description="CI-style deploy from a public repo. Run the build worker locally so queued jobs are picked up."
      />

      {loadError && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">{loadError}</p>
      )}

      <div className="grid items-start gap-5 lg:grid-cols-5">
        <form onSubmit={onSubmit} className="lg:col-span-3">
          <Section title="Repository" description="HTTPS GitHub URL and Docker build context.">
            <div className="grid gap-4 p-5">
              <Field label="App name">
                <Input value={app} onChange={(e) => setApp(e.target.value)} required />
              </Field>
              <Field label="Repo URL">
                <Input
                  value={repo}
                  onChange={(e) => setRepo(e.target.value)}
                  placeholder="https://github.com/owner/cloud-computing"
                  required
                />
              </Field>
              <Field label="Docker context" hint="Subfolder that contains the Dockerfile">
                <Input
                  value={subdir}
                  onChange={(e) => setSubdir(e.target.value)}
                  placeholder="samples/git-hello"
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Branch">
                  <Input value={branch} onChange={(e) => setBranch(e.target.value)} />
                </Field>
                <Field label="Port">
                  <Input value={port} onChange={(e) => setPort(e.target.value)} inputMode="numeric" />
                </Field>
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 border-t bg-muted/30 px-5 py-3">
              <p className="text-xs text-muted-foreground">
                Needs: control plane on :4000 and <code className="rounded bg-muted px-1 py-0.5">build-worker</code> running.
              </p>
              <div className="flex gap-2">
                <Button type="button" variant="outline" nativeButton={false} render={<Link href="/apps" />}>
                  Cancel
                </Button>
                <Button type="submit" disabled={busy}>
                  {busy ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Queuing…
                    </>
                  ) : (
                    <>
                      <GitBranch className="size-4" />
                      Start build
                    </>
                  )}
                </Button>
              </div>
            </div>
          </Section>
        </form>

        <Section title="Pipeline" description="Four steps after you click Start build." className="lg:col-span-2">
          <ul className="divide-y">
            {pipelineSteps.map((step, index) => (
              <li key={step.title} className="flex gap-3 px-5 py-4">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  {index + 1}
                </span>
                <div className="min-w-0 pt-0.5">
                  <p className="flex items-center gap-1.5 text-sm font-medium">
                    <step.icon className="size-3.5 text-muted-foreground" aria-hidden />
                    {step.title}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{step.detail}</p>
                </div>
              </li>
            ))}
          </ul>
        </Section>
      </div>

      {watch && (
        <Section
          title="Active build"
          description={watch.app}
          action={
            <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium capitalize", statusTone[watch.status])}>
              {watch.status}
            </span>
          }
        >
          <div className="flex flex-wrap gap-2 border-b px-5 py-3">
            {watch.url && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  nativeButton={false}
                  render={<a href={watch.url} target="_blank" rel="noreferrer" />}
                >
                  <ExternalLink className="size-3.5" />
                  Open app
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  nativeButton={false}
                  render={<Link href={`/apps/manage?name=${encodeURIComponent(watch.app)}`} />}
                >
                  Manage
                </Button>
              </>
            )}
          </div>
          <div className="overflow-hidden rounded-b-lg bg-[#0c0c0c]">
            <div className="flex items-center gap-2 border-b border-zinc-800 px-4 py-2 text-xs text-zinc-500">
              <Terminal className="size-3.5" />
              build log
            </div>
            <pre className="max-h-80 overflow-auto px-5 py-4 font-mono text-xs leading-relaxed text-zinc-100">
              {watch.log || "Waiting for worker output…"}
            </pre>
          </div>
        </Section>
      )}

      <Section title="Recent builds" description="Queued and completed jobs for your account.">
        {builds.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-muted-foreground">No builds yet — start one above.</p>
        ) : (
          <ul className="divide-y">
            {builds.map((row) => (
              <li key={row.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5 text-sm">
                <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium capitalize", statusTone[row.status])}>
                  {row.status}
                </span>
                <span className="font-medium">{row.app}</span>
                <span className="min-w-0 flex-1 truncate text-muted-foreground">{row.repo}</span>
                <span className="text-xs text-muted-foreground">{formatWhen(row.createdAt)}</span>
                <button
                  type="button"
                  className="text-xs font-medium text-primary hover:underline"
                  onClick={() => {
                    setWatchId(row.id);
                    setWatch(row);
                  }}
                >
                  View log
                </button>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-1.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </label>
  );
}

function formatWhen(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}