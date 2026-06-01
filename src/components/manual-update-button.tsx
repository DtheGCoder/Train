"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DownloadCloud,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Check,
} from "lucide-react";
import { triggerManualUpdate } from "@/lib/actions";
import {
  UPDATE_STEPS,
  isUpdateActive,
  remainingEtaSec,
  stepIndex,
  stepProgress,
  type UpdateStatus,
} from "@/lib/update-status";

// Nur die echten Arbeitsschritte in der Checkliste anzeigen
// ("start"/"done" sind Rahmen-Zustände).
const VISIBLE_STEPS = UPDATE_STEPS.filter(
  (s) => s.key !== "start" && s.key !== "done",
);

const POLL_MS = 1500;
// Erfolgsmeldung nur kurz zeigen – der Status bleibt sonst dauerhaft in der
// Datei stehen und würde den Admin bei jedem Besuch wieder begrüßen.
const SUCCESS_VISIBLE_MS = 10 * 60 * 1000;

function fmtDuration(totalSec: number): string {
  const s = Math.max(0, Math.round(totalSec));
  const m = Math.floor(s / 60);
  const rest = s % 60;
  return m > 0
    ? `${m}:${String(rest).padStart(2, "0")} min`
    : `${rest} s`;
}

export function ManualUpdateButton({
  updateAvailable,
  initialStatus,
}: {
  updateAvailable: boolean;
  initialStatus: UpdateStatus | null;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<UpdateStatus | null>(initialStatus);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const refreshedRef = useRef(false);

  const active = isUpdateActive(status, now);
  const recentSuccess =
    status?.state === "success" &&
    !!status.updatedAt &&
    now - Date.parse(status.updatedAt) < SUCCESS_VISIBLE_MS;

  // Status vom Server holen.
  const poll = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/update-status", {
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = (await res.json()) as UpdateStatus | { state: "idle" };
      if (data && data.state !== "idle") {
        setStatus(data as UpdateStatus);
      }
    } catch {
      // Während des pm2-Neustarts antwortet der Server kurz nicht – ignorieren,
      // letzter bekannter Status bleibt stehen.
    }
  }, []);

  // Solange ein Update läuft: jede Sekunde ticken (Uhr) und regelmäßig pollen.
  useEffect(() => {
    if (!active) return;
    const tick = setInterval(() => setNow(Date.now()), 1000);
    const p = setInterval(poll, POLL_MS);
    // Sofort einmal pollen, aber außerhalb des Effekt-Bodies (kein synchrones
    // setState im Effekt).
    const first = setTimeout(poll, 0);
    return () => {
      clearInterval(tick);
      clearInterval(p);
      clearTimeout(first);
    };
  }, [active, poll]);

  // Nach Erfolg die Seite neu laden, damit die neue Version & der frische
  // Status angezeigt werden (einmalig).
  useEffect(() => {
    if (recentSuccess && !refreshedRef.current) {
      refreshedRef.current = true;
      const t = setTimeout(() => router.refresh(), 2500);
      return () => clearTimeout(t);
    }
  }, [recentSuccess, router]);

  const start = () => {
    setActionError(null);
    setPending(true);
    void (async () => {
      const res = await triggerManualUpdate();
      setPending(false);
      if (res?.error) {
        setActionError(res.error);
        // Falls serverseitig schon ein Lauf läuft: dessen Status holen.
        void poll();
        return;
      }
      // Optimistisch sofort auf "läuft" schalten, Polling übernimmt danach.
      const ts = new Date().toISOString();
      setStatus({
        state: "running",
        step: "start",
        startedAt: ts,
        updatedAt: ts,
        fromSha: null,
        toSha: null,
        message: "Update wird vorbereitet…",
        error: "",
      });
      setNow(Date.now());
    })();
  };

  /* -------------------- Laufendes Update: Fortschritt -------------------- */
  if (active && status) {
    const currentIdx = stepIndex(status.step);
    const percent = stepProgress(status.step);
    const elapsedSec = status.startedAt
      ? (now - Date.parse(status.startedAt)) / 1000
      : 0;
    const remaining = remainingEtaSec(status.step);

    return (
      <div className="mt-3 rounded-xl border border-primary/40 bg-primary/5 p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-primary">
          <Loader2 className="size-4 animate-spin" />
          {status.message || "Update läuft…"}
        </div>

        {/* Fortschrittsbalken */}
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-surface-2">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${percent}%` }}
          />
        </div>
        <div className="mt-1.5 flex justify-between text-xs text-muted">
          <span>{percent}%</span>
          <span>
            läuft seit {fmtDuration(elapsedSec)}
            {remaining > 0 && status.step !== "reload" && (
              <> · noch ca. {fmtDuration(remaining)}</>
            )}
          </span>
        </div>

        {/* Was genau passiert gerade */}
        <ul className="mt-3 space-y-1.5">
          {VISIBLE_STEPS.map((s) => {
            const idx = stepIndex(s.key);
            const done = currentIdx > idx;
            const isCurrent = currentIdx === idx;
            return (
              <li
                key={s.key}
                className={`flex items-center gap-2 text-sm ${
                  done
                    ? "text-success"
                    : isCurrent
                      ? "font-medium text-foreground"
                      : "text-muted"
                }`}
              >
                {done ? (
                  <Check className="size-4 shrink-0" />
                ) : isCurrent ? (
                  <Loader2 className="size-4 shrink-0 animate-spin text-primary" />
                ) : (
                  <span className="size-4 shrink-0 rounded-full border border-current opacity-40" />
                )}
                {s.label}
              </li>
            );
          })}
        </ul>

        <p className="mt-3 text-xs text-muted">
          Der Server baut neu und startet sich gleich selbst neu – das passiert
          automatisch, du musst nichts tun. Diese Anzeige aktualisiert sich von
          allein.
        </p>
      </div>
    );
  }

  /* -------------------- Erfolg (frisch) -------------------- */
  if (recentSuccess && status) {
    return (
      <div className="mt-3 flex items-start gap-2 rounded-lg border border-success/40 bg-success/10 px-3 py-2 text-sm text-success">
        <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
        <span>
          Update abgeschlossen
          {status.toSha && (
            <> auf {status.toSha.slice(0, 7)}</>
          )}
          . Die Seite wird gleich neu geladen.
        </span>
      </div>
    );
  }

  /* -------------------- Fehler -------------------- */
  const errorText = status?.state === "error" ? status.error : actionError;

  /* -------------------- Kein Update verfügbar & nichts läuft -------------------- */
  if (!updateAvailable && !errorText) {
    return null;
  }

  /* -------------------- Button (Update verfügbar / nach Fehler erneut) -------------------- */
  return (
    <div className="mt-3">
      <button
        type="button"
        disabled={pending}
        onClick={start}
        className="inline-flex min-h-11 w-full select-none items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:opacity-90 active:opacity-80 disabled:opacity-60"
      >
        {pending ? (
          <>
            <Loader2 className="size-4 animate-spin" /> Update wird gestartet…
          </>
        ) : (
          <>
            <DownloadCloud className="size-4" />
            {errorText ? "Erneut versuchen" : "Jetzt manuell aktualisieren"}
          </>
        )}
      </button>
      {errorText && (
        <div className="mt-2 flex items-start gap-2 rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <span>{errorText}</span>
        </div>
      )}
    </div>
  );
}
