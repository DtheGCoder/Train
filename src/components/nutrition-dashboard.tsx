"use client";

import { useMemo, useState, useTransition } from "react";
import {
  Flame,
  Beef,
  Wheat,
  Droplet,
  Droplets,
  Check,
  Plus,
  Minus,
  Pill,
  Sparkles,
  Loader2,
  RotateCcw,
  Lightbulb,
  X,
  Search,
  Trash2,
  Utensils,
  Lock,
} from "lucide-react";
import { Card } from "@/components/ui";
import { cn } from "@/lib/utils";
import {
  addFoodEntry,
  removeFoodEntry,
  addWater,
  toggleNutritionItem,
  resetNutritionDay,
} from "@/lib/actions";
import {
  FOODS,
  scaleFood,
  defaultQty,
  type Food,
  type NutritionTargets,
  type PlanItem,
  type Macros,
  type FoodCoach,
} from "@/lib/coach-nutrition";

type Entry = { id: string } & { name: string } & Macros;

function Ring({
  value,
  target,
  label,
  color,
  Icon,
  size = 96,
}: {
  value: number;
  target: number;
  label: string;
  color: string;
  Icon: typeof Flame;
  size?: number;
}) {
  const r = (size - 12) / 2;
  const circ = 2 * Math.PI * r;
  const pct = target > 0 ? Math.min(1, value / target) : 0;
  const over = value > target * 1.05;
  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-2)" strokeWidth={8} />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={over ? "var(--danger)" : color}
            strokeWidth={8}
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={circ * (1 - pct)}
            style={{ transition: "stroke-dashoffset 600ms cubic-bezier(.4,0,.2,1)" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <Icon className="size-4" style={{ color }} />
          <span className="mt-0.5 text-base font-extrabold tabular-nums leading-none">
            {Math.round(value)}
          </span>
          <span className="text-[10px] text-muted">/ {Math.round(target)}</span>
        </div>
      </div>
      <p className="mt-1.5 text-xs font-medium">{label}</p>
    </div>
  );
}

