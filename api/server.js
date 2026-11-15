import express from "express";
import http from "node:http";
import { spawn } from "node:child_process";
import {
  createBuild,
  getBuild,
  listBuilds,
  validateRepo,
} from "./builds-store.js";

const app = express();
app.use(express.json());
app.use((req, res, next) => {
  const origin = req.headers.origin || "";
  const allowed =
    /^http:\/\/localhost:\d+$/.test(origin) ||
    origin === "https://victorious-desert-0a5b8ce0f.5.azurestaticapps.net";
  if (allowed) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Headers", "content-type");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,DELETE,OPTIONS");
  }
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

const valid = /^[a-z0-9]([-a-z0-9]{0,30}[a-z0-9])?$/;

function kubectlResult(args, input) {
  return new Promise((resolve) => {
    const p = spawn("kubectl", args);
    let out = "", err = "";
    p.stdout.on("data", (d) => (out += d));
    p.stderr.on("data", (d) => (err += d));
    p.on("close", (code) => resolve({ code, out, err }));
    if (input) p.stdin.write(input);
    p.stdin.end();
  });
}

function kubectl(args, input) {
  return kubectlResult(args, input).then((result) => {
    if (result.code === 0) return result.out;
    throw new Error(result.err || "kubectl failed");
  });
}

function manifests({ user, name, image, port, replicas }) {
  const ns = `user-${user}`;
  const labels = { app: name };
  return {
    apiVersion: "v1",
    kind: "List",
    items: [
      { apiVersion: "v1", kind: "Namespace", metadata: { name: ns } },
      {
        apiVersion: "apps/v1", kind: "Deployment",
        metadata: { name, namespace: ns },
        spec: {
          replicas,
          selector: { matchLabels: labels },
          template: {
            metadata: { labels },
            spec: {
              containers: [{
                name, image,
                ports: [{ containerPort: port }],
                resources: {
                  requests: { cpu: "50m", memory: "32Mi" },
                  limits: { cpu: "200m", memory: "128Mi" },
                },
              }],
            },
          },
        },
      },
      {
        apiVersion: "v1", kind: "Service",
        metadata: { name, namespace: ns },
        spec: { selector: labels, ports: [{ port: 80, targetPort: port }] },
      },
      {
        apiVersion: "networking.k8s.io/v1", kind: "Ingress",
        metadata: { name, namespace: ns },
        spec: {
          rules: [{
            host: `${name}-${user}.localhost`,
            http: { paths: [{
              path: "/", pathType: "Prefix",
              backend: { service: { name, port: { number: 80 } } },
            }] },
          }],
        },
      },
      {
        apiVersion: "autoscaling/v2", kind: "HorizontalPodAutoscaler",
        metadata: { name, namespace: ns },
        spec: {
          scaleTargetRef: { apiVersion: "apps/v1", kind: "Deployment", name },
          minReplicas: 1, maxReplicas: 6,
          behavior: {
            scaleUp: { stabilizationWindowSeconds: 0, policies: [{ type: "Pods", value: 6, periodSeconds: 15 }] },
            scaleDown: { stabilizationWindowSeconds: 0, policies: [{ type: "Pods", value: 6, periodSeconds: 15 }] },
          },
          metrics: [{ type: "Resource", resource: {
            name: "cpu", target: { type: "Utilization", averageUtilization: 50 },
          } }],
        },
      },
    ],
  };
}

app.get("/health", (_req, res) => res.json({ ok: true, builds: true }));

