import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { BlobServiceClient } from "@azure/storage-blob";
import {
  claimNextBuild,
  patchBuild,
} from "../api/builds-store.js";

const __dir = path.dirname(fileURLToPath(import.meta.url));
const PUSH_REGISTRY = process.env.REGISTRY || "localhost:5001";
const PULL_PREFIX =
  process.env.REGISTRY_PULL ||
  (PUSH_REGISTRY.startsWith("localhost:")
    ? PUSH_REGISTRY.replace(/^localhost:/, "k3d-minipaas-registry.localhost:")
    : PUSH_REGISTRY);
const CONTROL_PLANE = process.env.CONTROL_PLANE || "http://localhost:4000";
const POLL_MS = Number(process.env.BUILD_POLL_MS) || 4000;
const BLOB_CONTAINER = process.env.BUILD_LOGS_CONTAINER || "build-logs";

function logLine(buildId, line) {
  console.log(`[${buildId.slice(0, 8)}] ${line}`);
}

function run(cmd, args, options = {}) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { ...options, env: { ...process.env, ...options.env } });
    let out = "";
    let err = "";
    child.stdout?.on("data", (chunk) => {
      out += chunk;
      if (options.onStdout) options.onStdout(String(chunk));
    });
    child.stderr?.on("data", (chunk) => {
      err += chunk;
      if (options.onStderr) options.onStderr(String(chunk));
    });
    child.on("close", (code) => resolve({ code: code ?? 1, out, err }));
  });
}

async function uploadLog(build, text) {
  const conn = process.env.AZURE_STORAGE_CONNECTION_STRING || process.env.BUILD_LOGS_CONN;
  if (!conn) return "";
  try {
    const blob = `${build.user}/${build.app}/${build.id}.log`;
    const client = BlobServiceClient.fromConnectionString(conn);
    const container = client.getContainerClient(BLOB_CONTAINER);
    await container.createIfNotExists();
    const block = container.getBlockBlobClient(blob);
    await block.upload(text, Buffer.byteLength(text), { blobHTTPHeaders: { blobContentType: "text/plain" } });
    return blob;
  } catch (e) {
    logLine(build.id, `blob upload skipped: ${e.message}`);
    return "";
  }
}

async function deploy(build, image) {
  const res = await fetch(`${CONTROL_PLANE}/apps`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      user: build.user,
      name: build.app,
      image,
      port: build.port,
      replicas: 1,
    }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `deploy failed (${res.status})`);
  return body.url;
}

async function runBuild(build) {
  const work = fs.mkdtempSync(path.join(os.tmpdir(), `minipaas-build-${build.id.slice(0, 8)}-`));
  let log = "";
  const append = (chunk) => {
    log += chunk;
    patchBuild(build.id, { log: log.slice(-120_000) });
  };

  try {
    append(`==> clone ${build.repo} @ ${build.branch}\n`);
    const clone = await run(
      "git",
      ["clone", "--depth", "1", "--branch", build.branch, build.repo, work],
      { onStdout: append, onStderr: append }
    );
    if (clone.code !== 0) throw new Error(clone.err || clone.out || "git clone failed");

    const tag = `${build.user}-${build.app}:${build.id.slice(0, 12)}`;
    const pushRef = `${PUSH_REGISTRY}/${tag}`;
    const clusterImage = `${PULL_PREFIX}/${tag}`;
    const ctx = build.subdir ? path.join(work, build.subdir) : work;
    append(`==> docker build ${pushRef} (context ${build.subdir || "."})\n`);
    const buildResult = await run(
      "docker",
      ["build", "-t", pushRef, ctx],
      { onStdout: append, onStderr: append }
    );
    if (buildResult.code !== 0) throw new Error("docker build failed");

    append(`==> docker push ${pushRef}\n`);
    const push = await run("docker", ["push", pushRef], { onStdout: append, onStderr: append });
    if (push.code !== 0) throw new Error("docker push failed");

    append(`==> deploy via control plane (${clusterImage})\n`);
    const url = await deploy(build, clusterImage);
    const logBlob = await uploadLog(build, log);
    patchBuild(build.id, {
      status: "succeeded",
      image: clusterImage,
      url,
      log,
      logBlob,
      finishedAt: new Date().toISOString(),
    });
    append(`==> done ${url}\n`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log += `\n==> failed: ${message}\n`;
    const logBlob = await uploadLog(build, log);
    patchBuild(build.id, {
      status: "failed",
      log,
      logBlob,
      finishedAt: new Date().toISOString(),
    });
  } finally {
    fs.rmSync(work, { recursive: true, force: true });
  }
}

async function tick() {
  const build = claimNextBuild();
  if (!build) return;
  logLine(build.id, `building ${build.user}/${build.app}`);
  await runBuild(build);
}

console.log(`build worker: push=${PUSH_REGISTRY} pull=${PULL_PREFIX} control=${CONTROL_PLANE}`);
setInterval(() => {
  tick().catch((err) => console.error("worker error", err));
}, POLL_MS);
tick().catch((err) => console.error("worker error", err));