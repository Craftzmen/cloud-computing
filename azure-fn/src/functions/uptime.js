const { app } = require("@azure/functions");
const { TableClient } = require("@azure/data-tables");
const { bucketUptime } = require("../uptimeBucket");

const health = TableClient.fromConnectionString(process.env.TABLES_CONN, "health");

app.http("uptime", {
  methods: ["GET"],
  authLevel: "function",
  handler: async (req) => {
    const userId = req.query.get("userId") || "";
    if (!/^[a-z0-9-]{1,40}$/.test(userId))
      return { status: 400, body: "userId required" };
    const days = Math.min(Number(req.query.get("days")) || 7, 30);
    const since = new Date(Date.now() - days * 864e5).toISOString();
    const filter = `PartitionKey eq '${userId}' and ts ge '${since}'`;

    const records = [];
    for await (const entity of health.listEntities({ queryOptions: { filter } })) {
      records.push({ app: entity.app, ts: entity.ts, up: entity.up });
    }

    const { apps, points } = bucketUptime(records);
    return { jsonBody: { userId, days, apps, points } };
  },
});
