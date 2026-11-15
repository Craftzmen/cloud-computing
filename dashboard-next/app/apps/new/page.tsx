"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { PageHeader } from "@/components/console/page-header";
import { Section } from "@/components/console/section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDashboard } from "@/components/dashboard-context";
import { deployApp } from "@/lib/control";
import { markGuideStep } from "@/lib/guide-progress";
import { cn } from "cn";

const validName = /^[a-z0-9]([-a-z0-9]{0,30}[a-z0-9])?$/;

const templates = [
  { id: "whoami", label: "Demo (recommended)", name: "hello", image: "traefik/whoami", port: "80" },
  { id: "web", label: "Web server", name: "web", image: "nginx:alpine", port: "80" },
] as const;

export default function NewAppPage() {
  return (
    <Suspense fallback={<PageHeader title="New app" description="Loading form…" />}>
      <NewAppForm />
    </Suspense>
  );
}

function NewAppForm() {
  const params = useSearchParams();
  const { active } = useDashboard();
  const [name, setName] = useState("");
  const [image, setImage] = useState("traefik/whoami");
  const [port, setPort] = useState("80");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [url, setUrl] = useState("");
  const [template, setTemplate] = useState<string>("whoami");

  useEffect(() => {
    const key = params.get("template") || "whoami";
    const preset = templates.find((item) => item.id === key) ?? templates[0];
    setTemplate(preset.id);
    setName(preset.name);
    setImage(preset.image);
    setPort(preset.port);
  }, [params]);

  if (!active) {
    return (
      <PageHeader
        title="Enter your account name"
        description="Deploy apps under the name in the top bar."
      />
    );
  }

  const appName = name.trim().toLowerCase();
  const nameOk = validName.test(appName);
  const address = nameOk ? `http://${appName}-${active}.localhost` : `http://name-${active}.localhost`;

  function applyTemplate(id: (typeof templates)[number]["id"]) {
    const preset = templates.find((item) => item.id === id);
    if (!preset) return;
    setTemplate(id);
    setName(preset.name);
    setImage(preset.image);
    setPort(preset.port);
  }

  async function onDeploy(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    if (!nameOk) {
      setError("Use a lowercase name, like hello. Letters, numbers, and hyphens only.");
      return;
    }
    const portNumber = Number(port);
    if (!Number.isInteger(portNumber) || portNumber < 1 || portNumber > 65535) {
      setError("Port must be a number from 1 to 65535.");
      return;
    }
    setBusy(true);
    try {
      const result = await deployApp({ user: active, name: appName, image: image.trim(), port: portNumber });
      setUrl(result.url);
      markGuideStep("deploy");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Deploy failed");
    } finally {
      setBusy(false);
    }
  }

  if (url) {
    return (
      <Section title={`${appName} is running`} description="It has its own URL on this computer." className="max-w-xl">
        <div className="px-5 py-5">
          <p className="text-xs text-muted-foreground">URL</p>
          <a href={url} target="_blank" rel="noreferrer" className="mt-1 block text-sm font-medium text-primary hover:underline">
            {url}
          </a>
        </div>
        <div className="flex flex-wrap justify-end gap-2 border-t px-5 py-4">
          <Button variant="outline" nativeButton={false} render={<Link href="/apps" />}>
            Back to apps
          </Button>
          <Button
            nativeButton={false}
            render={<Link href={`/apps/manage?name=${encodeURIComponent(appName)}`} />}
          >
            Continue tour
          </Button>
          <Button
            nativeButton={false}
            render={<a href={url} target="_blank" rel="noreferrer" />}
            onClick={() => markGuideStep("opened")}
          >
            <ExternalLink className="size-3.5" />
            Open
          </Button>
        </div>
      </Section>
    );
  }

  return (
    <div className="grid gap-5">
      <PageHeader
        parent={{ href: "/apps", label: "Apps" }}
        title="New app"
        description="Pick a template or type your own image. Port 80 is fine for most demos."
      />
      <div className="grid items-start gap-5 lg:grid-cols-5">
        <form onSubmit={onDeploy} className="lg:col-span-3">
          <Section title="Deploy" description="The cluster creates a namespace, limits, and scaling from 1 to 6 copies.">
            <div className="flex flex-wrap gap-2 border-b px-4 py-3">
              {templates.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => applyTemplate(item.id)}
                  className={cn(
                    "rounded-md border px-3 py-1.5 text-xs font-medium",
                    template === item.id ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <div className="grid gap-4 px-4 py-4">
              <label className="grid gap-1.5 text-xs font-medium text-muted-foreground">
                Name
                <Input
                  value={name}
                  onChange={(event) => setName(event.target.value.toLowerCase())}
                  placeholder="hello"
                  required
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                />
              </label>
              <label className="grid gap-1.5 text-xs font-medium text-muted-foreground">
                Docker image
                <Input value={image} onChange={(event) => setImage(event.target.value)} required />
              </label>
              <label className="grid max-w-32 gap-1.5 text-xs font-medium text-muted-foreground">
                Port
                <Input value={port} onChange={(event) => setPort(event.target.value)} inputMode="numeric" required />
              </label>
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
            <div className="flex justify-end gap-2 border-t px-4 py-3">
              <Button variant="outline" nativeButton={false} render={<Link href="/apps" />}>
                Cancel
              </Button>
              <Button type="submit" disabled={busy}>
                {busy ? "Deploying" : "Deploy"}
              </Button>
            </div>
          </Section>
        </form>

        <Section title="What you get" description={`Created for ${active} when you deploy.`} className="lg:col-span-2">
          <dl className="divide-y">
            <Preview label="URL" value={address} muted={!nameOk} />
            <Preview label="Namespace" value={`user-${active}`} />
            <Preview label="Scaling" value="1 copy, up to 6 at 50% CPU" />
            <Preview label="Limits" value="200m CPU, 128Mi memory" />
          </dl>
        </Section>
      </div>
    </div>
  );
}

function Preview({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="px-5 py-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={muted ? "mt-0.5 truncate text-sm text-muted-foreground" : "mt-0.5 truncate text-sm"}>{value}</dd>
    </div>
  );
}