"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { getInvoice, getSla, getUptime, type Invoice, type Sla, type Uptime } from "@/lib/api";
import { markGuideStep } from "@/lib/guide-progress";

type DashboardState = {
  handle: string;
  setHandle: (value: string) => void;
  active: string;
  submit: (event: React.FormEvent) => void;
  sla: Sla | null;
  invoice: Invoice | null;
  uptime: Uptime | null;
  error: string;
  loading: boolean;
};

const DashboardContext = createContext<DashboardState | null>(null);

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const [handle, setHandle] = useState("");
  const [active, setActive] = useState("");
  const [sla, setSla] = useState<Sla | null>(null);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [uptime, setUptime] = useState<Uptime | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async (user: string) => {
    try {
      const [nextSla, nextInvoice, nextUptime] = await Promise.all([
        getSla(user),
        getInvoice(user),
        getUptime(user),
      ]);
      setSla(nextSla);
      setInvoice(nextInvoice);
      setUptime(nextUptime);
      setError("");
    } catch (e) {
      setSla(null);
      setInvoice(null);
      setUptime(null);
      setError(e instanceof Error ? e.message : "Something went wrong");
    }
  }, []);

  useEffect(() => {
    const saved = (localStorage.getItem("handle") ?? "").trim().toLowerCase();
    setHandle(saved);
    setActive(saved);
  }, []);

  useEffect(() => {
    if (!active) return;
    load(active);
    const timer = setInterval(() => load(active), 30_000);
    return () => clearInterval(timer);
  }, [active, load]);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const next = handle.trim().toLowerCase();
    if (!next) return;
    localStorage.setItem("handle", next);
    setHandle(next);
    setSla(null);
    setInvoice(null);
    setUptime(null);
    setError("");
    setActive(next);
    markGuideStep("account");
  }

  const loading = Boolean(active) && !sla && !error;

  return (
    <DashboardContext.Provider value={{ handle, setHandle, active, submit, sla, invoice, uptime, error, loading }}>
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  const value = useContext(DashboardContext);
  if (!value) throw new Error("useDashboard must be used inside DashboardProvider");
  return value;
}
