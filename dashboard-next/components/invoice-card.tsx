import { Section } from "@/components/console/section";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Invoice } from "@/lib/api";

const usd = (n: number) => `$${n.toFixed(4)}`;
const hours = (n: number) => n.toFixed(2);

function monthLabel(month: string) {
  const [year, index] = month.split("-").map(Number);
  if (!year || !index) return month;
  return new Date(year, index - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export function InvoiceCard({ invoice }: { invoice: Invoice }) {
  const items = [...invoice.lineItems].sort((a, b) => a.app.localeCompare(b.app));
  const pods = items.reduce((sum, item) => sum + item.podHours, 0);
  const cpu = items.reduce((sum, item) => sum + item.cpuHours, 0);
  const memory = items.reduce((sum, item) => sum + item.memGiBHours, 0);

  return (
    <Section
      title="Invoice"
      description={`${monthLabel(invoice.month)}. Each sample is one minute of pod, CPU, and memory time.`}
    >
      {items.length === 0 ? (
        <div className="px-5 py-10">
          <p className="text-sm font-medium">No usage this month</p>
          <p className="mt-1 text-sm text-muted-foreground">A bill appears after the collector records the first sample.</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="h-9 px-5 text-xs font-medium text-muted-foreground">App</TableHead>
              <TableHead className="h-9 text-right text-xs font-medium text-muted-foreground">Pod-hours</TableHead>
              <TableHead className="h-9 text-right text-xs font-medium text-muted-foreground">CPU-hours</TableHead>
              <TableHead className="h-9 text-right text-xs font-medium text-muted-foreground">GiB-hours</TableHead>
              <TableHead className="h-9 px-5 text-right text-xs font-medium text-muted-foreground">Cost</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.app}>
                <TableCell className="px-5 py-3 font-medium">{item.app}</TableCell>
                <TableCell className="py-3 text-right tabular-nums">{hours(item.podHours)}</TableCell>
                <TableCell className="py-3 text-right tabular-nums">{hours(item.cpuHours)}</TableCell>
                <TableCell className="py-3 text-right tabular-nums">{hours(item.memGiBHours)}</TableCell>
                <TableCell className="px-5 py-3 text-right tabular-nums">{usd(item.cost.total)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter className="border-t bg-transparent">
            <TableRow className="hover:bg-transparent">
              <TableCell className="px-5 py-3 font-medium">Total</TableCell>
              <TableCell className="py-3 text-right font-medium tabular-nums">{hours(pods)}</TableCell>
              <TableCell className="py-3 text-right font-medium tabular-nums">{hours(cpu)}</TableCell>
              <TableCell className="py-3 text-right font-medium tabular-nums">{hours(memory)}</TableCell>
              <TableCell className="px-5 py-3 text-right font-semibold tabular-nums">{usd(invoice.total)}</TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      )}
    </Section>
  );
}
