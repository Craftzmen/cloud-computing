const { app } = require("@azure/functions");
const { TableClient } = require("@azure/data-tables");

const health = TableClient.fromConnectionString(process.env.TABLES_CONN, "health");
const TARGET = 99.5;

app.http("sla", {
  methods: ["GET"],
  authLevel: "function",
  handler: async (req) => {
    const userId = req.query.get("userId") || "";
    if (!/^[a-z0-9-]{1,40}$/.test(userId))
      return { status: 400, body: "userId required" };
    const days = Math.min(Number(req.query.get("days")) || 7, 30);
    const since = new Date(Date.now() - days * 864e5).toISOString();
    const filter = `PartitionKey eq '${userId}' and ts ge '${since}'`;

    const perApp = {};
    for await (const e of health.listEntities({ queryOptions: { filter } })) {
      const a = (perApp[e.app] ??= { checks: 0, up: 0, lat: [] });
      a.checks++;
      if (e.up) { a.up++; a.lat.push(e.latencyMs); }
    }

    const apps = Object.entries(perApp).map(([name, a]) => {
      const lat = a.lat.sort((x, y) => x - y);
      const uptimePct = Math.round((a.up / a.checks) * 10000) / 100;
      return {
        app: name,
        checks: a.checks,
        uptimePct,
        avgLatencyMs: lat.length ? Math.round(lat.reduce((s, x) => s + x, 0) / lat.length) : 0,
        p95LatencyMs: lat.length ? lat[Math.floor(lat.length * 0.95)] ?? lat[lat.length - 1] : 0,
        target: TARGET,
        meetsSla: uptimePct >= TARGET,
      };
    });
    return { jsonBody: { userId, days, apps } };
  },
});