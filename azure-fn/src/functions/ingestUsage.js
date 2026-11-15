const { app } = require("@azure/functions");
const { TableClient } = require("@azure/data-tables");

const table = TableClient.fromConnectionString(process.env.TABLES_CONN, "usage");

app.http("ingestUsage", {
  methods: ["POST"],
  authLevel: "function",
  handler: async (req) => {
    const records = await req.json();
    if (!Array.isArray(records) || records.length > 500)
      return { status: 400, body: "send an array of up to 500 records" };

    let stored = 0;
    for (const r of records) {
      if (!r.userId || !r.app || !r.ts) continue;
      await table.upsertEntity({
        partitionKey: r.userId,
        rowKey: `${r.app}_${r.ts}`,
        app: r.app,
        ts: r.ts,
        cpuMillicores: Number(r.cpuMillicores) || 0,
        memoryMiB: Number(r.memoryMiB) || 0,
        replicas: Number(r.replicas) || 0,
      });
      stored++;
    }
    return { status: 201, jsonBody: { stored } };
  },
});