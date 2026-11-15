import { spawn } from "node:child_process";

const proxy = spawn(process.execPath, ["scripts/dev-proxy.mjs"], { stdio: "inherit" });
const web = spawn("npx", ["next", "dev"], { stdio: "inherit" });

function stop() {
  proxy.kill("SIGTERM");
  web.kill("SIGTERM");
}

process.on("SIGINT", stop);
process.on("SIGTERM", stop);

proxy.on("exit", (code) => {
  if (code) {
    web.kill("SIGTERM");
    process.exit(code);
  }
});

web.on("exit", (code) => {
  proxy.kill("SIGTERM");
  process.exit(code ?? 0);
});
