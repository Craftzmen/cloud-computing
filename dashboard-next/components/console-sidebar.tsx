"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { BookOpen, ExternalLink, GitBranch, ListChecks, Plus, Rocket, Settings2 } from "lucide-react";
import { useDashboard } from "@/components/dashboard-context";
import { listApps } from "@/lib/control";
import { cn } from "cn";

const staticGroups = [
  {
    label: "Start here",
    items: [
      { href: "/getting-started", label: "Getting started", icon: ListChecks, match: "path" as const },
      { href: "/how-it-works", label: "How MiniPaaS works", icon: BookOpen, match: "path" as const },
    ],
  },
  {
    label: "Deploy",
    items: [
      { href: "/apps/new", label: "New app", icon: Plus, match: "new-app" as const },
      { href: "/apps/new?template=whoami", label: "Demo template", icon: Rocket, match: "demo" as const },
      { href: "/apps/build", label: "Build from Git", icon: GitBranch, match: "git-build" as const },
    ],
  },
];

function linkActive(
  pathname: string,
  search: string,
  item: { href: string; match: "new-app" | "demo" | "git-build" | "path" }
) {
  if (item.match === "path") return pathname === item.href;
  if (item.match === "new-app") return pathname === "/apps/new" && !search.includes("template=whoami");
  if (item.match === "demo") return pathname === "/apps/new" && search.includes("template=whoami");
  if (item.match === "git-build") return pathname === "/apps/build";
  return false;
}

function SidebarLink({
  href,
  label,
  icon: Icon,
  active,
  external,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  active: boolean;
  external?: boolean;
}) {
  const className = cn(
    "relative flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
    active ? "bg-primary/10 font-medium text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
  );

  if (external) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={className}>
        <Icon className="size-4 shrink-0" />
        {label}
        <ExternalLink className="ml-auto size-3 opacity-60" />
      </a>
    );
  }

  return (
    <Link href={href} className={className}>
      <span className={cn("absolute top-2 bottom-2 left-0 w-0.5 rounded-full", active ? "bg-primary" : "bg-transparent")} />
      <Icon className="size-4 shrink-0" />
      {label}
    </Link>
  );
}

function AppShortcuts({ account, pathname }: { account: string; pathname: string }) {
  const [apps, setApps] = useState<{ name: string; url: string }[]>([]);

  const refresh = useCallback(async () => {
    try {
      const rows = await listApps(account);
      setApps(rows.map((app) => ({ name: app.name, url: `http://${app.name}-${account}.localhost` })));
    } catch {
      setApps([]);
    }
  }, [account]);

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, 20_000);
    return () => clearInterval(timer);
  }, [refresh]);

  if (apps.length === 0) {
    return (
      <p className="px-3 py-1 text-xs leading-5 text-muted-foreground">
        Deploy an app to see manage and live-site shortcuts here.
      </p>
    );
  }

  return (
    <>
      {apps.map((app) => (
        <AppShortcutRow key={app.name} app={app} pathname={pathname} />
      ))}
    </>
  );
}

function AppShortcutRow({ app, pathname }: { app: { name: string; url: string }; pathname: string }) {
  const current = useSearchParams().get("name");
  const manageHref = `/apps/manage?name=${encodeURIComponent(app.name)}`;
  const onManage = pathname === "/apps/manage" && current === app.name;
  return (
    <div className="grid gap-0.5">
      <Link
        href={manageHref}
        className={cn(
          "relative flex items-center gap-2.5 rounded-md px-3 py-2 text-sm",
          onManage ? "bg-primary/10 font-medium text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
        )}
      >
        <Settings2 className="size-4 shrink-0" />
        Manage {app.name}
      </Link>
      <SidebarLink href={app.url} label={`Open ${app.name}`} icon={ExternalLink} active={false} external />
    </div>
  );
}

function ConsoleSidebarNav() {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const { active } = useDashboard();

  return (
    <aside className="hidden h-full w-56 shrink-0 flex-col overflow-hidden border-r bg-card md:flex">
      <nav className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-3">
        {staticGroups.map((group) => (
          <div key={group.label}>
            <p className="px-3 pb-1 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">{group.label}</p>
            <div className="grid gap-0.5">
              {group.items.map((item) => (
                <SidebarLink
                  key={item.href}
                  href={item.href}
                  label={item.label}
                  icon={item.icon}
                  active={linkActive(pathname, search, item)}
                />
              ))}
            </div>
          </div>
        ))}
        {active && (
          <div>
            <p className="px-3 pb-1 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">Your apps</p>
            <AppShortcuts account={active} pathname={pathname} />
          </div>
        )}
      </nav>
      <div className="mt-auto border-t p-3">
        <p className="px-3 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">Account</p>
        <p className="truncate px-3 pt-1 text-sm font-medium">{active || "Not loaded"}</p>
        <p className="px-3 text-xs text-muted-foreground">Used in URLs and billing</p>
      </div>
    </aside>
  );
}

export function ConsoleSidebar() {
  return <ConsoleSidebarNav />;
}