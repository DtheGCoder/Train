"use client";

import { useState } from "react";
import {
  Sparkles,
  Zap,
  CircleCheckBig,
  ArrowRight,
  Flag,
  Flame,
  HelpCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { SetRecommendation, WarmupSet } from "@/lib/coach";

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

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-md bg-surface-2 px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-muted">
      {children}
    </span>
  );
}

export function CoachCard({
  rec,
  reaction,
  oneRm,
  onLimitTest,
  done = false,
  nextExerciseName = null,
  setsDone = 0,
  setsPlanned = 0,
  warmup = [],
  tempo,
}: {
  rec: SetRecommendation | null;
  reaction: CoachReaction;
  oneRm: number;
  onLimitTest: () => void;
  done?: boolean;
  nextExerciseName?: string | null;
  setsDone?: number;
  setsPlanned?: number;
  // Aufwärm-Rampe (nur für den ersten Arbeitssatz sinnvoll befüllt).
  warmup?: WarmupSet[];
  // Technik-/Tempo-Hinweis.
  tempo?: string;
}) {
  const [info, setInfo] = useState(false);
  const repText =
    rec && (rec.repLow === rec.repHigh ? `${rec.reps}` : `${rec.repLow}–${rec.repHigh}`);
  const pct = setsPlanned > 0 ? Math.min(100, (setsDone / setsPlanned) * 100) : 0;

  return (
    <div
      className={cn(
        "mx-2 mb-1 rounded-xl border px-3 py-2.5",
        done ? "border-success/30 bg-success/5" : "border-primary/25 bg-primary/5",
      )}
    >
      {/* Kopfzeile */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          {done ? (
            <CircleCheckBig className="size-4 shrink-0 text-success" />
          ) : (
            <Sparkles className="size-4 shrink-0 text-primary" />
          )}
          <span
            className={cn(
              "text-[11px] font-semibold uppercase tracking-wide",
              done ? "text-success" : "text-primary",
            )}
          >
            {done ? "Übung erledigt" : "Coach"}
          </span>
        </div>
        {!done && rec && rec.hasBaseline && (
          <button
            type="button"
            onClick={onLimitTest}
            className="flex shrink-0 items-center gap-1 rounded-md bg-primary/15 px-2.5 py-1 text-xs font-semibold text-primary active:scale-95"
          >
            <Zap className="size-3.5" /> Limit-Test
          </button>
        )}
      </div>

      {/* Empfehlung */}
      {!done &&
        (rec && rec.hasBaseline ? (
          <div className="mt-1.5">
            <p className="text-[11px] text-muted">Nächster Satz</p>
            <p className="text-lg font-bold leading-tight tabular-nums">
              {rec.weight} kg
              <span className="ml-1 font-semibold text-muted">× {repText}</span>
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              <Chip>~{rec.intensityPct}% vom Max</Chip>
              <Chip>{rec.rir} Wdh Reserve</Chip>
              <button
                type="button"
                onClick={() => setInfo((v) => !v)}
                aria-label="Werte erklären"
                className="flex items-center gap-0.5 text-[11px] text-muted hover:text-foreground"
              >
                <HelpCircle className="size-3.5" /> Was heißt das?
              </button>
            </div>
          </div>
        ) : (
          <p className="mt-1.5 text-sm text-muted">
            Trag deinen ersten Satz ein — dann plane ich Gewicht & Wiederholungen
            für dich.
          </p>
        ))}

      {/* Erklär-Box (einklappbar) */}
      {info && (
        <div className="mt-2 space-y-1 rounded-lg bg-surface-2 px-2.5 py-2 text-[11px] leading-relaxed text-muted">
          <p>
            <span className="font-semibold text-foreground">% vom Max:</span>{" "}
            Anteil deines geschätzten Maximalgewichts (1RM) für diesen Satz.
          </p>
          <p>
            <span className="font-semibold text-foreground">Wdh Reserve (RIR):</span>{" "}
            wie viele saubere Wiederholungen am Satzende noch möglich sein
            sollten. 2 RIR = 2 in der Hinterhand lassen.
          </p>
          <p>
            <span className="font-semibold text-foreground">1RM:</span> dein
            geschätztes Einmal-Maximum, aus deinen besten Sätzen berechnet (RPE
            wird mit eingerechnet).
          </p>
        </div>
      )}

      {/* Fortschrittsbalken */}
      {!done && setsPlanned > 0 && (
        <div className="mt-2">
          <div className="flex justify-between text-[11px] text-muted">
            <span>
              Satz {Math.min(setsDone + 1, setsPlanned)} von {setsPlanned}
            </span>
            <span>{setsDone}/{setsPlanned}</span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-2">
            <div
              className="h-full rounded-full bg-primary transition-all duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}

      {/* Aufwärm-Rampe (erster Arbeitssatz) */}
      {!done && warmup.length > 0 && (
        <div className="mt-2 flex items-start gap-1.5 rounded-lg bg-surface-2 px-2.5 py-1.5 text-[11px] text-muted">
          <Flame className="mt-0.5 size-3.5 shrink-0 text-amber-400" />
          <span>
            <span className="font-semibold text-foreground">Aufwärmen:</span>{" "}
            {warmup.map((w) => `${w.weight} kg × ${w.reps}`).join(" · ")}
          </span>
        </div>
      )}

      {/* Technik-/Tempo-Hinweis */}
      {!done && tempo && (
        <p className="mt-2 text-[11px] leading-snug text-muted">
          <span className="font-semibold text-foreground">Technik:</span> {tempo}
        </p>
      )}

      {/* Coach-Reaktion */}
      {reaction && (
        <p
          className={cn(
            "mt-2 text-xs leading-snug",
            TONE_STYLES[reaction.tone] ?? "text-muted",
          )}
        >
          {reaction.message}
        </p>
      )}

      {/* Nächste Übung / Abschluss */}
      {done &&
        (nextExerciseName ? (
          <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-primary">
            <ArrowRight className="size-3.5 shrink-0" />
            Weiter zu: {nextExerciseName}
            {setsPlanned > 0 && (
              <span className="font-normal text-muted">
                · {setsDone} {setsDone === 1 ? "Satz" : "Sätze"} geschafft
              </span>
            )}
          </p>
        ) : (
          <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-success">
            <Flag className="size-3.5 shrink-0" />
            Alle Übungen geschafft — Zeit zu beenden.
          </p>
        ))}

      {!done && oneRm > 0 && (
        <p className="mt-2 text-[11px] text-muted">
          Geschätztes Maximum (1RM): {Math.round(oneRm)} kg
        </p>
      )}
    </div>
  );
}
