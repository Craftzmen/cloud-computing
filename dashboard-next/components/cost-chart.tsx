"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Section } from "@/components/console/section";
import type { Invoice } from "@/lib/api";

const chartConfig = {
  pods: { label: "Pods", color: "var(--chart-pods)" },
  cpu: { label: "CPU", color: "var(--chart-cpu)" },
  memory: { label: "Memory", color: "var(--chart-memory)" },
} satisfies ChartConfig;

const usd = (n: number) => `$${n.toFixed(4)}`;

function monthLabel(month: string) {
  const [year, index] = month.split("-").map(Number);
  if (!year || !index) return month;
  return new Date(year, index - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export function CostChart({ invoice }: { invoice: Invoice }) {
  const data = invoice.lineItems.map((item) => ({
    app: item.app,
    pods: item.cost.pods,
    cpu: item.cost.cpu,
    memory: item.cost.memory,
  }));

  return (
    <Section title="Cost per app" description={`${monthLabel(invoice.month)}. Pods, CPU, and memory stacked for each app.`}>
      <div className="px-4 py-4">
        {data.length === 0 ? (
          <p className="py-8 text-sm text-muted-foreground">No usage this month.</p>
        ) : (
          <ChartContainer config={chartConfig} className="aspect-auto h-[280px] w-full">
            <BarChart data={data} margin={{ left: 8, right: 8, top: 8 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="app" tickLine={false} axisLine={false} tickMargin={8} />
              <YAxis tickLine={false} axisLine={false} width={64} tickFormatter={(value: number) => usd(value)} />
              <ChartTooltip content={<ChartTooltipContent formatter={(value) => usd(Number(value))} />} />
              <ChartLegend content={<ChartLegendContent />} />
              <Bar dataKey="pods" stackId="cost" fill="var(--color-pods)" maxBarSize={48} isAnimationActive={false} radius={[0, 0, 4, 4]} />
              <Bar dataKey="cpu" stackId="cost" fill="var(--color-cpu)" maxBarSize={48} isAnimationActive={false} />
              <Bar dataKey="memory" stackId="cost" fill="var(--color-memory)" maxBarSize={48} isAnimationActive={false} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartContainer>
        )}
      </div>
    </Section>
  );
}
