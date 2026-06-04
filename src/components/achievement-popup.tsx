"use client";

import { useEffect, useState } from "react";
import { Award, X, Sparkles, Crown } from "lucide-react";
import { TitleBadge } from "@/components/title-badge";
import { RARITY_LABEL, type Rarity } from "@/lib/titles";

type AchItem = { id: string; title: string; desc: string; points: number };
type TitleItem = { id: string; name: string; rarity: Rarity; condition: string };

// Schön animiertes Pop-up nach dem Workout für neu freigeschaltete Achievements
// UND Titel. Erscheint pro Workout nur EINMAL (per localStorage gemerkt).
// Sehr viele Einträge werden kompakt und scrollbar dargestellt – Kopf (mit
// Schließen-Button) und Fuß-Button bleiben dabei immer sichtbar.
export function AchievementPopup({
  workoutId,
  items,
  titles = [],
}: {
  workoutId: string;
  items: AchItem[];
  titles?: TitleItem[];
}) {
  const [show, setShow] = useState(false);

  const count = items.length + titles.length;

  useEffect(() => {
    if (count === 0) return;
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
  }, [workoutId, count]);

  if (!show || count === 0) return null;
  const total = items.reduce((s, i) => s + i.points, 0);

  const heading =
    items.length > 0 && titles.length > 0
      ? "Neu freigeschaltet!"
      : titles.length > 0
        ? titles.length === 1
          ? "Titel freigeschaltet!"
          : `${titles.length} Titel freigeschaltet!`
        : items.length === 1
          ? "Achievement freigeschaltet!"
          : `${items.length} Achievements!`;

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

      <div className="finish-pop relative flex max-h-[85vh] w-full max-w-sm flex-col overflow-hidden rounded-3xl border border-success/40 bg-surface shadow-2xl shadow-black/50">
        <button
          onClick={() => setShow(false)}
          aria-label="Schließen"
          className="absolute right-3 top-3 z-10 flex size-9 items-center justify-center rounded-lg text-muted hover:bg-surface-2 hover:text-foreground"
        >
          <X className="size-5" />
        </button>

        {/* Kopf – bleibt stehen */}
        <div className="shrink-0 px-6 pb-3 pt-6 text-center">
          <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-success/15">
            <Award className="size-7 text-success" />
          </div>
          <h2 className="mt-3 flex items-center justify-center gap-1.5 text-xl font-extrabold">
            <Sparkles className="size-5 text-amber-400" />
            {heading}
          </h2>
          {items.length > 0 && (
            <p className="mt-1 text-sm text-muted">
              +{total} Belohnungspunkte für die Bestenliste
            </p>
          )}
        </div>

        {/* Scrollbarer Inhalt – kompakt bei vielen Einträgen */}
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-6 py-1">
          {titles.length > 0 && (
            <div className="space-y-2">
              <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-amber-400">
                <Crown className="size-3.5" />
                {titles.length === 1 ? "Neuer Titel" : `${titles.length} neue Titel`}
              </p>
              <ul className="space-y-1.5">
                {titles.map((tt) => (
                  <li
                    key={tt.id}
                    className="flex items-center gap-3 rounded-xl border border-amber-400/30 bg-amber-400/5 px-3 py-2"
                  >
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-amber-400/15">
                      <Crown className="size-4 text-amber-400" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <TitleBadge
                        name={tt.name}
                        rarity={tt.rarity}
                        className="text-sm"
                      />
                      <span className="block truncate text-[11px] text-muted">
                        {RARITY_LABEL[tt.rarity]} · {tt.condition}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {items.length > 0 && (
            <div className="space-y-2">
              {titles.length > 0 && (
                <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-success">
                  <Award className="size-3.5" />
                  {items.length === 1
                    ? "Neues Achievement"
                    : `${items.length} neue Achievements`}
                </p>
              )}
              <ul className="space-y-1.5">
                {items.map((a) => (
                  <li
                    key={a.id}
                    className="flex items-center gap-3 rounded-xl border border-success/30 bg-success/5 px-3 py-2"
                  >
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-success/15">
                      <Award className="size-4 text-success" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">
                        {a.title}
                      </span>
                      <span className="block truncate text-[11px] text-muted">
                        {a.desc}
                      </span>
                    </span>
                    <span className="shrink-0 rounded-md bg-success/15 px-1.5 py-0.5 text-[11px] font-bold text-success">
                      +{a.points}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Fuß – bleibt stehen */}
        <div className="shrink-0 px-6 pb-6 pt-3">
          <button
            onClick={() => setShow(false)}
            className="w-full rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground active:scale-[0.99]"
          >
            Stark! 💪
          </button>
        </div>
      </div>
    </div>
  );
}
