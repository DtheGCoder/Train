"use client";

import { useState, useTransition } from "react";
import { Trash2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui";
import { resetAllData } from "@/lib/actions";

export function ResetDataButton() {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  const reset = () =>
    startTransition(async () => {
      await resetAllData();
      setConfirming(false);
    });

  if (!confirming) {
    return (
      <Button
        variant="danger"
        className="w-full"
        onClick={() => setConfirming(true)}
      >
        <Trash2 className="size-4" /> Alle Trainingsdaten zurücksetzen
      </Button>
    );
  }

  return (
    <div className="rounded-xl border border-danger/40 bg-danger/10 p-4">
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 size-5 shrink-0 text-danger" />
        <div>
          <p className="text-sm font-semibold text-danger">
            Wirklich alles zurücksetzen?
          </p>
          <p className="mt-1 text-xs text-muted">
            Alle Workouts, der gesamte Verlauf und deine Rekorde werden
            unwiderruflich gelöscht. Übungen, Pläne und dein Coach-Profil
            bleiben erhalten.
          </p>
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <Button
          variant="secondary"
          className="flex-1"
          disabled={pending}
          onClick={() => setConfirming(false)}
        >
          Abbrechen
        </Button>
        <Button
          variant="danger"
          className="flex-1"
          disabled={pending}
          onClick={reset}
        >
          {pending ? "Lösche…" : "Endgültig löschen"}
        </Button>
      </div>
    </div>
  );
}
