"use client";

import { useEffect, useRef, useState } from "react";
import { X, Plus, Minus } from "lucide-react";
import { formatDuration } from "@/lib/utils";

export function RestTimer({
  seconds,
  onClose,
}: {
  seconds: number;
  onClose: () => void;
}) {
  const [remaining, setRemaining] = useState(seconds);
  const audioRef = useRef(false);

  useEffect(() => {
    const t = setInterval(() => {
      setRemaining((r) => Math.max(0, r - 1));
    }, 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (remaining === 0 && !audioRef.current) {
      audioRef.current = true;
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate([200, 100, 200]);
      }
    }
  }, [remaining]);

  const done = remaining === 0;

  return (
    <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-40 mx-auto max-w-md px-4 md:bottom-4 md:left-60">
      <div className="flex items-center justify-between rounded-xl border border-border bg-surface-2 px-4 py-3 shadow-lg">
        <button
          onClick={() => setRemaining((r) => Math.max(0, r - 15))}
          className="flex size-11 items-center justify-center rounded-lg bg-surface text-muted hover:text-foreground active:scale-95"
          aria-label="-15s"
        >
          <Minus className="size-4" />
        </button>
        <div className="text-center">
          <p className="text-xs text-muted">Pause</p>
          <p
            className={`font-mono text-2xl font-bold tabular-nums ${
              done ? "text-success" : "text-foreground"
            }`}
          >
            {done ? "Fertig!" : formatDuration(remaining)}
          </p>
        </div>
        <button
          onClick={() => setRemaining((r) => r + 15)}
          className="flex size-11 items-center justify-center rounded-lg bg-surface text-muted hover:text-foreground active:scale-95"
          aria-label="+15s"
        >
          <Plus className="size-4" />
        </button>
        <button
          onClick={onClose}
          className="flex size-11 items-center justify-center rounded-lg bg-surface text-muted hover:text-foreground active:scale-95"
          aria-label="Schließen"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
