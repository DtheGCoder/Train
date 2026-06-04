"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  Sparkles,
  Play,
  Loader2,
  Stethoscope,
  X,
  CalendarDays,
  ChevronDown,
  Pencil,
  AlertTriangle,
  Trophy,
  TrendingUp,
  TrendingDown,
  Minus,
  Repeat,
  Moon,
  Info,
  History,
} from "lucide-react";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";
import {
  activateProgram,
  deactivateProgram,
  reviewProgram,
  updateProgramWeekdays,
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
export type CoachLogEntry = { at: string; day: string; kind: string; text: string };
export type ActiveProgram = {
  id: string;
  name: string;
  description: string;
  goal: string;
  level: string;
  daysPerWeek: number;
  weekdays: number[]; // ISO 1=Mo … 7=So
  cursor: number;
  cycles: number;
  schedule: string;
  benefits: string;
  days: ActiveDay[];
  coachLog: CoachLogEntry[];
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

const WD_SHORT = ["", "Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
const WD_LONG = [
  "",
  "Montag",
  "Dienstag",
  "Mittwoch",
  "Donnerstag",
  "Freitag",
  "Samstag",
  "Sonntag",
];

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

function RecommendationCard({ rec, primary }: { rec: Recommendation; primary?: boolean }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  return (
    <div
      className={cn(
        "rounded-2xl border bg-surface p-4",
        primary ? "border-primary/40" : "border-border",
      )}
    >
      {primary && (
        <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-primary">
          ★ Top-Empfehlung für dich
        </p>
      )}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-bold">{rec.name}</p>
          <p className="mt-0.5 text-xs text-muted">{rec.description}</p>
        </div>
        <span className="shrink-0 rounded-md bg-primary/15 px-2 py-0.5 text-[11px] font-semibold text-primary">
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
          className={cn("size-4 transition-transform", open && "rotate-180")}
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

const LOG_ICON: Record<string, { Icon: typeof TrendingUp; cls: string }> = {
  progress: { Icon: TrendingUp, cls: "text-success" },
  hold: { Icon: Minus, cls: "text-muted" },
  reduce: { Icon: TrendingDown, cls: "text-amber-400" },
  swap: { Icon: Repeat, cls: "text-primary" },
  deload: { Icon: Moon, cls: "text-sky-400" },
  note: { Icon: Info, cls: "text-muted" },
};

function CoachLog({ entries }: { entries: CoachLogEntry[] }) {
  const [open, setOpen] = useState(false);
  if (entries.length === 0) return null;
  const shown = open ? entries.slice(0, 20) : entries.slice(0, 3);
  return (
    <div className="rounded-2xl border border-border bg-surface p-3">
      <div className="mb-2 flex items-center gap-2">
        <History className="size-4 text-primary" />
        <p className="text-sm font-semibold">Was der Coach angepasst hat</p>
      </div>
      <ul className="space-y-2">
        {shown.map((e, i) => {
          const meta = LOG_ICON[e.kind] ?? LOG_ICON.note;
          const date = new Date(e.at).toLocaleDateString("de-DE", {
            day: "2-digit",
            month: "2-digit",
          });
          return (
            <li key={i} className="flex gap-2">
              <meta.Icon className={cn("mt-0.5 size-4 shrink-0", meta.cls)} />
              <div className="min-w-0">
                <p className="text-xs leading-snug text-foreground">{e.text}</p>
                <p className="mt-0.5 text-[10px] uppercase tracking-wide text-muted">
                  {date} · {e.day}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
      {entries.length > 3 && (
        <button
          onClick={() => setOpen((o) => !o)}
          className="mt-2 text-xs font-medium text-primary hover:underline"
        >
          {open ? "Weniger anzeigen" : `Alle ${entries.length} Anpassungen`}
        </button>
      )}
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
  const [editWd, setEditWd] = useState(false);
  const [wd, setWd] = useState<number[]>(
    program.weekdays.length ? program.weekdays : [1, 3, 5],
  );
  const [, startWd] = useTransition();

  const len = program.days.length;
  // Wochentag (ISO 1=Mo … 7=So) heute – einmalig beim Mounten bestimmt.
  const [todayIso] = useState(() => {
    const d = new Date().getDay();
    return d === 0 ? 7 : d;
  });

  // Programm-Tage den gewählten Wochentagen zuordnen (in Reihenfolge, zyklisch).
  const sorted = [...wd].sort((a, b) => a - b);
  const wdToDayIdx = new Map<number, number>();
  sorted.forEach((d, i) => wdToDayIdx.set(d, len ? i % len : 0));
  const dayFor = (weekday: number): ActiveDay | null =>
    wdToDayIdx.has(weekday) ? program.days[wdToDayIdx.get(weekday)!] ?? null : null;

  const todayDay = dayFor(todayIso);
  // Nächster Trainingstag ab heute (inkl. heute).
  let nextWeekday = 0;
  let nextDay: ActiveDay | null = null;
  for (let off = 0; off < 7; off++) {
    const w = ((todayIso - 1 + off) % 7) + 1;
    const d = dayFor(w);
    if (d) {
      nextWeekday = w;
      nextDay = d;
      break;
    }
  }

  const toggleWd = (d: number) => {
    const next = wd.includes(d)
      ? wd.filter((x) => x !== d)
      : [...wd, d].sort((a, b) => a - b);
    if (next.length === 0) return; // mindestens ein Tag
    setWd(next);
    startWd(() => updateProgramWeekdays(program.id, next));
  };

  return (
    <div className="space-y-3">
      {/* Kopf */}
      <div className="flex items-start gap-2.5 rounded-2xl border border-primary/30 bg-primary/5 p-4">
        <Sparkles className="mt-0.5 size-5 shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-primary">
            Dein Coach-Plan
          </p>
          <h2 className="text-lg font-extrabold leading-tight">{program.name}</h2>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <Badge>{GOAL_LABEL[program.goal] ?? program.goal}</Badge>
            <Badge>{LEVEL_LABEL[program.level] ?? program.level}</Badge>
            <span className="inline-flex items-center gap-1 rounded-md bg-surface px-2 py-0.5 text-[11px] text-muted">
              <Trophy className="size-3 text-primary" /> Durchlauf {program.cycles + 1}
            </span>
          </div>
        </div>
      </div>

      {/* HEUTE – das Wichtigste, groß */}
      <div className="rounded-2xl border border-border bg-surface p-4">
        {todayDay ? (
          <>
            <p className="text-[11px] font-bold uppercase tracking-wider text-primary">
              Heute · {WD_LONG[todayIso]}
            </p>
            <h3 className="mt-0.5 text-xl font-extrabold leading-tight">
              {todayDay.label}
            </h3>
            <p className="mt-0.5 text-sm text-muted">
              {todayDay.focus} · {todayDay.exerciseCount} Übungen
            </p>
            <form
              action={startWorkout.bind(null, todayDay.routineId)}
              className="mt-3"
            >
              <Button type="submit" className="w-full py-3 text-base">
                <Play className="size-5" /> Training starten
              </Button>
            </form>
          </>
        ) : (
          <>
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted">
              Heute · {WD_LONG[todayIso]}
            </p>
            <h3 className="mt-0.5 flex items-center gap-2 text-xl font-extrabold leading-tight">
              <Moon className="size-5 text-sky-400" /> Ruhetag
            </h3>
            {nextDay && (
              <>
                <p className="mt-1 text-sm text-muted">
                  Nächstes Training:{" "}
                  <span className="font-semibold text-foreground">
                    {WD_LONG[nextWeekday]} · {nextDay.label}
                  </span>
                </p>
                <form
                  action={startWorkout.bind(null, nextDay.routineId)}
                  className="mt-3"
                >
                  <Button type="submit" variant="secondary" className="w-full">
                    <Play className="size-4" /> Trotzdem jetzt starten
                  </Button>
                </form>
              </>
            )}
          </>
        )}
      </div>

      {/* WOCHENPLAN */}
      <div className="overflow-hidden rounded-2xl border border-border bg-surface">
        <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <CalendarDays className="size-4 text-primary" /> Dein Wochenplan
          </p>
          <button
            onClick={() => setEditWd((v) => !v)}
            className="text-xs font-medium text-primary hover:underline"
          >
            {editWd ? "Fertig" : "Tage anpassen"}
          </button>
        </div>
        <ul>
          {[1, 2, 3, 4, 5, 6, 7].map((w) => {
            const d = dayFor(w);
            const isToday = w === todayIso;
            return (
              <li
                key={w}
                className={cn(
                  "flex items-center gap-3 border-b border-border px-4 py-2.5 last:border-0",
                  isToday && "bg-primary/5",
                )}
              >
                <span
                  className={cn(
                    "w-8 shrink-0 text-sm font-bold",
                    isToday ? "text-primary" : "text-muted",
                  )}
                >
                  {WD_SHORT[w]}
                </span>
                <span
                  className={cn(
                    "size-2 shrink-0 rounded-full",
                    d ? "bg-primary" : "bg-border",
                  )}
                />
                {d ? (
                  <Link href={`/routines/${d.routineId}`} className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{d.label}</p>
                    <p className="truncate text-xs text-muted">{d.focus}</p>
                  </Link>
                ) : (
                  <span className="flex-1 text-sm text-muted">Frei</span>
                )}
                {isToday && (
                  <span className="shrink-0 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase text-primary-foreground">
                    Heute
                  </span>
                )}
              </li>
            );
          })}
        </ul>
        {editWd && (
          <div className="border-t border-border px-4 py-3">
            <p className="mb-2 text-xs text-muted">
              An welchen Wochentagen trainierst du?
            </p>
            <div className="flex gap-1.5">
              {[1, 2, 3, 4, 5, 6, 7].map((w) => (
                <button
                  key={w}
                  onClick={() => toggleWd(w)}
                  className={cn(
                    "flex-1 rounded-lg py-2 text-xs font-bold transition-colors",
                    wd.includes(w)
                      ? "bg-primary text-primary-foreground"
                      : "bg-surface-2 text-muted hover:text-foreground",
                  )}
                >
                  {WD_SHORT[w]}
                </button>
              ))}
            </div>
            <p className="mt-2 text-[11px] text-muted">
              Der Coach verteilt die {len} Trainingstage auf deine gewählten
              Wochentage.
            </p>
          </div>
        )}
      </div>

      {/* Coach-Bewertung */}
      {review && (
        <div className="rounded-2xl border border-border bg-surface p-3">
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

      <CoachLog entries={program.coachLog} />

      {/* Aktionen */}
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
          <Repeat className="size-4" /> Plan wechseln
        </Button>
      </div>
      <button
        onClick={() => {
          if (
            confirm("Coach-Plan wirklich beenden? Dein Verlauf bleibt erhalten.")
          )
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
    <div className="space-y-3">
      {activeProgram && (
        <ActiveProgramView
          program={activeProgram}
          onSwitch={() => setShowRecs((s) => !s)}
        />
      )}

      {(!activeProgram || showRecs) && (
        <div className="space-y-3">
          {activeProgram && (
            <h3 className="pt-1 text-sm font-semibold text-muted">
              Anderen Plan wählen
            </h3>
          )}
          {!activeProgram && (
            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
              <p className="flex items-center gap-2 font-semibold text-primary">
                <Sparkles className="size-5" /> Lass dir einen Plan erstellen
              </p>
              <p className="mt-1 text-sm text-muted">
                Der Coach baut dir einen mehrtägigen Trainingsplan, der zu deinem
                Ziel passt – mit festem Wochen-Rhythmus und automatischer Anpassung
                an deinen Fortschritt.
              </p>
            </div>
          )}
          <ProfileGaps gaps={gaps} />
          {recommendations.map((rec, i) => (
            <RecommendationCard key={rec.key} rec={rec} primary={!activeProgram && i === 0} />
          ))}
        </div>
      )}
    </div>
  );
}
