"use client";

import { useState, useTransition } from "react";
import { DownloadCloud, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { triggerManualUpdate, type UpdateState } from "@/lib/actions";

// Button für die Admin-Seite: stößt das Update-Skript an, sofern ein Update
// verfügbar ist. Nach erfolgreichem Start läuft der Neustart im Hintergrund
// (pm2 reload), daher der Hinweis, kurz zu warten und neu zu laden.
export function ManualUpdateButton() {
  const [pending, startTransition] = useTransition();
  const [state, setState] = useState<UpdateState>(undefined);

  const update = () =>
    startTransition(async () => {
      setState(await triggerManualUpdate());
    });

  if (state?.ok) {
    return (
      <div className="mt-3 flex items-start gap-2 rounded-lg border border-success/40 bg-success/10 px-3 py-2 text-sm text-success">
        <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
        <span>
          Update gestartet. Die App baut neu und startet sich gleich neu – das
          kann ein bis zwei Minuten dauern. Lade die Seite danach neu.
        </span>
      </div>
    );
  }

  return (
    <div className="mt-3">
      <button
        type="button"
        disabled={pending}
        onClick={update}
        className="inline-flex min-h-11 w-full select-none items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:opacity-90 active:opacity-80 disabled:opacity-60"
      >
        {pending ? (
          <>
            <Loader2 className="size-4 animate-spin" /> Update wird gestartet…
          </>
        ) : (
          <>
            <DownloadCloud className="size-4" /> Jetzt manuell aktualisieren
          </>
        )}
      </button>
      {state?.error && (
        <div className="mt-2 flex items-start gap-2 rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <span>{state.error}</span>
        </div>
      )}
    </div>
  );
}