function MacroBar({
  value,
  target,
  label,
  color,
  Icon,
}: {
  value: number;
  target: number;
  label: string;
  color: string;
  Icon: typeof Wheat;
}) {
  const pct = target > 0 ? Math.min(100, (value / target) * 100) : 0;
  return (
    <div className="flex-1">
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="flex items-center gap-1 font-medium">
          <Icon className="size-3.5" style={{ color }} /> {label}
        </span>
        <span className="tabular-nums text-muted">
          {Math.round(value)}/{Math.round(target)} g
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-surface-2">
        <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

export function NutritionDashboard({
  date,
  targets,
  consumed,
  entries,
  coach,
  supplements,
  checkedSupps,
  waterMl,
  tips,
}: {
  date: string;
  targets: NutritionTargets;
  consumed: Macros;
  entries: Entry[];
  coach: FoodCoach;
  supplements: PlanItem[];
  checkedSupps: string[];
  waterMl: number;
  tips: string[];
}) {
  const [, start] = useTransition();
  const [busy, setBusy] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const checked = new Set(checkedSupps);

  const act = (fn: () => Promise<unknown>) => {
    setBusy(true);
    start(async () => {
      await fn();
      setBusy(false);
    });
  };

  const waterGoalL = (targets.waterMl / 1000).toFixed(1);
  const waterL = (waterMl / 1000).toFixed(1);
  const waterPct = Math.min(100, (waterMl / targets.waterMl) * 100);

  return (
    <div className={cn("space-y-4", busy && "pointer-events-none opacity-90")}>
      {/* Status */}
      <div
        className={cn(
          "rounded-2xl border p-3",
          targets.isTrainingDay ? "border-primary/30 bg-primary/5" : "border-border bg-surface",
        )}
      >
        <p className="flex items-center gap-2 text-sm font-semibold">
          <Sparkles className="size-4 text-primary" />
          {targets.isTrainingDay ? "Trainingstag" : "Ruhetag"} · {targets.goalLabel}
        </p>
        <p className="mt-1 text-xs leading-snug text-muted">{targets.note}</p>
      </div>

      {/* Ringe + Makros */}
      <Card className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          <Ring value={consumed.kcal} target={targets.kcal} label="Kalorien" color="var(--primary)" Icon={Flame} />
          <Ring value={consumed.protein} target={targets.protein} label="Protein" color="#22c55e" Icon={Beef} />
        </div>
        <div className="flex gap-4">
          <MacroBar value={consumed.carbs} target={targets.carbs} label="Kohlenhydrate" color="#f59e0b" Icon={Wheat} />
          <MacroBar value={consumed.fat} target={targets.fat} label="Fett" color="#a855f7" Icon={Droplet} />
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground active:scale-[0.99]"
        >
          <Plus className="size-5" /> Essen eintragen
        </button>
      </Card>

      {/* Coach-Empfehlung */}
      <Card className="space-y-3 border-primary/30 bg-primary/5">
        <div className="flex items-center gap-2">
          <Lightbulb className="size-5 text-primary" />
          <div className="min-w-0">
            <p className="font-semibold leading-tight">{coach.headline}</p>
          </div>
        </div>
        <p className="text-sm leading-snug text-muted">{coach.detail}</p>
        {coach.foods.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {coach.foods.map((f) => (
              <button
                key={f.food.id}
                onClick={() =>
                  act(() =>
                    addFoodEntry(date, {
                      name: `${f.food.name} (${f.qty} ${f.food.unit})`,
                      ...f.macros,
                    }),
                  )
                }
                className="group flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-left transition-colors hover:border-primary/40 active:scale-95"
              >
                <Plus className="size-4 text-primary" />
                <span>
                  <span className="block text-sm font-medium leading-tight">
                    {f.food.name}
                    <span className="text-muted"> · {f.qty} {f.food.unit}</span>
                  </span>
                  <span className="block text-[11px] text-muted">
                    {f.macros.kcal} kcal · {f.macros.protein} g P · {f.reason}
                  </span>
                </span>
              </button>
            ))}
          </div>
        )}
        {coach.meal && (
          <button
            onClick={() =>
              act(() =>
                addFoodEntry(date, { name: coach.meal!.name, ...coach.meal!.macros }),
              )
            }
            className="flex w-full items-center gap-3 rounded-xl border border-primary/30 bg-surface px-3 py-2.5 text-left transition-colors hover:bg-primary/5 active:scale-[0.99]"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/15">
              <Utensils className="size-5 text-primary" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold leading-tight">
                Mahlzeit-Idee: {coach.meal.name}
              </span>
              <span className="block truncate text-xs text-muted">{coach.meal.desc}</span>
              <span className="block text-[11px] text-muted">
                {coach.meal.macros.kcal} kcal · {coach.meal.macros.protein} g Protein
              </span>
            </span>
            <Plus className="size-5 shrink-0 text-primary" />
          </button>
        )}
      </Card>

      {/* Heute gegessen */}
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-muted">
            <Utensils className="size-4 text-primary" /> Heute gegessen
          </h2>
          {entries.length > 0 && (
            <span className="text-xs text-muted">{entries.length} Einträge</span>
          )}
        </div>
        {entries.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border py-6 text-center text-sm text-muted">
            Noch nichts eingetragen. Tippe „Essen eintragen“ oder eine Empfehlung.
          </p>
        ) : (
          <ul className="space-y-2">
            {entries.map((e) => (
              <li
                key={e.id}
                className="flex items-center gap-3 rounded-xl border border-border bg-surface px-3 py-2.5"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{e.name}</p>
                  <p className="text-xs text-muted">
                    {Math.round(e.kcal)} kcal · {Math.round(e.protein)} g P ·{" "}
                    {Math.round(e.carbs)} g K · {Math.round(e.fat)} g F
                  </p>
                </div>
                <button
                  onClick={() => act(() => removeFoodEntry(e.id))}
                  className="rounded-lg p-2 text-muted hover:text-danger"
                  aria-label="Eintrag entfernen"
                >
                  <Trash2 className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Wasser */}
      <Card className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="flex items-center gap-2 font-semibold">
            <Droplets className="size-5 text-sky-400" /> Wasser
          </p>
          <p className="text-sm tabular-nums text-muted">
            <span className="font-bold text-foreground">{waterL} l</span> / {waterGoalL} l
          </p>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-surface-2">
          <div className="h-full rounded-full bg-sky-400 transition-[width] duration-500" style={{ width: `${waterPct}%` }} />
        </div>
        <div className="flex gap-2">
          <button onClick={() => act(() => addWater(date, 250))} className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-sky-400/15 py-2 text-sm font-semibold text-sky-400 active:scale-95">
            <Plus className="size-4" /> 250 ml
          </button>
          <button onClick={() => act(() => addWater(date, 500))} className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-sky-400/15 py-2 text-sm font-semibold text-sky-400 active:scale-95">
            <Plus className="size-4" /> 500 ml
          </button>
          <button onClick={() => act(() => addWater(date, -250))} className="flex items-center justify-center rounded-lg bg-surface-2 px-3 text-muted active:scale-95" aria-label="250 ml abziehen">
            <Minus className="size-4" />
          </button>
        </div>
      </Card>

      {/* Supplemente */}
      <section className="space-y-2">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-muted">
          <Pill className="size-4 text-primary" /> Supplemente
        </h2>
        <div className="space-y-2">
          {supplements.map((it) => {
            const on = checked.has(it.key);
            return (
              <button
                key={it.key}
                onClick={() => act(() => toggleNutritionItem(date, it.key))}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors active:scale-[0.99]",
                  on ? "border-success/40 bg-success/5" : "border-border bg-surface hover:bg-surface-2",
                )}
              >
                <span className={cn("flex size-7 shrink-0 items-center justify-center rounded-full border-2", on ? "border-success bg-success text-white" : "border-border text-transparent")}>
                  <Check className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className={cn("font-medium", on && "text-muted line-through")}>
                    {it.label}
                    {it.dose && <span className="ml-1.5 text-xs font-semibold text-primary">{it.dose}</span>}
                  </p>
                  <p className="truncate text-xs text-muted">{it.time}{it.hint ? ` · ${it.hint}` : ""}</p>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Coach-Tipps */}
      {tips.length > 0 && (
        <Card className="space-y-3">
          <div className="flex items-center gap-2">
            <Lightbulb className="size-5 text-primary" />
            <h2 className="font-semibold">Coach-Tipps</h2>
          </div>
          <ul className="space-y-2">
            {tips.map((t, i) => (
              <li key={i} className="flex gap-2 text-sm text-muted">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary/70" />
                <span className="leading-snug">{t}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <button
        onClick={() => act(() => resetNutritionDay(date))}
        className="flex w-full items-center justify-center gap-1.5 text-xs text-muted hover:text-danger"
      >
        {busy ? <Loader2 className="size-3.5 animate-spin" /> : <RotateCcw className="size-3.5" />}
        Heutigen Tag zurücksetzen
      </button>

      {showAdd && (
        <AddFoodSheet
          onClose={() => setShowAdd(false)}
          onAdd={(food) => act(() => addFoodEntry(date, food))}
        />
      )}
    </div>
  );
}

/* ---------------- Essen-hinzufügen-Overlay ---------------- */

function AddFoodSheet({
  onClose,
  onAdd,
}: {
  onClose: () => void;
  onAdd: (food: { name: string; kcal: number; protein: number; carbs: number; fat: number }) => void;
}) {
  const [tab, setTab] = useState<"food" | "custom">("food");
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<Food | null>(null);
  const [qty, setQty] = useState<number>(100);

  // Eigenes
  const [cName, setCName] = useState("");
  const [cKcal, setCKcal] = useState("");
  const [cP, setCP] = useState("");
  const [cC, setCC] = useState("");
  const [cF, setCF] = useState("");

  const list = useMemo(() => {
    const n = q.trim().toLowerCase();
    return FOODS.filter((f) => !n || f.name.toLowerCase().includes(n));
  }, [q]);

  const preview = sel ? scaleFood(sel, qty) : null;

  const selectFood = (f: Food) => {
    setSel(f);
    setQty(defaultQty(f));
  };

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-background">
      <div className="flex items-center gap-3 border-b border-border px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))]">
        <button onClick={onClose} aria-label="Schließen" className="-ml-2 flex size-11 items-center justify-center rounded-lg text-muted hover:bg-surface-2 hover:text-foreground">
          <X className="size-5" />
        </button>
        <p className="font-semibold">Essen eintragen</p>
      </div>

      <div className="grid grid-cols-2 gap-1 border-b border-border px-4 py-2">
        {(["food", "custom"] as const).map((id) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cn(
              "rounded-lg py-2 text-sm font-semibold transition-colors",
              tab === id ? "bg-surface-2 text-foreground" : "text-muted",
            )}
          >
            {id === "food" ? "Lebensmittel" : "Eigenes"}
          </button>
        ))}
      </div>

      {tab === "food" ? (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="px-4 pt-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Lebensmittel suchen…"
                className="w-full rounded-lg border border-border bg-surface-2 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-primary"
              />
            </div>
          </div>
          <ul className="min-h-0 flex-1 space-y-1.5 overflow-y-auto px-4 py-3">
            {list.map((f) => (
              <li key={f.id}>
                <button
                  onClick={() => selectFood(f)}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-left",
                    sel?.id === f.id ? "border-primary bg-primary/5" : "border-border bg-surface",
                  )}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{f.name}</span>
                    <span className="block text-[11px] text-muted">
                      pro {f.base} {f.unit}: {f.kcal} kcal · {f.protein} g P
                    </span>
                  </span>
                </button>
              </li>
            ))}
            {list.length === 0 && (
              <li className="py-6 text-center text-sm text-muted">
                Nichts gefunden – leg es unter „Eigenes“ an.
              </li>
            )}
          </ul>

          {sel && preview && (
            <div className="border-t border-border bg-surface px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3">
              <p className="font-semibold">{sel.name}</p>
              <div className="mt-2 flex items-center gap-2">
                <button onClick={() => setQty((x) => Math.max(sel.unit === "g" ? 10 : 1, x - (sel.unit === "g" ? 10 : 1)))} className="flex size-10 items-center justify-center rounded-lg bg-surface-2 text-muted active:scale-95">
                  <Minus className="size-4" />
                </button>
                <div className="flex flex-1 items-center gap-1 rounded-lg border border-border bg-surface-2 px-3">
                  <input
                    type="number"
                    inputMode="numeric"
                    value={qty}
                    onChange={(e) => setQty(Math.max(0, parseInt(e.target.value) || 0))}
                    className="h-10 w-full bg-transparent text-center text-base outline-none"
                  />
                  <span className="text-sm text-muted">{sel.unit}</span>
                </div>
                <button onClick={() => setQty((x) => x + (sel.unit === "g" ? 10 : 1))} className="flex size-10 items-center justify-center rounded-lg bg-surface-2 text-muted active:scale-95">
                  <Plus className="size-4" />
                </button>
              </div>
              <p className="mt-2 text-center text-sm tabular-nums text-muted">
                {preview.kcal} kcal · {preview.protein} g P · {preview.carbs} g K · {preview.fat} g F
              </p>
              <button
                onClick={() => {
                  onAdd({ name: `${sel.name} (${qty} ${sel.unit})`, ...preview });
                  setSel(null);
                  setQ("");
                }}
                className="mt-2 w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground active:scale-[0.99]"
              >
                Hinzufügen
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4 pb-[calc(2rem+env(safe-area-inset-bottom))]">
          <label className="block space-y-1">
            <span className="text-sm font-medium">Was hast du gegessen?</span>
            <input
              value={cName}
              onChange={(e) => setCName(e.target.value)}
              placeholder="z. B. Hähnchen-Wrap"
              className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-sm outline-none focus:border-primary"
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            {(
              [
                ["Kalorien", cKcal, setCKcal, "kcal"],
                ["Protein", cP, setCP, "g"],
                ["Kohlenhydrate", cC, setCC, "g"],
                ["Fett", cF, setCF, "g"],
              ] as [string, string, (v: string) => void, string][]
            ).map(([label, val, setter, unit]) => (
              <label key={label} className="block space-y-1">
                <span className="text-xs text-muted">{label} ({unit})</span>
                <input
                  type="number"
                  inputMode="decimal"
                  value={val}
                  onChange={(e) => setter(e.target.value)}
                  placeholder="0"
                  className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-center text-base outline-none focus:border-primary"
                />
              </label>
            ))}
          </div>
          <p className="flex items-start gap-1.5 text-[11px] leading-snug text-muted">
            <Lock className="mt-0.5 size-3 shrink-0" />
            Nährwerte stehen auf der Verpackung (je Portion) oder findest du schnell
            online. Je genauer, desto besser die Coach-Empfehlungen.
          </p>
          <button
            disabled={cName.trim().length === 0}
            onClick={() => {
              onAdd({
                name: cName.trim(),
                kcal: parseFloat(cKcal) || 0,
                protein: parseFloat(cP) || 0,
                carbs: parseFloat(cC) || 0,
                fat: parseFloat(cF) || 0,
              });
              setCName(""); setCKcal(""); setCP(""); setCC(""); setCF("");
              onClose();
            }}
            className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50 active:scale-[0.99]"
          >
            Hinzufügen
          </button>
        </div>
      )}
    </div>
  );
}
