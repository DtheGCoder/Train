"use client";

import { useEffect, useRef, useState } from "react";
import { X, Plus, Minus, Timer } from "lucide-react";
import { formatDuration } from "@/lib/utils";
import {
  scheduleRestNotification,
  cancelRestNotification,
  notifyRestDone,
} from "@/lib/notify";

// Pausentimer auf Basis eines absoluten END-Zeitpunkts (statt herunterzählendem
// Zähler). Dadurch bleibt er korrekt, wenn das Display aus ist / die App im
// Hintergrund läuft: beim Zurückkehren wird die Restzeit neu aus der Uhr
// berechnet. Zum Pausen-Ende kommt zusätzlich eine Benachrichtigung.
export function RestTimer({
  seconds,
  nextHint,
  onClose,
}: {
  seconds: number;
  nextHint?: string;
  onClose: () => void;
}) {
  // Absoluter Endzeitpunkt; initial einmal gesetzt (Komponente wird je Pause
  // über einen key frisch gemountet).
  const [endAt, setEndAt] = useState(() => Date.now() + seconds * 1000);
  const [remaining, setRemaining] = useState(seconds);
  const firedRef = useRef(false);
  const body = nextHint && nextHint.trim() ? nextHint : "Weiter geht's!";

  // Benachrichtigung im Service Worker einplanen (Hintergrund/Lock-Screen).
  useEffect(() => {
    scheduleRestNotification(endAt, "Pause vorbei 💪", body);
    return () => {
      cancelRestNotification();
    };
  }, [endAt, body]);

  // Restzeit aus der Uhr ableiten – robust gegen Hintergrund/Display-aus.
  useEffect(() => {
    const recompute = () => {
      const left = Math.max(0, Math.round((endAt - Date.now()) / 1000));
      setRemaining(left);
      if (left === 0 && !firedRef.current) {
        firedRef.current = true;
        if (typeof navigator !== "undefined" && navigator.vibrate) {
          navigator.vibrate([200, 100, 200]);
        }
        // Wenn die App gerade sichtbar ist, zeigen wir das Banner direkt.
        if (
          typeof document === "undefined" ||
          document.visibilityState === "visible"
        ) {
          notifyRestDone("Pause vorbei 💪", body);
        }
      }
    };
    recompute();
    const t = setInterval(recompute, 250);
    const onVis = () => recompute();
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", onVis);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("focus", onVis);
    };
  }, [endAt, body]);

  const adjust = (delta: number) => {
    firedRef.current = false;
    setEndAt((e) => Math.max(Date.now(), e + delta * 1000));
  };

  const done = remaining === 0;
  // Verstrichener Anteil für den Balken (auf den Ausgangswert bezogen, geklemmt).
  const progress = done
    ? 1
    : Math.min(1, Math.max(0, 1 - remaining / Math.max(1, seconds)));

  return (
    <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-40 mx-auto max-w-md px-4 md:bottom-4 md:left-60">
      <div
        className={`overflow-hidden rounded-2xl border bg-surface-2 shadow-xl shadow-black/40 ${
          done ? "border-success/60" : "border-primary/40"
        }`}
      >
        {/* Fortschrittsbalken */}
        <div className="h-1 w-full bg-surface">
          <div
            className={`h-full transition-[width] duration-300 ease-linear ${
              done ? "bg-success" : "bg-primary"
            }`}
            style={{ width: `${Math.min(100, Math.max(0, progress * 100))}%` }}
          />
        </div>

        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={() => adjust(-15)}
            className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-surface text-muted hover:text-foreground active:scale-95"
            aria-label="15 Sekunden weniger"
          >
            <Minus className="size-4" />
          </button>

          <div className="min-w-0 flex-1 text-center">
            <p className="flex items-center justify-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted">
              <Timer className="size-3.5" /> {done ? "Pause vorbei" : "Pause"}
            </p>
            <p
              className={`font-mono text-3xl font-bold tabular-nums leading-tight ${
                done ? "text-success" : "text-foreground"
              }`}
            >
              {done ? "Los!" : formatDuration(remaining)}
            </p>
            {body && (
              <p className="truncate text-xs text-muted">{body}</p>
            )}
          </div>

          <button
            onClick={() => adjust(15)}
            className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-surface text-muted hover:text-foreground active:scale-95"
            aria-label="15 Sekunden mehr"
          >
            <Plus className="size-4" />
          </button>
          <button
            onClick={onClose}
            className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-surface text-muted hover:text-foreground active:scale-95"
            aria-label="Pause schließen"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