app.post("/apps", async (req, res) => {
  const { user, name, image, port = 80, replicas = 1 } = req.body;
  if (!valid.test(user || "") || !valid.test(name || "") || !image)
    return res.status(400).json({ error: "invalid user, name or image" });
  try {
    await kubectl(["apply", "-f", "-"],
      JSON.stringify(manifests({ user, name, image, port, replicas })));
    res.status(201).json({ url: `http://${name}-${user}.localhost` });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/apps/:user", async (req, res) => {
  try {
    const out = await kubectl(["get", "deployment", "-n", `user-${req.params.user}`, "-o", "json"]);
    const apps = JSON.parse(out).items.map((d) => ({
      name: d.metadata.name,
      image: d.spec.template.spec.containers[0].image,
      ready: d.status.readyReplicas || 0,
      desired: d.spec.replicas,
    }));
    res.json(apps);
  } catch (e) {
    if (String(e.message).includes("NotFound")) return res.json([]);
    res.status(500).json({ error: e.message });
  }
});

function namesOk(user, name) {
  return valid.test(user || "") && valid.test(name || "");
}

function probeIngressHost(host) {
  return new Promise((resolve) => {
    const started = Date.now();
    const req = http.request(
      { host: "127.0.0.1", port: 80, path: "/", method: "GET", headers: { Host: host }, timeout: 5000 },
      (res) => {
        const chunks = [];
        res.on("data", (chunk) => {
          if (chunks.length < 4) chunks.push(chunk);
        });
        res.on("end", () => {
          const body = Buffer.concat(chunks).toString("utf8");
          const ok =
            res.statusCode >= 200 &&
            res.statusCode < 400 &&
            !/no available server/i.test(body);
          resolve({ urlLive: ok, urlStatus: res.statusCode || 0, urlLatencyMs: Date.now() - started });
        });
      }
    );
    req.on("timeout", () => {
      req.destroy();
      resolve({ urlLive: false, urlStatus: 0, urlLatencyMs: Date.now() - started });
    });
    req.on("error", () => resolve({ urlLive: false, urlStatus: 0, urlLatencyMs: Date.now() - started }));
    req.end();
  });
}

const EXEC_ALLOW = new Set([
  "ls", "cat", "head", "tail", "pwd", "env", "printenv", "whoami", "id", "ps", "echo", "hostname",
]);

function parseExecCommand(raw) {
  if (typeof raw !== "string" || !raw.trim()) return null;
  if (raw.length > 500 || /[;&|`$<>]/.test(raw)) return null;
  const argv = raw.trim().split(/\s+/).slice(0, 32);
  if (!argv.length || !EXEC_ALLOW.has(argv[0])) return null;
  return argv;
}

async function firstRunningPod(ns, app) {
  const podList = JSON.parse(await kubectl(["get", "pods", "-n", ns, "-l", `app=${app}`, "-o", "json"]));
  return podList.items.find((pod) => pod.status.phase === "Running");
}

app.get("/apps/:user/:name/logs", async (req, res) => {
  const { user, name } = req.params;
  if (!namesOk(user, name)) return res.status(400).json({ error: "invalid user or name" });
  const tail = Math.min(Math.max(Number(req.query.tail) || 120, 1), 500);
  const result = await kubectlResult([
    "logs",
    "-n",
    `user-${user}`,
    "-l",
    `app=${name}`,
    `--tail=${tail}`,
    "--prefix",
  ]);
  if (result.code !== 0 && !result.out) {
    if (/not found|No resources|no pods/i.test(result.err)) return res.json({ logs: "" });
    return res.status(500).json({ error: result.err || "Could not read logs" });
  }
  res.json({ logs: result.out });
});

app.post("/apps/:user/:name/exec", async (req, res) => {
  const { user, name } = req.params;
  if (!namesOk(user, name)) return res.status(400).json({ error: "invalid user or name" });
  const argv = parseExecCommand(req.body?.command);
  if (!argv) {
    return res.status(400).json({
      error: `Enter one allowed command (${[...EXEC_ALLOW].sort().join(", ")}). No shell operators.`,
    });
  }
  const ns = `user-${user}`;
  try {
    const pod = await firstRunningPod(ns, name);
    if (!pod) return res.status(503).json({ error: "No running pod to run commands in." });
    const result = await kubectlResult(["exec", pod.metadata.name, "-n", ns, "-c", name, "--", ...argv]);
    const output = [result.out, result.err].filter(Boolean).join("\n").trim();
    res.json({ output: output || "(no output)", exitCode: result.code ?? 1 });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/apps/:user/:name", async (req, res) => {
  const { user, name } = req.params;
  if (!namesOk(user, name)) return res.status(400).json({ error: "invalid user or name" });
  const ns = `user-${user}`;
  try {
    const deployment = JSON.parse(await kubectl(["get", "deployment", name, "-n", ns, "-o", "json"]));
    const container = deployment.spec.template.spec.containers[0];
    let hpa = { min: deployment.spec.replicas || 1, max: 6, current: deployment.status.readyReplicas || 0 };
    try {
      const raw = JSON.parse(await kubectl(["get", "hpa", name, "-n", ns, "-o", "json"]));
      hpa = {
        min: raw.spec.minReplicas || 1,
        max: raw.spec.maxReplicas || 6,
        current: raw.status.currentReplicas || 0,
      };
    } catch { /* a deployment can exist without an autoscaler */ }

    const podList = JSON.parse(await kubectl(["get", "pods", "-n", ns, "-l", `app=${name}`, "-o", "json"]));
    const pods = podList.items.map((pod) => {
      const statuses = pod.status.containerStatuses || [];
      return {
        name: pod.metadata.name,
        phase: pod.status.phase,
        ready: statuses.filter((status) => status.ready).length,
        total: Math.max(statuses.length, 1),
        restarts: statuses.reduce((sum, status) => sum + (status.restartCount || 0), 0),
        started: pod.status.startTime || pod.metadata.creationTimestamp,
      };
    });

    const eventList = JSON.parse(await kubectl(["get", "events", "-n", ns, "-o", "json"]));
    const events = eventList.items
      .filter((event) => {
        const involved = event.involvedObject?.name || "";
        return involved === name || involved.startsWith(`${name}-`);
      })
      .sort((a, b) => String(b.lastTimestamp || b.eventTime || "").localeCompare(String(a.lastTimestamp || a.eventTime || "")))
      .slice(0, 8)
      .map((event) => ({
        type: event.type,
        reason: event.reason,
        message: event.message,
        at: event.lastTimestamp || event.eventTime || event.metadata.creationTimestamp,
      }));

    const host = `${name}-${user}.localhost`;
    const probe = await probeIngressHost(host);

    res.json({
      name,
      image: container.image,
      port: container.ports?.[0]?.containerPort || 80,
      ready: deployment.status.readyReplicas || 0,
      desired: deployment.spec.replicas || 0,
      url: `http://${host}`,
      urlLive: probe.urlLive,
      urlStatus: probe.urlStatus,
      limits: container.resources?.limits || { cpu: "200m", memory: "128Mi" },
      hpa,
      pods,
      events,
    });
  } catch (e) {
    if (String(e.message).includes("NotFound")) return res.status(404).json({ error: "App not found" });
    res.status(500).json({ error: e.message });
  }
});

