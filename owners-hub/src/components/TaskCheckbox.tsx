"use client";

import { useOptimistic, useTransition } from "react";
import { setTaskDone } from "@/app/actions";

export function TaskCheckbox({ taskId, done, label, size = "md" }: { taskId: string; done: boolean; label: string; size?: "md" | "lg" }) {
  const [optimistic, setOptimistic] = useOptimistic(done);
  const [, startTransition] = useTransition();
  const dim = size === "lg" ? "h-7 w-7" : "h-6 w-6";
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={optimistic}
      aria-label={`${optimistic ? "Uncheck" : "Check off"}: ${label}`}
      onClick={() =>
        startTransition(async () => {
          setOptimistic(!optimistic);
          await setTaskDone(taskId, !optimistic);
        })
      }
      className={`${dim} flex shrink-0 items-center justify-center rounded-full border-2 transition ${
        optimistic ? "border-emerald-600 bg-emerald-600 text-white" : "border-stone-300 bg-white hover:border-brand"
      }`}
    >
      {optimistic && (
        <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden>
          <path fillRule="evenodd" d="M16.7 5.3a1 1 0 010 1.4l-7.5 7.5a1 1 0 01-1.4 0L3.3 9.7a1 1 0 011.4-1.4l3.8 3.8 6.8-6.8a1 1 0 011.4 0z" clipRule="evenodd" />
        </svg>
      )}
    </button>
  );
}
