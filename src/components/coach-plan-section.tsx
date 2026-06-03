"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  Sparkles,
  Play,
  CheckCircle2,
  Circle,
  CircleDot,
  Loader2,
  Stethoscope,
  X,
  CalendarDays,
  ChevronDown,
  Pencil,
  AlertTriangle,
  Trophy,
} from "lucide-react";
import { Button } from "@/components/ui";
import {
  activateProgram,
  deactivateProgram,
  reviewProgram,
  startWorkout,
} from "@/lib/actions";
import {
  GOAL_LABEL,
  LEVEL_LABEL,
  LOCATION_LABEL,
} from "@/components/routine-catalog";

export type ActiveDay = {
  id: string;
  label: string;
  focus: string;
  routineId: string;
  exerciseCount: number;
};
export type ActiveProgram = {
  id: string;
  name: string;
  description: string;
  goal: string;
  level: string;
  daysPerWeek: number;
  cursor: number;
  cycles: number;
  schedule: string;
  benefits: string;
  days: ActiveDay[];
};
export type Recommendation = {
  key: string;
  name: string;
  description: string;
  goal: string;
  level: string;
  location: string;
  daysPerWeek: number;
  schedule: string;
  benefits: string;
  reasons: string[];
  dayLabels: string[];
};
export type Gap = { field: string; label: string; why: string };

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-md bg-surface-2 px-2 py-0.5 text-[11px] text-muted">
      {children}
    </span>
  );
}

function ProfileGaps({ gaps }: { gaps: Gap[] }) {
  if (gaps.length === 0) return null;
  return (
    <div className="rounded-xl border border-amber-400/30 bg-amber-400/5 p-3">
      <div className="mb-1.5 flex items-center gap-2">
        <AlertTriangle className="size-4 text-amber-400" />
        <p className="text-sm font-semibold text-amber-400">
          Für einen sicheren Plan fehlen noch Angaben
        </p>
      </div>
      <ul className="mb-2 space-y-1">
        {gaps.map((g) => (
          <li key={g.field} className="flex gap-2 text-xs leading-snug text-muted">
            <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-amber-400/70" />
            <span>
              <span className="font-medium text-foreground">{g.label}</span> —{" "}
              {g.why}
            </span>
          </li>
        ))}
      </ul>
      <Link
        href="/profile"
        className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
      >
        <Pencil className="size-3.5" /> Im Profil eintragen
      </Link>
    </div>
  );
}

