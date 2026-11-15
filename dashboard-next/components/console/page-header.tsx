import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export function PageHeader({
  title,
  description,
  actions,
  parent,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  parent?: { href: string; label: string };
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-transparent pb-1">
      <div className="min-w-0">
        {parent && (
          <Link
            href={parent.href}
            className="mb-1.5 inline-flex items-center gap-0.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <ChevronLeft className="size-3.5 shrink-0" aria-hidden />
            {parent.label}
          </Link>
        )}
        <h1 className="text-lg font-semibold tracking-tight text-foreground">{title}</h1>
        {description && <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
