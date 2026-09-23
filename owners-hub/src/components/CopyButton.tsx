"use client";

import { useState } from "react";

/** Copies the current value of the field with id `targetId`. */
export function CopyButton({ targetId, label = "Copy" }: { targetId: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="text-xs font-medium text-brand hover:underline"
      onClick={async () => {
        const el = document.getElementById(targetId) as HTMLTextAreaElement | null;
        if (!el) return;
        await navigator.clipboard.writeText(el.value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
    >
      {copied ? "Copied ✓" : label}
    </button>
  );
}
