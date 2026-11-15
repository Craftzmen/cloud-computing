"use client";

import { useCallback, useEffect, useState } from "react";
import { pingControlPlane } from "@/lib/control";
import { useDashboard } from "@/components/dashboard-context";
import { cn } from "cn";

type Status = "ok" | "down" | "unknown";

const origin = process.env.NODE_ENV === "development" ? "http://localhost:4010" : "";

async function pingDataApi(userId: string): Promise<boolean> {
  if (!userId) return false;
  try {
    const res = await fetch(`${origin}/api/data/sla?userId=${encodeURIComponent(userId)}`, { cache: "no-store" });
    return res.ok;
  } catch {
    return false;
  }
}

function Pill({
  label,
  status,
  hint,
  compact,
}: {
  label: string;
  status: Status;
  hint: string;
  compact?: boolean;
}) {
  const color =
    status === "ok" ? "bg-emerald-50 text-emerald-800 ring-emerald-200" : status === "down" ? "bg-red-50 text-red-700 ring-red-200" : "bg-muted text-muted-foreground ring-border";
  const dot = status === "ok" ? "bg-emerald-500" : status === "down" ? "bg-red-500" : "bg-muted-foreground/40";

  return (
    <details className="group relative">
      <summary
        className={cn(
          "flex cursor-pointer list-none items-center gap-1.5 rounded-full px-2 py-1 text-xs font-medium ring-1 [&::-webkit-details-marker]:hidden",
          color
        )}
      >
        <span className={cn("size-1.5 rounded-full", dot)} />
        {!compact && label}
      </summary>
      <p className="absolute top-full right-0 z-30 mt-1 max-w-xs rounded-md border bg-card p-2 text-xs text-muted-foreground shadow-sm">{hint}</p>
    </details>
  );
}

export function SystemStatus({ compact }: { compact?: boolean }) {
  const { active } = useDashboard();
  const [appsApi, setAppsApi] = useState<Status>("unknown");
  const [dataApi, setDataApi] = useState<Status>("unknown");

  const refresh = useCallback(async () => {
    setAppsApi((await pingControlPlane()) ? "ok" : "down");
    if (active) setDataApi((await pingDataApi(active)) ? "ok" : "down");
    else setDataApi("unknown");
  }, [active]);

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, 20_000);
    return () => clearInterval(timer);
  }, [refresh]);

  return (
    <div className="hidden items-center gap-1.5 sm:flex">
      <Pill
        label="Apps API"
        status={appsApi}
        compact={compact}
        hint={
          appsApi === "ok"
            ? "The local deploy service is running."
            : "Start it: cd api && node server.js"
        }
      />
      <Pill
        label="Usage data"
        status={dataApi}
        compact={compact}
        hint={
          dataApi === "ok"
            ? "Billing and uptime data loaded."
            : active
              ? "From dashboard-next, run npm run dev (includes the data proxy)."
              : "Set your account name to load usage data."
        }
      />
    </div>
  );
}