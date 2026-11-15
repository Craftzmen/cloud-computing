import { cn } from "cn";

const tones = {
  ready: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  starting: "bg-amber-50 text-amber-800 ring-amber-200",
  met: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  missed: "bg-red-50 text-red-700 ring-red-200",
};

const dots = {
  ready: "bg-emerald-500",
  starting: "bg-amber-500",
  met: "bg-emerald-500",
  missed: "bg-red-500",
};

const labels = {
  ready: "Ready",
  starting: "Starting",
  met: "Met",
  missed: "Missed",
};

export function StatusBadge({ tone }: { tone: keyof typeof tones }) {
  return (
    <span className={cn("inline-flex h-5 items-center gap-1.5 rounded-full px-2 text-xs font-medium ring-1", tones[tone])}>
      <span className={cn("size-1.5 rounded-full", dots[tone])} />
      {labels[tone]}
    </span>
  );
}
