"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Section } from "@/components/console/section";
import { Button } from "@/components/ui/button";
import { markWelcomeSeen, welcomeSeen } from "@/lib/guide-progress";
import { LearnLink } from "@/components/guide/learn-link";

export function WelcomeBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    setShow(!welcomeSeen());
  }, []);

  if (!show) return null;

  function focusAccount() {
    markWelcomeSeen();
    setShow(false);
    const input = document.querySelector<HTMLInputElement>('input[aria-label="Account name"]');
    input?.focus();
  }

  function dismiss() {
    markWelcomeSeen();
    setShow(false);
  }

  return (
    <Section title="Welcome to MiniPaaS">
      <div className="px-5 py-4">
        <p className="text-sm leading-6 text-muted-foreground">
          Deploy a container image on this computer. Each app gets its own address. Usage and uptime are stored in Azure
          so you can see cost and quality in this console.
        </p>
        <p className="mt-2 text-sm">
          <LearnLink term="account" />
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button type="button" size="sm" onClick={focusAccount}>
            Set your account name
          </Button>
          <Button variant="outline" size="sm" nativeButton={false} render={<Link href="/getting-started" />} onClick={dismiss}>
            See the checklist
          </Button>
        </div>
      </div>
    </Section>
  );
}