"use client";

import { useState } from "react";
import { Trophy, Crown, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/avatar";
import type { ScoreLine } from "@/lib/coach";

export type LeaderboardRow = {
  userId: string;
  username: string;
  avatar: string | null;
  score: number;
  workouts: number;
  volume: number;
  sets: number;
  best1rm: number;
  lines: ScoreLine[];
};

const fmt = (n: number) => Math.round(n).toLocaleString("de-DE");

const PLACE = {
  1: { ring: "ring-amber-400", badge: "bg-amber-400 text-black", pedestal: "h-20 bg-amber-400/20" },
  2: { ring: "ring-slate-300", badge: "bg-slate-300 text-black", pedestal: "h-14 bg-slate-300/15" },
  3: { ring: "ring-amber-700", badge: "bg-amber-700 text-white", pedestal: "h-10 bg-amber-700/20" },
} as const;

export function Leaderboard({
  rows,
  meId,
}: {
  rows: LeaderboardRow[];
  meId: string;
}) {
  const [open, setOpen] = useState<Set<string>>(() => new Set());

  const toggle = (id: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  // Podium klassisch 2 – 1 – 3 anordnen.
  const podium = rows.slice(0, 3);
  const podiumOrder = [1, 0, 2]
    .filter((i) => podium[i])
    .map((i) => ({ row: podium[i], place: (i + 1) as 1 | 2 | 3 }));

  return (
    <>
      {/* Podium – Top 3 */}
      <div className="flex items-end justify-center gap-3 sm:gap-5">
        {podiumOrder.map(({ row, place }) => {
          const p = PLACE[place];
          const isMe = row.userId === meId;
          return (
            <div
              key={row.userId}
              className="flex min-w-0 flex-1 flex-col items-center"
            >
              {place === 1 && <Crown className="mb-1 size-5 text-amber-400" />}
              <Avatar
                src={row.avatar}
                name={row.username}
                className={cn("size-14 text-sm ring-2", p.ring)}
              />
              <p className="mt-2 w-full truncate text-center text-sm font-semibold">
                {row.username}
                {isMe && <span className="text-muted"> (du)</span>}
              </p>
              <p className="text-xs font-bold tabular-nums text-primary">
                {fmt(row.score)} Pkt
              </p>
              <div
                className={cn(
                  "mt-2 flex w-full items-start justify-center rounded-t-lg pt-2",
                  p.pedestal,
                )}
              >
                <span
                  className={cn(
                    "flex size-7 items-center justify-center rounded-full text-sm font-bold",
                    p.badge,
                  )}
                >
                  {place}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Vollständige Rangliste mit aufklappbarer Aufschlüsselung */}
      <div>
        <div className="mb-2 flex items-center gap-2">
          <Trophy className="size-5 text-primary" />
          <h2 className="font-semibold">Rangliste ({rows.length})</h2>
        </div>
        <ul className="space-y-2">
          {rows.map((r, i) => {
            const isMe = r.userId === meId;
            const isOpen = open.has(r.userId);
            return (
              <li
                key={r.userId}
                className={cn(
                  "overflow-hidden rounded-xl border border-border bg-surface",
                  isMe && "ring-1 ring-primary/40",
                )}
              >
                <button
                  type="button"
                  onClick={() => toggle(r.userId)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-surface-2"
                >
                  <span className="w-5 text-center text-sm font-bold tabular-nums text-muted">
                    {i + 1}
                  </span>
                  <Avatar
                    src={r.avatar}
                    name={r.username}
                    className="size-9 text-xs"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">
                      {r.username}
                      {isMe && (
                        <span className="ml-1 text-xs text-muted">(du)</span>
                      )}
                    </p>
                    <p className="truncate text-xs text-muted">
                      {r.workouts} Workouts · {fmt(r.volume)} kg · {fmt(r.sets)}{" "}
                      Sätze
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold tabular-nums text-primary">
                      {fmt(r.score)}
                    </p>
                    <p className="text-[11px] text-muted">Punkte</p>
                  </div>
                  <ChevronDown
                    className={cn(
                      "size-4 shrink-0 text-muted transition-transform duration-200",
                      isOpen && "rotate-180",
                    )}
                  />
                </button>

                {/* Aufschlüsselung – smooth aufklappen (grid 0fr → 1fr) */}
                <div
                  className="grid transition-[grid-template-rows] duration-300 ease-out"
                  style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
                >
                  <div className="overflow-hidden">
                    <div className="border-t border-border px-4 py-3">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                        Punkte-Aufschlüsselung
                      </p>
                      <ul className="space-y-1.5">
                        {r.lines.map((l) => (
                          <li
                            key={l.key}
                            className="flex items-baseline justify-between gap-3 text-sm"
                          >
                            <span className="min-w-0">
                              <span className="font-medium">{l.label}</span>{" "}
                              <span className="text-xs text-muted">
                                ({l.detail})
                              </span>
                            </span>
                            <span className="shrink-0 font-bold tabular-nums">
                              {fmt(l.points)}
                            </span>
                          </li>
                        ))}
                      </ul>
                      <div className="mt-2 flex items-baseline justify-between border-t border-border pt-2 text-sm">
                        <span className="font-semibold">Gesamt</span>
                        <span className="font-bold tabular-nums text-primary">
                          {fmt(r.score)} Punkte
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
        <p className="mt-2 text-xs text-muted">
          Score = Konsistenz (10 / Workout) + Volumen (1 / 1.000 kg) + Coach ·
          Stärke (1 / 2 kg bestem 1RM) + Coach · Fortschritt (Aufwärtstrend je
          Übung). Tippe auf einen Eintrag für die genaue Aufschlüsselung.
        </p>
      </div>
    </>
  );
}
