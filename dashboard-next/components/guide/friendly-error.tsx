"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

const START_CMD = "cd api && node server.js";

export function FriendlyControlPlaneError({ message }: { message: string }) {
  const [copied, setCopied] = useState(false);
  const down = message.includes("control plane") || message.includes("not running");

  async function copy() {
    await navigator.clipboard.writeText(START_CMD);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!down) {
    return <p className="text-sm text-destructive">{message}</p>;
  }

  return (
    <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-5 py-4">
      <p className="text-sm font-medium">Apps cannot load right now</p>
      <p className="mt-1 text-sm text-muted-foreground">
        MiniPaaS needs the local apps service. Start it once, then reload this page.
      </p>
      <ol className="mt-3 list-decimal space-y-1 pl-4 text-sm text-muted-foreground">
        <li>Open a terminal in the project folder.</li>
        <li>
          Run: <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">{START_CMD}</code>
        </li>
        <li>Come back here and refresh.</li>
      </ol>
      <Button type="button" variant="outline" size="sm" className="mt-3" onClick={copy}>
        {copied ? "Copied" : "Copy command"}
      </Button>
    </div>
  );
}