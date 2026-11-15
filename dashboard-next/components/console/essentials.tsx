import { cn } from "cn";

const borders = [
  "border-b sm:border-r xl:border-b-0",
  "border-b xl:border-r xl:border-b-0",
  "border-b sm:border-b-0 sm:border-r",
  "",
];

export function Essentials({
  items,
}: {
  items: { label: string; value: React.ReactNode; detail?: string }[];
}) {
  return (
    <section className="grid overflow-hidden rounded-lg border bg-card sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item, index) => (
        <div key={item.label} className={cn("flex min-w-0 flex-col", borders[index] ?? "")}>
          <p className="border-b bg-muted/50 px-4 py-2 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
            {item.label}
          </p>
          <div className="px-4 py-3">
            <div className="truncate text-xl font-semibold tracking-tight tabular-nums">{item.value}</div>
            {item.detail && <p className="mt-0.5 text-xs text-muted-foreground">{item.detail}</p>}
          </div>
        </div>
      ))}
    </section>
  );
}
