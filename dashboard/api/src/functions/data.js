const { app } = require("@azure/functions");

app.http("data", {
  route: "data/{kind}",
  methods: ["GET"],
  authLevel: "anonymous",
  handler: async (req) => {
    const kind = req.params.kind;
    if (!["sla", "invoice", "uptime"].includes(kind)) return { status: 404 };
    const userId = req.query.get("userId") || "";
    if (!/^[a-z0-9-]{1,40}$/.test(userId)) return { status: 400, body: "bad userId" };
    const days = req.query.get("days") || "";
    const daysQuery = /^\d{1,2}$/.test(days) ? `&days=${days}` : "";
    const url = `https://${process.env.FN_HOST}/api/${kind}?userId=${encodeURIComponent(userId)}${daysQuery}&code=${process.env.FN_KEY}`;
    const r = await fetch(url);
    return { status: r.status, body: await r.text(), headers: { "content-type": "application/json" } };
  },
});