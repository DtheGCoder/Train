"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { deleteUser } from "@/lib/actions";

export function DeleteUserButton({
  id,
  username,
  disabled,
}: {
  id: string;
  username: string;
  disabled?: boolean;
}) {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  if (disabled) {
    return (
      <span className="text-xs text-muted">—</span>
    );
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        aria-label={`${username} löschen`}
        className="flex size-9 items-center justify-center rounded-lg text-muted transition-colors hover:bg-danger/15 hover:text-danger"
      >
        <Trash2 className="size-4" />
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            await deleteUser(id);
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
