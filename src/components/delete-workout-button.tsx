"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { deleteWorkout } from "@/lib/actions";

// Löscht ein einzelnes Workout aus dem Verlauf. Zweistufig (erst bestätigen),
// damit nichts versehentlich verschwindet.
export function DeleteWorkoutButton({ id, name }: { id: string; name: string }) {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        aria-label={`${name} löschen`}
        className="flex size-9 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-danger/15 hover:text-danger active:bg-danger/15"
      >
        <Trash2 className="size-4" />
      </button>
    );
  }

  return (
    <div className="flex shrink-0 items-center gap-1.5">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            await deleteWorkout(id);
            setConfirming(false);
          })
        }
        className="rounded-lg bg-danger/15 px-2.5 py-1.5 text-xs font-semibold text-danger transition-colors hover:bg-danger/25 disabled:opacity-50"
      >
        {pending ? "…" : "Löschen"}
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => setConfirming(false)}
        className="rounded-lg bg-surface-2 px-2.5 py-1.5 text-xs font-medium text-muted transition-colors hover:text-foreground"
      >
        Abbrechen
      </button>
    </div>
  );
}
