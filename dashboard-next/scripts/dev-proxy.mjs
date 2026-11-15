import http from "node:http";
import fs from "node:fs";

function loadEnv(path) {
  if (!fs.existsSync(path)) return;
  for (const line of fs.readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq);
    const value = trimmed.slice(eq + 1);
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnv(new URL("../.env.local", import.meta.url));

const host = (process.env.FN_HOST || "").replace(/^https?:\/\//, "").replace(/\/$/, "");
const key = process.env.FN_KEY || "";
const port = 4010;

if (!host || !key) {
  console.error("Missing FN_HOST or FN_KEY in dashboard-next/.env.local");
  process.exit(1);
}

const server = http.createServer(async (req, res) => {
  const origin = req.headers.origin;
  const headers = { "content-type": "application/json" };
  if (typeof origin === "string" && /^http:\/\/localhost:\d+$/.test(origin)) {
    headers["access-control-allow-origin"] = origin;
  }
  if (req.method === "OPTIONS") {
    headers["access-control-allow-methods"] = "GET";
    res.writeHead(204, headers);
    res.end();
    return;
  }

  const url = new URL(req.url || "/", "http://localhost");
  const match = url.pathname.match(/^\/api\/data\/(sla|invoice|uptime)$/);
  if (!match) {
    res.writeHead(404, headers);
    res.end(JSON.stringify({ error: "not found" }));
    return;
  }

  const userId = url.searchParams.get("userId") || "";
  if (!/^[a-z0-9-]{1,40}$/.test(userId)) {
    res.writeHead(400, headers);
    res.end(JSON.stringify({ error: "bad userId" }));
    return;
  }

  const days = url.searchParams.get("days") || "";
  const daysQuery = /^\d{1,2}$/.test(days) ? `&days=${days}` : "";
  const target = `https://${host}/api/${match[1]}?userId=${encodeURIComponent(userId)}${daysQuery}&code=${key}`;
  try {
    const upstream = await fetch(target);
    const body = await upstream.text();
    res.writeHead(upstream.status, headers);
    res.end(body);
  } catch {
    res.writeHead(502, headers);
    res.end(JSON.stringify({ error: "upstream failed" }));
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`data proxy on http://127.0.0.1:${port}`);
});
