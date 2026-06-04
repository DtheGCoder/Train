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
  ChevronDown,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  Trophy,
  Info,
  Timer,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { SetRecommendation, WarmupSet } from "@/lib/coach";

export type CoachReaction = { tone: string; message: string } | null;

// Pro Ton: Icon, Kurz-Label und Farben – damit man auf einen Blick sieht, was
// der Coach gerade sagt (mehr drücken / halten / zurücknehmen / geschafft …).
const TONE: Record<
  string,
  { Icon: typeof TrendingUp; label: string; text: string; bg: string; border: string }
> = {
  push: { Icon: TrendingUp, label: "Leg nach", text: "text-primary", bg: "bg-primary/10", border: "border-primary/30" },
  bold: { Icon: TrendingUp, label: "Trau dich", text: "text-primary", bg: "bg-primary/10", border: "border-primary/30" },
  limit: { Icon: Trophy, label: "Limit-Test", text: "text-success", bg: "bg-success/10", border: "border-success/30" },
  hold: { Icon: Minus, label: "Halten", text: "text-foreground", bg: "bg-surface-2", border: "border-border" },
  back: { Icon: TrendingDown, label: "Zurück", text: "text-amber-400", bg: "bg-amber-400/10", border: "border-amber-400/30" },
  caution: { Icon: AlertTriangle, label: "Vorsicht", text: "text-danger", bg: "bg-danger/10", border: "border-danger/30" },
  done: { Icon: CircleCheckBig, label: "Geschafft", text: "text-success", bg: "bg-success/10", border: "border-success/30" },
  info: { Icon: Info, label: "Hinweis", text: "text-muted", bg: "bg-surface-2", border: "border-border" },
};

