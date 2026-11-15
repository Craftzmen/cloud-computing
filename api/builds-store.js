import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";

const __dir = path.dirname(fileURLToPath(import.meta.url));
const storePath = process.env.BUILD_STORE || path.join(__dir, "data", "builds.json");

function ensureStore() {
  const dir = path.dirname(storePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(storePath)) fs.writeFileSync(storePath, "[]\n", "utf8");
}

function readAll() {
  ensureStore();
  return JSON.parse(fs.readFileSync(storePath, "utf8"));
}

function writeAll(rows) {
  ensureStore();
  const tmp = `${storePath}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify(rows, null, 2)}\n`, "utf8");
  fs.renameSync(tmp, storePath);
}

const repoPattern = /^https:\/\/github\.com\/[\w.-]+\/[\w.-]+(\.git)?$/;
const validUser = (v) => /^[a-z0-9]([-a-z0-9]{0,30}[a-z0-9])?$/.test(v || "");
const validApp = validUser;

export function validateRepo(url) {
  return repoPattern.test((url || "").trim());
}

export function createBuild({ user, app, repo, branch = "main", port = 80, subdir = "" }) {
  if (!validUser(user) || !validApp(app)) throw new Error("invalid user or app name");
  if (!validateRepo(repo)) throw new Error("Use a public https://github.com/owner/repo URL");
  const rows = readAll();
  const now = new Date().toISOString();
  const row = {
    id: randomUUID(),
    user,
    app,
    repo: repo.trim(),
    branch: branch.trim() || "main",
    subdir: (subdir || "").trim().replace(/^\/+|\/+$/g, ""),
    port: Number(port) || 80,
    status: "queued",
    image: "",
    url: "",
    log: "",
    logBlob: "",
    createdAt: now,
    updatedAt: now,
    startedAt: "",
    finishedAt: "",
  };
  rows.unshift(row);
  writeAll(rows.slice(0, 200));
  return row;
}

export function listBuilds(user) {
  return readAll().filter((row) => row.user === user);
}

export function getBuild(user, id) {
  return readAll().find((row) => row.user === user && row.id === id) || null;
}

export function claimNextBuild() {
  const rows = readAll();
  const index = rows.findIndex((row) => row.status === "queued");
  if (index < 0) return null;
  rows[index] = {
    ...rows[index],
    status: "building",
    startedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  writeAll(rows);
  return rows[index];
}

export function patchBuild(id, patch) {
  const rows = readAll();
  const index = rows.findIndex((row) => row.id === id);
  if (index < 0) return null;
  rows[index] = {
    ...rows[index],
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  writeAll(rows);
  return rows[index];
}