function RecommendationCard({ rec }: { rec: Recommendation }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold">{rec.name}</p>
          <p className="mt-0.5 text-xs text-muted">{rec.description}</p>
        </div>
        <span className="shrink-0 rounded-md bg-primary/15 px-2 py-0.5 text-[11px] font-medium text-primary">
          {rec.daysPerWeek}×/Woche
        </span>
      </div>

      {rec.reasons.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {rec.reasons.map((r, i) => (
            <span
              key={i}
              className="rounded-full bg-success/10 px-2 py-0.5 text-[11px] text-success"
            >
              ✓ {r}
            </span>
          ))}
        </div>
      )}

      <div className="mt-2 flex flex-wrap gap-1.5">
        <Badge>{GOAL_LABEL[rec.goal] ?? rec.goal}</Badge>
        <Badge>{LEVEL_LABEL[rec.level] ?? rec.level}</Badge>
        <Badge>{LOCATION_LABEL[rec.location] ?? rec.location}</Badge>
      </div>

      <button
        onClick={() => setOpen((o) => !o)}
        className="mt-3 flex w-full items-center justify-between rounded-lg bg-surface-2 px-3 py-2 text-xs text-muted hover:text-foreground"
      >
        <span>Details & Tagesaufbau</span>
        <ChevronDown
          className={`size-4 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="mt-2 space-y-2">
          <p className="text-xs leading-snug text-muted">{rec.benefits}</p>
          <div className="flex items-start gap-2 rounded-lg bg-surface-2 px-3 py-2 text-xs text-muted">
            <CalendarDays className="mt-0.5 size-3.5 shrink-0" />
            <span>{rec.schedule}</span>
          </div>
          <ol className="space-y-1">
            {rec.dayLabels.map((d, i) => (
              <li key={i} className="flex gap-2 text-xs text-muted">
                <span className="font-medium text-foreground">{i + 1}.</span>
                {d}
              </li>
            ))}
          </ol>
        </div>
      )}

      <Button
        className="mt-3 w-full"
        onClick={() => start(async () => void (await activateProgram(rec.key)))}
        disabled={pending}
      >
        {pending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Sparkles className="size-4" />
        )}
        Diesen Plan starten
      </Button>
    </div>
  );
}

function ActiveProgramView({
  program,
  onSwitch,
}: {
  program: ActiveProgram;
  onSwitch: () => void;
}) {
  const [pending, start] = useTransition();
  const [review, setReview] = useState<string[] | null>(null);
  const [reviewing, startReview] = useTransition();
  const len = program.days.length;
  const cursor = ((program.cursor % len) + len) % len;

  return (
    <div className="space-y-3 rounded-2xl border border-primary/30 bg-primary/5 p-4">
      <div className="flex items-start gap-2">
        <Sparkles className="mt-0.5 size-5 shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">
            Dein Coach-Plan
          </p>
          <h2 className="text-lg font-bold leading-tight">{program.name}</h2>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-surface px-2 py-1 text-[11px] text-muted">
          <Trophy className="size-3.5 text-primary" />
          Durchlauf {program.cycles + 1}
        </span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <Badge>{GOAL_LABEL[program.goal] ?? program.goal}</Badge>
        <Badge>{LEVEL_LABEL[program.level] ?? program.level}</Badge>
        <Badge>{program.daysPerWeek}×/Woche</Badge>
      </div>

      {/* Tages-Stepper */}
      <ol className="space-y-2">
        {program.days.map((d, i) => {
          const done = i < cursor;
          const current = i === cursor;
          return (
            <li
              key={d.id}
              className={`rounded-xl border p-3 ${
                current
                  ? "border-primary bg-surface"
                  : "border-border bg-surface/60"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="shrink-0">
                  {done ? (
                    <CheckCircle2 className="size-5 text-success" />
                  ) : current ? (
                    <CircleDot className="size-5 text-primary" />
                  ) : (
                    <Circle className="size-5 text-muted" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p
                      className={`truncate font-medium ${done ? "text-muted line-through" : ""}`}
                    >
                      {d.label}
                    </p>
                    {current && (
                      <span className="shrink-0 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase text-primary-foreground">
                        Als Nächstes
                      </span>
                    )}
                  </div>
                  <p className="truncate text-xs text-muted">
                    {d.focus} · {d.exerciseCount} Übungen
                  </p>
                </div>
                <Link
                  href={`/routines/${d.routineId}`}
                  className="shrink-0 rounded-lg p-2 text-muted hover:text-foreground"
                  aria-label="Tag anpassen"
                >
                  <Pencil className="size-4" />
                </Link>
              </div>
              {current && (
                <form
                  action={startWorkout.bind(null, d.routineId)}
                  className="mt-2"
                >
                  <Button type="submit" className="w-full">
                    <Play className="size-4" /> Diesen Tag starten
                  </Button>
                </form>
              )}
            </li>
          );
        })}
      </ol>

      {/* Coach-Bewertung */}
      {review && (
        <div className="rounded-xl border border-border bg-surface p-3">
          <div className="mb-2 flex items-center gap-2">
            <Stethoscope className="size-4 text-primary" />
            <p className="text-sm font-semibold">Coach-Bewertung</p>
            <button
              onClick={() => setReview(null)}
              className="ml-auto rounded p-1 text-muted hover:text-foreground"
              aria-label="Schließen"
            >
              <X className="size-4" />
            </button>
          </div>
          <ul className="space-y-1.5">
            {review.map((m, i) => (
              <li key={i} className="flex gap-2 text-xs leading-snug text-muted">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                <span>{m}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <Button
          variant="secondary"
          onClick={() =>
            startReview(async () => {
              const res = await reviewProgram(program.id);
              setReview(res.messages);
            })
          }
          disabled={reviewing}
        >
          {reviewing ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Stethoscope className="size-4" />
          )}
          Coach bewerten
        </Button>
        <Button variant="secondary" onClick={onSwitch}>
          Plan wechseln
        </Button>
      </div>
      <button
        onClick={() => {
          if (confirm("Coach-Plan wirklich beenden? Dein Verlauf bleibt erhalten."))
            start(async () => void (await deactivateProgram(program.id)));
        }}
        disabled={pending}
        className="w-full text-center text-xs text-muted hover:text-danger"
      >
        Plan beenden
      </button>
    </div>
  );
}

export function CoachPlanSection({
  activeProgram,
  recommendations,
  gaps,
}: {
  activeProgram: ActiveProgram | null;
  recommendations: Recommendation[];
  gaps: Gap[];
}) {
  const [showRecs, setShowRecs] = useState(!activeProgram);

  return (
    <section className="space-y-3">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-muted">
        <Sparkles className="size-4 text-primary" /> Coach-Plan
      </h2>

      {activeProgram && (
        <ActiveProgramView
          program={activeProgram}
          onSwitch={() => setShowRecs((s) => !s)}
        />
      )}

      {(!activeProgram || showRecs) && (
        <div className="space-y-3">
          {!activeProgram && (
            <p className="text-sm text-muted">
              Lass dir vom Coach einen mehrtägigen Plan zusammenstellen, der zu
              deinem Ziel passt – Tag für Tag, mit automatischer Anpassung an
              deinen Fortschritt.
            </p>
          )}
          <ProfileGaps gaps={gaps} />
          {recommendations.map((rec) => (
            <RecommendationCard key={rec.key} rec={rec} />
          ))}
        </div>
      )}
    </section>
  );
}
