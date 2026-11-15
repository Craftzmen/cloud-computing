export type SlaApp = {
    app: string;
    checks: number;
    uptimePct: number;
    avgLatencyMs: number;
    p95LatencyMs: number;
    target: number;
    meetsSla: boolean;
  };
  export type Sla = { userId: string; days: number; apps: SlaApp[] };
  
  export type LineItem = {
    app: string;
    samples: number;
    podHours: number;
    cpuHours: number;
    memGiBHours: number;
    cost: { pods: number; cpu: number; memory: number; total: number };
  };
  export type Invoice = {
    userId: string;
    month: string;
    currency: string;
    lineItems: LineItem[];
    total: number;
  };

  export type UptimePoint = { day: string } & Record<string, number | string>;
  export type Uptime = {
    userId: string;
    days: number;
    apps: string[];
    points: UptimePoint[];
  };

  const origin = process.env.NODE_ENV === "development" ? "http://localhost:4010" : "";

  async function get<T>(kind: "sla" | "invoice" | "uptime", userId: string): Promise<T> {
    let res: Response;
    try {
      res = await fetch(`${origin}/api/data/${kind}?userId=${encodeURIComponent(userId)}`);
    } catch {
      throw new Error("Cannot reach the data API. From dashboard-next, run npm run dev.");
    }
    if (!res.ok) throw new Error(`${kind} request failed (${res.status})`);
    return res.json();
  }

  export const getSla = (userId: string) => get<Sla>("sla", userId);
  export const getInvoice = (userId: string) => get<Invoice>("invoice", userId);
  export const getUptime = (userId: string) => get<Uptime>("uptime", userId);