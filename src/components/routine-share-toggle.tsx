"use client";

import { useState, useTransition } from "react";
import { Globe, Lock, Loader2 } from "lucide-react";
import { setRoutineVisibility } from "@/lib/actions";
import { cn } from "@/lib/utils";

// Schalter, um die eigene Vorlage für die Community freizugeben oder zurückzuziehen.
export function RoutineShareToggle({
  routineId,
  initialPublic,
}: {
  routineId: string;
  initialPublic: boolean;
}) {
  const [isPublic, setIsPublic] = useState(initialPublic);
  const [pending, startTransition] = useTransition();

  function toggle() {
    const next = !isPublic;
    setIsPublic(next);
    startTransition(async () => {
      await setRoutineVisibility(routineId, next);
    });
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface px-4 py-3">
      <div className="flex items-center gap-3">
        {isPublic ? (
          <Globe className="size-5 shrink-0 text-success" />
        ) : (
          <Lock className="size-5 shrink-0 text-muted" />
        )}
        <div className="min-w-0">
          <p className="text-sm font-medium">
            {isPublic ? "Öffentlich geteilt" : "Privat"}
          </p>
          <p className="text-xs text-muted">
            {isPublic
              ? "Andere Nutzer können diese Vorlage übernehmen."
              : "Nur du siehst diese Vorlage."}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        aria-pressed={isPublic}
        className={cn(
          "relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors disabled:opacity-60",
          isPublic ? "bg-success" : "bg-surface-2",
        )}
      >
        <span
          className={cn(
            "inline-flex size-5 items-center justify-center rounded-full bg-white transition-transform",
            isPublic ? "translate-x-6" : "translate-x-1",
          )}
        >
          {pending && <Loader2 className="size-3 animate-spin text-muted" />}
        </span>
      </button>
    </div>
  );
}
