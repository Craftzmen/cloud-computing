export type RunningApp = {
  name: string;
  image: string;
  ready: number;
  desired: number;
};

export type AppPod = {
  name: string;
  phase: string;
  ready: number;
  total: number;
  restarts: number;
  started: string;
};

export type AppEvent = {
  type: string;
  reason: string;
  message: string;
  at: string;
};

export type AppDetail = {
  name: string;
  image: string;
  port: number;
  ready: number;
  desired: number;
  url: string;
  urlLive?: boolean;
  urlStatus?: number;
  limits: { cpu?: string; memory?: string };
  hpa: { min: number; max: number; current: number };
  pods: AppPod[];
  events: AppEvent[];
};

export type BuildRecord = {
  id: string;
  user: string;
  app: string;
  repo: string;
  branch: string;
  subdir?: string;
  port: number;
  status: "queued" | "building" | "succeeded" | "failed";
  image: string;
  url: string;
  log: string;
  logBlob: string;
  createdAt: string;
  updatedAt: string;
  startedAt: string;
  finishedAt: string;
};

const base = "http://localhost:4000";

export async function pingControlPlane(): Promise<boolean> {
  try {
    const res = await fetch(`${base}/health`, { cache: "no-store" });
    return res.ok;
  } catch {
    return false;
  }
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${base}${path}`, init);
  } catch {
    throw new Error("The control plane is not running. In the api folder, run node server.js.");
  }
  const contentType = res.headers.get("content-type") || "";
  const body = contentType.includes("application/json") ? await res.json().catch(() => ({})) : {};
  if (!res.ok) {
    if (res.status === 404 && path.startsWith("/builds")) {
      throw new Error(
        "Build API not found (404). Restart the control plane from the api folder so it loads the latest server.js."
      );
    }
    throw new Error(body.error || `Control plane request failed (${res.status})`);
  }
  return body as T;
}

export const listApps = (user: string) => call<RunningApp[]>(`/apps/${encodeURIComponent(user)}`);

export function deployApp(input: { user: string; name: string; image: string; port: number }) {
  return call<{ url: string }>("/apps", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ...input, replicas: 1 }),
  });
}

export const getApp = (user: string, name: string) =>
  call<AppDetail>(`/apps/${encodeURIComponent(user)}/${encodeURIComponent(name)}`);

export function getLogs(user: string, name: string, tail = 200) {
  const q = new URLSearchParams({ tail: String(tail) });
  return call<{ logs: string }>(
    `/apps/${encodeURIComponent(user)}/${encodeURIComponent(name)}/logs?${q}`
  );
}

export function execInApp(user: string, name: string, command: string) {
  return call<{ output: string; exitCode: number }>(
    `/apps/${encodeURIComponent(user)}/${encodeURIComponent(name)}/exec`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ command }),
    }
  );
}

export function scaleApp(user: string, name: string, replicas: number) {
  return call<{ replicas: number }>(`/apps/${encodeURIComponent(user)}/${encodeURIComponent(name)}/scale`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ replicas }),
  });
}

export function restartApp(user: string, name: string) {
  return call<{ restarted: string }>(`/apps/${encodeURIComponent(user)}/${encodeURIComponent(name)}/restart`, {
    method: "POST",
  });
}

export function removeApp(user: string, name: string) {
  return call<{ deleted: string }>(`/apps/${encodeURIComponent(user)}/${encodeURIComponent(name)}`, {
    method: "DELETE",
  });
}

export const listBuilds = (user: string) => call<BuildRecord[]>(`/builds/${encodeURIComponent(user)}`);

export const getBuild = (user: string, id: string) =>
  call<BuildRecord>(`/builds/${encodeURIComponent(user)}/${encodeURIComponent(id)}`);

export function startBuild(input: {
  user: string;
  app: string;
  repo: string;
  branch?: string;
  port?: number;
  subdir?: string;
}) {
  return call<BuildRecord>("/builds", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
}