function toneMeta(tone: string) {
  return TONE[tone] ?? TONE.info;
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
  collapsed = false,
  onToggleCollapsed,
}: {
  rec: SetRecommendation | null;
  reaction: CoachReaction;
  oneRm: number;
  onLimitTest: () => void;
  done?: boolean;
  nextExerciseName?: string | null;
  setsDone?: number;
  setsPlanned?: number;
  warmup?: WarmupSet[];
  tempo?: string;
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
}) {
  const [info, setInfo] = useState(false);
  const repText =
    rec && (rec.repLow === rec.repHigh ? `${rec.reps}` : `${rec.repLow}–${rec.repHigh}`);
  const hasRec = !!rec && rec.hasBaseline;
  const pct = setsPlanned > 0 ? Math.min(100, (setsDone / setsPlanned) * 100) : 0;
  const accent = done ? "border-success/40" : "border-primary/30";

  // ---------- Eingeklappt: eine klare Zeile ----------
  if (collapsed) {
    const summary = done
      ? "Übung erledigt"
      : hasRec
        ? `${rec!.weight} kg × ${repText}`
        : "Ersten Satz eintragen";
    return (
      <div className={cn("mx-2 mb-1.5 rounded-xl border bg-surface", accent)}>
        <button
          type="button"
          onClick={onToggleCollapsed}
          aria-expanded={false}
          className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left"
        >
          {done ? (
            <CircleCheckBig className="size-5 shrink-0 text-success" />
          ) : (
            <Sparkles className="size-5 shrink-0 text-primary" />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-primary">
              Coach
            </p>
            <p className="truncate text-base font-bold tabular-nums leading-tight">
              {summary}
            </p>
          </div>
          {!done && setsPlanned > 0 && (
            <span className="shrink-0 rounded-full bg-surface-2 px-2 py-0.5 text-xs font-semibold tabular-nums text-muted">
              {setsDone}/{setsPlanned}
            </span>
          )}
          <ChevronDown className="size-4 shrink-0 text-muted" />
        </button>
      </div>
    );
  }

  // ---------- Ausgeklappt ----------
  return (
    <div className={cn("mx-2 mb-1.5 overflow-hidden rounded-2xl border bg-surface", accent)}>
      {/* Kopfzeile */}
      <div className="flex items-center justify-between gap-2 px-3.5 pt-3">
        <div className="flex items-center gap-2">
          {done ? (
            <CircleCheckBig className="size-5 text-success" />
          ) : (
            <Sparkles className="size-5 text-primary" />
          )}
          <span className="text-sm font-bold tracking-tight">
            {done ? "Übung erledigt" : "Coach"}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {!done && setsPlanned > 0 && (
            <span className="rounded-full bg-surface-2 px-2.5 py-1 text-xs font-semibold tabular-nums text-muted">
              Satz {Math.min(setsDone + 1, setsPlanned)}/{setsPlanned}
            </span>
          )}
          {onToggleCollapsed && (
            <button
              type="button"
              onClick={onToggleCollapsed}
              aria-label="Coach einklappen"
              className="flex size-8 items-center justify-center rounded-lg text-muted hover:bg-surface-2 hover:text-foreground active:scale-95"
            >
              <ChevronDown className="size-4 rotate-180" />
            </button>
          )}
        </div>
      </div>

      {/* Fortschrittsbalken */}
      {!done && setsPlanned > 0 && (
        <div className="mt-2 px-3.5">
          <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
            <div
              className="h-full rounded-full bg-primary transition-all duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}

      {/* Empfehlung „Nächster Satz" – das Wichtigste, groß */}
      {!done && (
        <div className="px-3.5 pt-2.5">
          {hasRec ? (
            <div className="flex items-end justify-between gap-3 rounded-xl bg-surface-2 px-3.5 py-3">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted">
                  Jetzt dran
                </p>
                <p className="mt-0.5 text-3xl font-extrabold leading-none tabular-nums">
                  {rec!.weight}
                  <span className="ml-1 text-lg font-bold text-muted">kg</span>
                  <span className="mx-1.5 text-muted">×</span>
                  {repText}
                  <span className="ml-1 text-lg font-bold text-muted">Wdh</span>
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <span className="rounded-md bg-primary/15 px-2 py-0.5 text-xs font-semibold tabular-nums text-primary">
                  ~{rec!.intensityPct}% Max
                </span>
                <span className="rounded-md bg-surface px-2 py-0.5 text-xs font-semibold tabular-nums text-muted">
                  {rec!.rir} Wdh Reserve
                </span>
              </div>
            </div>
          ) : (
            <div className="rounded-xl bg-surface-2 px-3.5 py-3">
              <p className="text-sm leading-snug text-muted">
                Trag deinen <span className="font-semibold text-foreground">ersten Satz</span> ein —
                dann plane ich Gewicht & Wiederholungen für dich.
              </p>
            </div>
          )}

          {hasRec && (
            <button
              type="button"
              onClick={() => setInfo((v) => !v)}
              className="mt-1.5 flex items-center gap-1 text-xs text-muted hover:text-foreground"
            >
              <HelpCircle className="size-3.5" /> Was bedeuten die Werte?
            </button>
          )}
        </div>
      )}

      {/* Erklär-Box */}
      {info && !done && (
        <div className="mx-3.5 mt-2 space-y-1.5 rounded-lg bg-surface-2 px-3 py-2.5 text-xs leading-relaxed text-muted">
          <p>
            <span className="font-semibold text-foreground">% Max:</span> Anteil
            deines geschätzten Maximalgewichts (1RM) für diesen Satz.
          </p>
          <p>
            <span className="font-semibold text-foreground">Wdh Reserve (RIR):</span>{" "}
            wie viele saubere Wiederholungen am Satzende noch gehen sollten – 2 =
            zwei in der Hinterhand lassen.
          </p>
          {oneRm > 0 && (
            <p>
              <span className="font-semibold text-foreground">1RM:</span> dein
              geschätztes Einmal-Maximum ≈ {Math.round(oneRm)} kg.
            </p>
          )}
        </div>
      )}

      {/* Coach-Reaktion – farbcodierter Status, klar lesbar */}
      {reaction && (
        <div className="px-3.5 pt-2.5">
          {(() => {
            const m = toneMeta(reaction.tone);
            return (
              <div className={cn("flex items-start gap-2.5 rounded-xl border px-3 py-2.5", m.bg, m.border)}>
                <m.Icon className={cn("mt-0.5 size-5 shrink-0", m.text)} />
                <div className="min-w-0">
                  <p className={cn("text-xs font-bold uppercase tracking-wide", m.text)}>
                    {m.label}
                  </p>
                  <p className="mt-0.5 text-sm leading-snug text-foreground">
                    {reaction.message}
                  </p>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Aufwärmen & Technik – kompakt, aber lesbar */}
      {!done && (warmup.length > 0 || tempo) && (
        <div className="space-y-1.5 px-3.5 pt-2.5">
          {warmup.length > 0 && (
            <div className="flex items-start gap-2 rounded-lg bg-surface-2 px-3 py-2 text-sm">
              <Flame className="mt-0.5 size-4 shrink-0 text-amber-400" />
              <span className="text-muted">
                <span className="font-semibold text-foreground">Aufwärmen:</span>{" "}
                {warmup.map((w) => `${w.weight} kg × ${w.reps}`).join(" · ")}
              </span>
            </div>
          )}
          {tempo && (
            <div className="flex items-start gap-2 rounded-lg bg-surface-2 px-3 py-2 text-sm">
              <Timer className="mt-0.5 size-4 shrink-0 text-muted" />
              <span className="text-muted">
                <span className="font-semibold text-foreground">Technik:</span>{" "}
                {tempo}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Limit-Test – klare Aktion */}
      {!done && hasRec && (
        <div className="px-3.5 pt-2.5">
          <button
            type="button"
            onClick={onLimitTest}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-primary/30 bg-primary/10 py-2 text-sm font-semibold text-primary active:scale-[0.99]"
          >
            <Zap className="size-4" /> Limit-Test – wie viel geht heute?
          </button>
        </div>
      )}

      {/* Abschluss / nächste Übung */}
      {done && (
        <div className="px-3.5 pt-2.5">
          {nextExerciseName ? (
            <div className="flex items-center gap-2.5 rounded-xl bg-primary/10 px-3 py-2.5">
              <ArrowRight className="size-5 shrink-0 text-primary" />
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted">
                  {setsDone} {setsDone === 1 ? "Satz" : "Sätze"} geschafft · weiter mit
                </p>
                <p className="truncate font-bold text-primary">{nextExerciseName}</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2.5 rounded-xl bg-success/10 px-3 py-2.5">
              <Flag className="size-5 shrink-0 text-success" />
              <p className="font-bold text-success">
                Alles geschafft — Zeit, das Workout zu beenden.
              </p>
            </div>
          )}
        </div>
      )}

      <div className="h-3" />
    </div>
  );
}
