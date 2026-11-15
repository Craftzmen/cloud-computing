"use client";

import { useState } from "react";
import { glossary } from "@/components/guide/glossary";

export function LearnLink({ term }: { term: keyof typeof glossary }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="inline">
      <button type="button" className="text-xs text-primary hover:underline" onClick={() => setOpen((value) => !value)}>
        {open ? "Hide" : "What is this?"}
      </button>
      {open && <p className="mt-2 text-xs leading-5 text-muted-foreground">{glossary[term]}</p>}
    </span>
  );
}