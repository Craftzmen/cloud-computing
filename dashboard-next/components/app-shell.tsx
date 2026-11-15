"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, Box, CreditCard, LayoutDashboard, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DashboardProvider, useDashboard } from "@/components/dashboard-context";
import { Logo } from "@/components/logo";
import { SystemStatus } from "@/components/guide/system-status";
import { ConsoleSidebar } from "@/components/console-sidebar";
import { cn } from "cn";

const nav = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/apps", label: "Apps", icon: Box },
  { href: "/quality", label: "Quality", icon: Activity },
  { href: "/billing", label: "Billing", icon: CreditCard },
];

function isCurrent(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLink({
  href,
  label,
  icon: Icon,
  pathname,
  compact,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  pathname: string;
  compact?: boolean;
}) {
  const active = isCurrent(pathname, href);
  if (compact) {
    return (
      <Link
        href={href}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm whitespace-nowrap",
          active ? "bg-primary/10 font-medium text-primary" : "text-muted-foreground"
        )}
      >
        <Icon className="size-4" />
        {label}
      </Link>
    );
  }
  return (
    <Link
      href={href}
      className={cn(
        "relative -mb-px inline-flex h-12 items-center gap-2 border-b-2 px-3 text-sm transition-colors",
        active
          ? "border-primary font-medium text-primary"
          : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
      )}
    >
      <Icon className="size-4 shrink-0" />
      {label}
    </Link>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { handle, setHandle, active, submit } = useDashboard();

  return (
    <div className="flex h-svh flex-col overflow-hidden bg-muted">
      <header className="z-30 w-full shrink-0 border-b bg-card">
        <div className="flex h-12 w-full items-center gap-4 px-4 md:px-6">
          <Link href="/" className="flex shrink-0 items-center gap-2.5">
            <Logo className="size-7" />
            <span className="text-sm font-semibold tracking-tight">MiniPaaS</span>
          </Link>
          <nav className="hidden items-end gap-1 lg:flex">{nav.map((item) => <NavLink key={item.href} {...item} pathname={pathname} />)}</nav>
          <SystemStatus />
          <div className="ml-auto flex shrink-0 items-center gap-2">
            <form onSubmit={submit} className="flex h-8 items-center rounded-md border bg-background pl-2.5" title="Used for URLs and billing">
              <span className="hidden text-xs font-medium text-muted-foreground sm:inline">Account</span>
              <span className="mx-2 hidden h-3.5 w-px bg-border sm:block" />
              <Input
                value={handle}
                onChange={(event) => setHandle(event.target.value)}
                placeholder="your-name"
                aria-label="Account name"
                className="h-6 w-24 border-0 bg-transparent px-0 text-sm shadow-none focus-visible:ring-0 md:w-28"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
              />
              <Button type="submit" size="sm" className="mr-0.5 h-6">
                Load
              </Button>
            </form>
            <span className="hidden text-xs text-muted-foreground xl:inline">
              {active ? `${active} · Local` : "Local cluster"}
            </span>
            <Button
              variant="ghost"
              size="sm"
              nativeButton={false}
              render={<a href="/.auth/logout" />}
              className="text-muted-foreground"
            >
              <LogOut className="size-3.5" />
              <span className="hidden sm:inline">Sign out</span>
            </Button>
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto border-t px-3 py-2 md:hidden">
          {nav.map((item) => (
            <NavLink key={item.href} {...item} pathname={pathname} compact />
          ))}
        </nav>
      </header>
      <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden">
        <Suspense
          fallback={<aside className="hidden h-full w-56 shrink-0 overflow-y-auto border-r bg-card md:block" aria-hidden />}
        >
          <ConsoleSidebar />
        </Suspense>
        <main className="mx-auto min-h-0 w-full max-w-7xl flex-1 overflow-y-auto px-4 py-6 md:px-6">{children}</main>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <DashboardProvider>
      <Shell>{children}</Shell>
    </DashboardProvider>
  );
}
