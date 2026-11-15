"use client";

import { useRef } from "react";
import { ExternalLink, Layers2, RefreshCw } from "lucide-react";
import { Section } from "@/components/console/section";
import { Button } from "@/components/ui/button";
import { markGuideStep } from "@/lib/guide-progress";

export function TryItLab({
  url,
  urlLive = true,
  busy,
  onOpen,
  onScaleTwo,
  onRefreshLogs,
}: {
  url: string;
  urlLive?: boolean;
  busy: boolean;
  onOpen: () => void;
  onScaleTwo: () => void;
  onRefreshLogs: () => void;
}) {
  const logsRef = useRef<HTMLDivElement | null>(null);

  async function refreshLogs() {
    await onRefreshLogs();
    document.getElementById("app-console")?.scrollIntoView({ behavior: "smooth", block: "start" });
    logsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <>
      <Section title="Try it" description="Three safe actions to see how the platform behaves.">
        <div className="grid gap-3 px-5 py-4 sm:grid-cols-3">
          <div className="rounded-lg border p-3">
            <p className="text-sm font-medium">1. Open your app</p>
            <p className="mt-1 text-xs text-muted-foreground">Loads the live site in a new tab.</p>
            <Button
              type="button"
              size="sm"
              className="mt-3"
              disabled={!urlLive}
              nativeButton={false}
              render={<a href={url} target="_blank" rel="noreferrer" />}
              onClick={() => {
                markGuideStep("opened");
                onOpen();
              }}
            >
              <ExternalLink className="size-3.5" />
              {urlLive ? "Open" : "Wait for URL"}
            </Button>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-sm font-medium">2. Scale to 2 copies</p>
            <p className="mt-1 text-xs text-muted-foreground">Watch Pods fill in, then set back to 1.</p>
            <Button type="button" size="sm" variant="outline" className="mt-3" disabled={busy} onClick={onScaleTwo}>
              <Layers2 className="size-3.5" />
              Scale to 2
            </Button>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-sm font-medium">3. Refresh logs</p>
            <p className="mt-1 text-xs text-muted-foreground">Shows what the app printed last.</p>
            <Button type="button" size="sm" variant="outline" className="mt-3" onClick={refreshLogs}>
              <RefreshCw className="size-3.5" />
              Refresh logs
            </Button>
          </div>
        </div>
      </Section>
      <div ref={logsRef} aria-hidden className="h-0" />
    </>
  );
}