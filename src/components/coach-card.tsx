"use client";

import { Sparkles, Zap, CircleCheckBig, ArrowRight, Flag } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SetRecommendation } from "@/lib/coach";

export type CoachReaction = { tone: string; message: string } | null;

const TONE_STYLES: Record<string, string> = {
  push: "text-primary",
  limit: "text-success",
  hold: "text-muted",
  back: "text-amber-400",
  bold: "text-primary",
  caution: "text-danger",
  info: "text-muted",
  done: "text-success",
};

export function CoachCard({
  rec,
  reaction,
  oneRm,
  onLimitTest,
  done = false,
  nextExerciseName = null,
  setsDone = 0,
  setsPlanned = 0,
}: {
  rec: SetRecommendation | null;
  reaction: CoachReaction;
  oneRm: number;
  onLimitTest: () => void;
  // Übung nach geplanter Satzzahl abgeschlossen?
  done?: boolean;
  // Name der nächsten offenen Übung (null = alles erledigt).
  nextExerciseName?: string | null;
  setsDone?: number;
  setsPlanned?: number;
}) {
  return (
    <div
      className={cn(
        "mx-2 mb-1 rounded-lg border px-3 py-2.5",
        done
          ? "border-success/30 bg-success/5"
          : "border-primary/25 bg-primary/5",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          {done ? (
            <>
              <CircleCheckBig className="size-4 shrink-0 text-success" />
              <p className="truncate text-sm font-semibold text-success">
                Übung erledigt
                {setsPlanned > 0 && (
                  <span className="ml-1 font-normal text-muted">
                    · {setsDone} {setsDone === 1 ? "Satz" : "Sätze"}
                  </span>
                )}
              </p>
            </>
          ) : (
            <>
              <Sparkles className="size-4 shrink-0 text-primary" />
              {rec && rec.hasBaseline ? (
                <p className="truncate text-sm">
                  <span className="text-muted">Nächster Satz: </span>
                  <span className="font-bold tabular-nums">
                    {rec.weight} kg ×{" "}
                    {rec.repLow === rec.repHigh
                      ? rec.reps
                      : `${rec.repLow}–${rec.repHigh}`}
                  </span>
                  <span className="ml-1.5 text-xs text-muted">
                    ~{rec.intensityPct}% · {rec.rir} RIR
                  </span>
                </p>
              ) : (
                <p className="truncate text-sm text-muted">
                  Trag deinen ersten Satz ein — ich lerne deine Werte.
                </p>
              )}
            </>
          )}
        </div>
        {!done && rec && rec.hasBaseline && (
          <button
            type="button"
            onClick={onLimitTest}
            className="flex shrink-0 items-center gap-1 rounded-md bg-primary/15 px-2.5 py-1.5 text-xs font-semibold text-primary active:scale-95"
          >
            <Zap className="size-3.5" /> Limit
          </button>
        )}
      </div>

      {/* Fortschritt der geplanten Sätze */}
      {!done && setsPlanned > 0 && (
        <p className="mt-1 text-[11px] text-muted">
          Satz {Math.min(setsDone + 1, setsPlanned)} von {setsPlanned} geplant
        </p>
      )}

      {reaction && (
        <p
          className={cn(
            "mt-1.5 text-xs leading-snug",
            TONE_STYLES[reaction.tone] ?? "text-muted",
          )}
        >
          {reaction.message}
        </p>
      )}

      {/* Hinweis auf die nächste Übung, wenn erledigt */}
      {done &&
        (nextExerciseName ? (
          <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-primary">
            <ArrowRight className="size-3.5 shrink-0" />
            Weiter zu: {nextExerciseName}
          </p>
        ) : (
          <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-success">
            <Flag className="size-3.5 shrink-0" />
            Alle Übungen geschafft — Zeit zu beenden.
          </p>
        ))}

      {!done && oneRm > 0 && (
        <p className="mt-1.5 text-[11px] text-muted">
          Geschätztes Maximum: {Math.round(oneRm)} kg
        </p>
      )}
    </div>
  );
}
