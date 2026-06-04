"use client";

import { useEffect, useState } from "react";
import { Award, X, Sparkles } from "lucide-react";

// Schön animiertes Pop-up nach dem Workout für neu freigeschaltete Achievements.
// Erscheint pro Workout nur EINMAL (per localStorage gemerkt) – kein Spam.
export function AchievementPopup({
  workoutId,
  items,
}: {
  workoutId: string;
  items: { id: string; title: string; desc: string; points: number }[];
}) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (items.length === 0) return;
    const key = `ach-pop-${workoutId}`;
    let seen = false;
    try {
      seen = !!localStorage.getItem(key);
      if (!seen) localStorage.setItem(key, "1");
    } catch {
      seen = false;
    }
    if (seen) return;
    const r = requestAnimationFrame(() => setShow(true));
    return () => cancelAnimationFrame(r);
  }, [workoutId, items.length]);

  if (!show || items.length === 0) return null;
  const total = items.reduce((s, i) => s + i.points, 0);

  return (
    <div className="finish-overlay fixed inset-0 z-[80] flex items-center justify-center bg-background/80 px-6 backdrop-blur-sm">
      {/* Konfetti */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {Array.from({ length: 14 }).map((_, i) => {
          const left = (i * 67) % 100;
          const delay = (i % 7) * 0.18;
          const colors = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#e879f9"];
          return (
            <span
              key={i}
              className="finish-confetti absolute top-0 size-2 rounded-sm"
              style={{
                left: `${left}%`,
                background: colors[i % colors.length],
                animationDelay: `${delay}s`,
              }}
            />
          );
        })}
      </div>

      <div className="finish-pop relative w-full max-w-sm rounded-3xl border border-success/40 bg-surface p-6 text-center shadow-2xl shadow-black/50">
        <button
          onClick={() => setShow(false)}
          aria-label="Schließen"
          className="absolute right-3 top-3 flex size-9 items-center justify-center rounded-lg text-muted hover:bg-surface-2 hover:text-foreground"
        >
          <X className="size-5" />
        </button>

        <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-success/15">
          <Award className="size-8 text-success" />
        </div>
        <h2 className="mt-3 flex items-center justify-center gap-1.5 text-xl font-extrabold">
          <Sparkles className="size-5 text-amber-400" />
          {items.length === 1 ? "Achievement freigeschaltet!" : `${items.length} Achievements!`}
        </h2>
        <p className="mt-1 text-sm text-muted">
          +{total} Belohnungspunkte für die Bestenliste
        </p>

        <ul className="mt-4 space-y-2 text-left">
          {items.map((a) => (
            <li
              key={a.id}
              className="flex items-center gap-3 rounded-xl border border-success/30 bg-success/5 px-3 py-2.5"
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-success/15">
                <Award className="size-4 text-success" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{a.title}</span>
                <span className="block truncate text-xs text-muted">{a.desc}</span>
              </span>
              <span className="shrink-0 rounded-md bg-success/15 px-1.5 py-0.5 text-[11px] font-bold text-success">
                +{a.points}
              </span>
            </li>
          ))}
        </ul>

        <button
          onClick={() => setShow(false)}
          className="mt-5 w-full rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground active:scale-[0.99]"
        >
          Stark! 💪
        </button>
      </div>
    </div>
  );
}
