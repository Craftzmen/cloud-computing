import { Section } from "@/components/console/section";
import { StatusBadge } from "@/components/console/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Sla } from "@/lib/api";

export function SlaCard({ sla }: { sla: Sla }) {
  const apps = [...sla.apps].sort((a, b) => a.app.localeCompare(b.app));

  return (
    <Section
      title="Service quality"
      description={`Last ${sla.days} days. An app meets the SLA at ${apps[0]?.target ?? 99.5}% uptime.`}
    >
      {apps.length === 0 ? (
        <div className="px-5 py-10">
          <p className="text-sm font-medium">No health data yet</p>
          <p className="mt-1 text-sm text-muted-foreground">The collector records a check every minute after an app is deployed.</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="h-9 px-5 text-xs font-medium text-muted-foreground">App</TableHead>
              <TableHead className="h-9 text-right text-xs font-medium text-muted-foreground">Checks</TableHead>
              <TableHead className="h-9 text-right text-xs font-medium text-muted-foreground">Uptime</TableHead>
              <TableHead className="h-9 text-right text-xs font-medium text-muted-foreground">Average</TableHead>
              <TableHead className="h-9 text-right text-xs font-medium text-muted-foreground">p95</TableHead>
              <TableHead className="h-9 px-5 text-right text-xs font-medium text-muted-foreground">SLA</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {apps.map((app) => (
              <TableRow key={app.app}>
                <TableCell className="px-5 py-3 font-medium">{app.app}</TableCell>
                <TableCell className="py-3 text-right tabular-nums">{app.checks}</TableCell>
                <TableCell className="py-3 text-right tabular-nums">{app.uptimePct.toFixed(2)}%</TableCell>
                <TableCell className="py-3 text-right tabular-nums text-muted-foreground">{Math.round(app.avgLatencyMs)} ms</TableCell>
                <TableCell className="py-3 text-right tabular-nums text-muted-foreground">{Math.round(app.p95LatencyMs)} ms</TableCell>
                <TableCell className="px-5 py-3 text-right">
                  <StatusBadge tone={app.meetsSla ? "met" : "missed"} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Section>
  );
}