app.post("/apps/:user/:name/scale", async (req, res) => {
  const { user, name } = req.params;
  const replicas = Number(req.body.replicas);
  if (!namesOk(user, name)) return res.status(400).json({ error: "invalid user or name" });
  if (!Number.isInteger(replicas) || replicas < 1 || replicas > 6)
    return res.status(400).json({ error: "replicas must be from 1 to 6" });
  const ns = `user-${user}`;
  try {
    await kubectl(["scale", "deployment", name, "-n", ns, `--replicas=${replicas}`]);
    await kubectl(["patch", "hpa", name, "-n", ns, "--type", "merge", "-p", JSON.stringify({
      spec: {
        minReplicas: replicas,
        behavior: {
          scaleUp: { stabilizationWindowSeconds: 0, policies: [{ type: "Pods", value: 6, periodSeconds: 15 }] },
          scaleDown: { stabilizationWindowSeconds: 0, policies: [{ type: "Pods", value: 6, periodSeconds: 15 }] },
        },
      },
    })]);
    res.json({ replicas });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/apps/:user/:name/restart", async (req, res) => {
  const { user, name } = req.params;
  if (!namesOk(user, name)) return res.status(400).json({ error: "invalid user or name" });
  try {
    await kubectl(["rollout", "restart", `deployment/${name}`, "-n", `user-${user}`]);
    res.json({ restarted: name });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete("/apps/:user/:name", async (req, res) => {
  try {
    await kubectl(["delete", "deployment,service,ingress,hpa", req.params.name,
      "-n", `user-${req.params.user}`]);
    res.json({ deleted: req.params.name });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/builds/:user", (req, res) => {
  if (!valid.test(req.params.user || "")) return res.status(400).json({ error: "invalid user" });
  res.json(listBuilds(req.params.user));
});

app.get("/builds/:user/:id", (req, res) => {
  if (!valid.test(req.params.user || "")) return res.status(400).json({ error: "invalid user" });
  const row = getBuild(req.params.user, req.params.id);
  if (!row) return res.status(404).json({ error: "build not found" });
  res.json(row);
});

app.post("/builds", (req, res) => {
  const { user, app, repo, branch, port, subdir } = req.body || {};
  try {
    if (!validateRepo(repo)) return res.status(400).json({ error: "Use a public https://github.com/owner/repo URL" });
    const row = createBuild({ user, app, repo, branch, port, subdir });
    res.status(201).json(row);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.listen(4000, () => console.log("control plane on :4000"));