"use client";

import { useActionState, useEffect, useRef, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import type { FormState } from "@/app/actions";

export function SubmitButton({ children, className = "btn-primary", pendingText }: { children: ReactNode; className?: string; pendingText?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending}>
      {pending ? pendingText ?? "Saving…" : children}
    </button>
  );
}

/** A form bound to a server action that returns { error } / { ok }. */
export function StateForm({
  action,
  children,
  className,
  resetOnOk = false,
}: {
  action: (state: FormState, fd: FormData) => Promise<FormState>;
  children: ReactNode;
  className?: string;
  resetOnOk?: boolean;
}) {
  const [state, formAction] = useActionState(action, undefined);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (resetOnOk && state?.ok) ref.current?.reset();
  }, [state, resetOnOk]);
  return (
    <form ref={ref} action={formAction} className={className}>
      {children}
      {state?.error && <p className="text-sm text-red-700" role="alert">{state.error}</p>}
      {state?.ok && <p className="text-sm text-emerald-700" role="status">{state.ok}</p>}
    </form>
  );
}

/** Button that runs a server action after a confirm() prompt. */
export function ConfirmButton({
  action,
  confirmText,
  children,
  className = "btn-ghost text-red-700",
}: {
  action: () => Promise<void>;
  confirmText: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm(confirmText)) e.preventDefault();
      }}
    >
      <button type="submit" className={className}>
        {children}
      </button>
    </form>
  );
}
