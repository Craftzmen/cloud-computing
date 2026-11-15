"use client";

import { CartesianGrid, Line, LineChart, ReferenceLine, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Section } from "@/components/console/section";
import type { Uptime } from "@/lib/api";

const COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

export function UptimeChart({ uptime }: { uptime: Uptime }) {
  const config = Object.fromEntries(
    uptime.apps.map((app, index) => [app, { label: app, color: COLORS[index % COLORS.length] }])
  ) satisfies ChartConfig;

  return (
    <Section
      title="Uptime"
      description="Share of health checks that answered, per day. The dashed line is the 99.5% target."
    >
      <div className="px-4 py-4">
        {uptime.points.length === 0 ? (
          <p className="py-8 text-sm text-muted-foreground">No health checks in this window.</p>
        ) : (
          <ChartContainer config={config} className="aspect-auto h-64 w-full">
            <LineChart data={uptime.points} margin={{ left: 8, right: 8, top: 8 }}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="day"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(day: string) => day.slice(5)}
              />
              <YAxis
                domain={[0, 100]}
                tickLine={false}
                axisLine={false}
                width={48}
                tickFormatter={(value: number) => `${value}%`}
              />
              <ReferenceLine y={99.5} stroke="var(--destructive)" strokeDasharray="4 4" />
              <ChartTooltip content={<ChartTooltipContent />} />
              <ChartLegend content={<ChartLegendContent />} />
              {uptime.apps.map((app) => (
                <Line
                  key={app}
                  type="monotone"
                  dataKey={app}
                  stroke={`var(--color-${app})`}
                  strokeWidth={2}
                  dot={uptime.points.length <= 3 ? { r: 3 } : false}
                  connectNulls={false}
                />
              ))}
            </LineChart>
          </ChartContainer>
        )}
      </div>
    </Section>
  );
}
