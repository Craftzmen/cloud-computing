import { Section } from "@/components/console/section";

const steps = [
  {
    title: "Deploy",
    body: "An image gets a localhost URL, its own namespace, CPU and memory limits, and scaling from 1 to 6 copies.",
  },
  {
    title: "Measure",
    body: "Every minute the collector stores CPU, memory, and whether the app answered.",
  },
  {
    title: "Judge",
    body: "Uptime is scored against 99.5%. The bill is pod time, CPU, and memory for the month.",
  },
];

export function HowItWorks() {
  return (
    <Section title="Three steps" description="From deploy to bill.">
      <ol>
        {steps.map((step, index) => (
          <li key={step.title} className="flex gap-3 border-b px-5 py-3.5 last:border-b-0">
            <span className="pt-0.5 font-mono text-[11px] text-muted-foreground">
              {String(index + 1).padStart(2, "0")}
            </span>
            <div>
              <p className="text-sm font-medium">{step.title}</p>
              <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{step.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </Section>
  );
}
