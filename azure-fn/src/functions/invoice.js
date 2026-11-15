const { app } = require("@azure/functions");
const { TableClient } = require("@azure/data-tables");

const usage = TableClient.fromConnectionString(process.env.TABLES_CONN, "usage");
const invoices = TableClient.fromConnectionString(process.env.TABLES_CONN, "invoices");

const PRICING = { podHour: 0.01, cpuHour: 0.05, memGiBHour: 0.01 };
const SAMPLE_HOURS = 1 / 60;
const round = (n) => Math.round(n * 1e6) / 1e6;

app.http("invoice", {
  methods: ["GET"],
  authLevel: "function",
  handler: async (req) => {
    const userId = req.query.get("userId") || "";
    if (!/^[a-z0-9-]{1,40}$/.test(userId))
      return { status: 400, body: "userId required" };

    const now = new Date();
    const month =
      req.query.get("month") ||
      `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
    if (!/^\d{4}-\d{2}$/.test(month))
      return { status: 400, body: "month must look like 2026-11" };

    const [y, m] = month.split("-").map(Number);
    const next = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
    const filter = `PartitionKey eq '${userId}' and ts ge '${month}-01' and ts lt '${next}-01'`;

    const perApp = {};
    for await (const e of usage.listEntities({ queryOptions: { filter } })) {
      const a = (perApp[e.app] ??= { podHours: 0, cpuHours: 0, memGiBHours: 0, samples: 0 });
      a.podHours += e.replicas * SAMPLE_HOURS;
      a.cpuHours += (e.cpuMillicores / 1000) * SAMPLE_HOURS;
      a.memGiBHours += (e.memoryMiB / 1024) * SAMPLE_HOURS;
      a.samples += 1;
    }

    const lineItems = Object.entries(perApp).map(([name, a]) => {
      const cost = {
        pods: a.podHours * PRICING.podHour,
        cpu: a.cpuHours * PRICING.cpuHour,
        memory: a.memGiBHours * PRICING.memGiBHour,
      };
      return {
        app: name,
        samples: a.samples,
        podHours: round(a.podHours),
        cpuHours: round(a.cpuHours),
        memGiBHours: round(a.memGiBHours),
        cost: {
          pods: round(cost.pods),
          cpu: round(cost.cpu),
          memory: round(cost.memory),
          total: round(cost.pods + cost.cpu + cost.memory),
        },
      };
    });

    const total = round(lineItems.reduce((s, i) => s + i.cost.total, 0));
    const result = { userId, month, currency: "USD", pricing: PRICING, lineItems, total };

    await invoices.upsertEntity({
      partitionKey: userId,
      rowKey: month,
      total,
      generatedAt: new Date().toISOString(),
      details: JSON.stringify(result),
    });

    return { jsonBody: result };
  },
});