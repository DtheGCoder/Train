"use client";

import { Sparkles, Zap } from "lucide-react";
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
};

export function CoachCard({
  rec,
  reaction,
  oneRm,
  onLimitTest,
}: {
  rec: SetRecommendation | null;
  reaction: CoachReaction;
  oneRm: number;
  onLimitTest: () => void;
}) {
  return (
    <div className="mx-2 mb-1 rounded-lg border border-primary/25 bg-primary/5 px-3 py-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <Sparkles className="size-4 shrink-0 text-primary" />
          {rec && rec.hasBaseline ? (
            <p className="truncate text-sm">
              <span className="text-muted">Nächster Satz: </span>
              <span className="font-bold tabular-nums">
                {rec.weight} kg × {rec.reps}
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
        </div>
        {rec && rec.hasBaseline && (
          <button
            type="button"
            onClick={onLimitTest}
            className="flex shrink-0 items-center gap-1 rounded-md bg-primary/15 px-2.5 py-1.5 text-xs font-semibold text-primary active:scale-95"
          >
            <Zap className="size-3.5" /> Limit
          </button>
        )}
      </div>

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

      {oneRm > 0 && (
        <p className="mt-1.5 text-[11px] text-muted">
          Geschätztes Maximum: {Math.round(oneRm)} kg
        </p>
      )}
    </div>
  );
}
