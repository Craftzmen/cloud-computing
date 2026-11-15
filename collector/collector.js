import { execFileSync } from "node:child_process";
import http from "node:http";

const URL = process.env.INGEST_URL;
if (!URL) {
  console.error("Set INGEST_URL first");
  process.exit(1);
}
const HEALTH_URL = URL.replace("ingestUsage", "ingestHealth");

const cpu = (s) =>
  s.endsWith("n") ? parseInt(s) / 1e6 :
  s.endsWith("u") ? parseInt(s) / 1e3 :
  s.endsWith("m") ? parseInt(s) : parseFloat(s) * 1000;

const mem = (s) => {
  const n = parseInt(s);
  if (s.endsWith("Ki")) return n / 1024;
  if (s.endsWith("Mi")) return n;
  if (s.endsWith("Gi")) return n * 1024;
  return n / 1048576;
};

function sample() {
  const raw = execFileSync(
    "kubectl",
    ["get", "--raw", "/apis/metrics.k8s.io/v1beta1/pods"],
    { encoding: "utf8", maxBuffer: 1e8 }
  );
  const apps = new Map();
  for (const p of JSON.parse(raw).items) {
    const ns = p.metadata.namespace;
    const app = p.metadata.labels?.app;
    if (!ns.startsWith("user-") || !app) continue;
    const key = `${ns}/${app}`;
    const e = apps.get(key) ?? {
      userId: ns.slice(5), app, cpuMillicores: 0, memoryMiB: 0, replicas: 0,
    };
    for (const c of p.containers) {
      e.cpuMillicores += cpu(c.usage.cpu);
      e.memoryMiB += mem(c.usage.memory);
    }
    e.replicas += 1;
    apps.set(key, e);
  }
  const ts = new Date().toISOString();
  return [...apps.values()].map((e) => ({
    ...e,
    cpuMillicores: Math.round(e.cpuMillicores),
    memoryMiB: Math.round(e.memoryMiB),
    ts,
  }));
}

function listApps() {
    const raw = execFileSync("kubectl", ["get", "deployments", "-A", "-o", "json"],
      { encoding: "utf8", maxBuffer: 1e8 });
    return JSON.parse(raw).items
      .filter((d) => d.metadata.namespace.startsWith("user-"))
      .map((d) => ({ userId: d.metadata.namespace.slice(5), app: d.metadata.name }));
  }
  
  function probe(host) {
    return new Promise((resolve) => {
      const t = Date.now();
      const req = http.request(
        { host: "localhost", port: 80, path: "/", method: "GET", headers: { Host: host }, timeout: 5000 },
        (res) => {
          res.resume();
          res.on("end", () =>
            resolve({ up: res.statusCode >= 200 && res.statusCode < 400, latencyMs: Date.now() - t }));
        }
      );
      req.on("timeout", () => { req.destroy(); resolve({ up: false, latencyMs: 5000 }); });
      req.on("error", () => resolve({ up: false, latencyMs: Date.now() - t }));
      req.end();
    });
  }
  
  const send = (url, body) =>
    fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  
  async function tick() {
    try {
      const ts = new Date().toISOString();
      const records = sample();
      if (records.length) {
        const res = await send(URL, records);
        console.log(ts, "usage", res.status, `${records.length} records`);
      }
      const checks = await Promise.all(
        listApps().map(async (a) => ({ ...a, ts, ...(await probe(`${a.app}-${a.userId}.localhost`)) }))
      );
      if (checks.length) {
        const res = await send(HEALTH_URL, checks);
        console.log(ts, "health", res.status, `${checks.length} checks`);
      }
    } catch (e) {
      console.error("tick failed:", e.message);
    }
  }
  
  tick();
  setInterval(tick, 60_000);