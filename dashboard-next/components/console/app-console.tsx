"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { Section } from "@/components/console/section";
import { execInApp, getLogs } from "@/lib/control";
import { cn } from "cn";

const HELP_TEXT = `Allowed commands (one line, no pipes): ls, cat, head, tail, pwd, env, printenv,
whoami, id, ps, echo, hostname`;

type RunLine = { kind: "cmd" | "out" | "sys"; text: string; exitCode?: number };

export type AppConsoleHandle = { refreshLogs: () => Promise<void> };

export const AppConsole = forwardRef<
  AppConsoleHandle,
  { user: string; appName: string; enabled: boolean }
>(function AppConsole({ user, appName, enabled }, ref) {
  const prompt = `${user}@${appName}:~$`;
  const [tab, setTab] = useState<"shell" | "logs">("shell");
  const [logs, setLogs] = useState("");
  const [follow, setFollow] = useState(false);
  const [line, setLine] = useState("");
  const [history, setHistory] = useState<RunLine[]>([
    { kind: "sys", text: "MiniPaaS container shell — type a command and press Enter. Type help for the list." },
  ]);
  const [busy, setBusy] = useState(false);
  const [logError, setLogError] = useState("");
  const cmdHistory = useRef<string[]>([]);
  const historyPos = useRef(-1);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollBottom = useCallback(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, []);

  const focusInput = useCallback(() => {
    requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  const refreshLogs = useCallback(async () => {
    if (!enabled) return;
    try {
      const next = await getLogs(user, appName, 200);
      setLogs(next.logs.trim());
      setLogError("");
    } catch (err) {
      setLogError(err instanceof Error ? err.message : "Could not read logs");
    }
  }, [appName, enabled, user]);

  useImperativeHandle(ref, () => ({ refreshLogs }), [refreshLogs]);

  useEffect(() => {
    if (!enabled) return;
    refreshLogs();
  }, [enabled, refreshLogs]);

  useEffect(() => {
    if (!follow || !enabled || tab !== "logs") return;
    const timer = setInterval(refreshLogs, 3000);
    return () => clearInterval(timer);
  }, [enabled, follow, refreshLogs, tab]);

  useEffect(() => {
    scrollBottom();
  }, [history, logs, scrollBottom, tab]);

  useEffect(() => {
    if (tab === "shell" && enabled && !busy) focusInput();
  }, [busy, enabled, focusInput, tab]);

  async function runCommand(raw: string) {
    const command = raw.trim();
    if (!command || !enabled || busy) return;
    setHistory((prev) => [...prev, { kind: "cmd", text: command }]);
    cmdHistory.current = [command, ...cmdHistory.current.filter((c) => c !== command)].slice(0, 50);
    historyPos.current = -1;
    setLine("");

    if (command === "help" || command === "?") {
      setHistory((prev) => [...prev, { kind: "out", text: HELP_TEXT, exitCode: 0 }]);
      focusInput();
      return;
    }
    if (command === "clear") {
      setHistory([{ kind: "sys", text: "— screen cleared —" }]);
      focusInput();
      return;
    }

    setBusy(true);
    try {
      const result = await execInApp(user, appName, command);
      setHistory((prev) => [...prev, { kind: "out", text: result.output, exitCode: result.exitCode }]);
    } catch (err) {
      setHistory((prev) => [
        ...prev,
        { kind: "out", text: err instanceof Error ? err.message : "Command failed", exitCode: 1 },
      ]);
    } finally {
      setBusy(false);
    }
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowUp") {
      event.preventDefault();
      const next = historyPos.current + 1;
      if (next < cmdHistory.current.length) {
        historyPos.current = next;
        setLine(cmdHistory.current[next]);
      }
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      if (historyPos.current > 0) {
        historyPos.current -= 1;
        setLine(cmdHistory.current[historyPos.current]);
      } else {
        historyPos.current = -1;
        setLine("");
      }
    }
  }

  return (
    <Section
      id="app-console"
      title="Console"
      description="Shell and logs for this app’s containers."
    >
      <div
        className="overflow-hidden rounded-b-lg border-t-0 bg-[#0c0c0c] font-mono text-[13px] leading-relaxed text-[#e4e4e7] shadow-inner"
        onClick={() => inputRef.current?.focus()}
      >
        <div className="flex items-center gap-3 border-b border-zinc-800 bg-[#1a1a1a] px-3 py-2">
          <div className="flex gap-1.5" aria-hidden>
            <span className="size-3 rounded-full bg-[#ff5f57]" />
            <span className="size-3 rounded-full bg-[#febc2e]" />
            <span className="size-3 rounded-full bg-[#28c840]" />
          </div>
          <span className="text-xs text-zinc-500">minipaas — user-{user}</span>
          <div className="ml-auto flex gap-1 text-xs">
            <TabButton active={tab === "shell"} onClick={() => setTab("shell")}>
              Shell
            </TabButton>
            <TabButton active={tab === "logs"} onClick={() => setTab("logs")}>
              Logs
            </TabButton>
            {tab === "logs" && (
              <button
                type="button"
                disabled={!enabled}
                onClick={() => setFollow((on) => !on)}
                className={cn(
                  "ml-2 rounded px-2 py-0.5",
                  follow ? "bg-emerald-900/60 text-emerald-300" : "text-zinc-500 hover:text-zinc-300"
                )}
              >
                {follow ? "● live" : "follow"}
              </button>
            )}
          </div>
        </div>

        {tab === "shell" ? (
          <>
            <div
              ref={scrollRef}
              className="h-[min(22rem,50vh)] overflow-y-auto px-4 py-3"
              onMouseDown={(e) => {
                if (e.target === e.currentTarget) e.preventDefault();
              }}
            >
              {history.map((row, index) => (
                <div key={index} className="whitespace-pre-wrap break-all">
                  {row.kind === "cmd" ? (
                    <>
                      <span className="text-emerald-400">{prompt} </span>
                      <span>{row.text}</span>
                    </>
                  ) : row.kind === "sys" ? (
                    <span className="text-zinc-500">{row.text}</span>
                  ) : (
                    <span className={cn(row.exitCode !== 0 && "text-amber-300/90")}>{row.text}</span>
                  )}
                </div>
              ))}
            </div>
            <form
              className="flex items-center gap-2 border-t border-zinc-800 px-4 py-2.5"
              onSubmit={(e) => {
                e.preventDefault();
                void runCommand(line);
                focusInput();
              }}
            >
              <span className="shrink-0 text-emerald-400">{prompt}</span>
              <input
                ref={inputRef}
                value={line}
                onChange={(e) => setLine(e.target.value)}
                onKeyDown={onKeyDown}
                disabled={!enabled}
                readOnly={busy}
                spellCheck={false}
                autoCapitalize="off"
                autoCorrect="off"
                autoComplete="off"
                aria-label="Terminal command"
                className="min-w-0 flex-1 bg-transparent text-[#e4e4e7] caret-emerald-400 outline-none disabled:opacity-50"
              />
              {busy && <span className="text-xs text-zinc-600">…</span>}
            </form>
          </>
        ) : (
          <div ref={scrollRef} className="h-[min(24rem,52vh)] overflow-y-auto px-4 py-3 whitespace-pre-wrap text-[#a3e635]/90">
            {logError ? (
              <span className="text-amber-300">{logError}</span>
            ) : logs ? (
              logs
            ) : (
              <span className="text-zinc-500">No log lines yet. Hit the app URL or turn on follow.</span>
            )}
          </div>
        )}
      </div>
    </Section>
  );
});

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded px-2 py-0.5",
        active ? "bg-zinc-700 text-zinc-100" : "text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
      )}
    >
      {children}
    </button>
  );
}