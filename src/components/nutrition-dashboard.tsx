"use client";

import { useState, useTransition } from "react";
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
  UtensilsCrossed,
  Sparkles,
  Loader2,
  RotateCcw,
  Lightbulb,
} from "lucide-react";
import { Card } from "@/components/ui";
import { cn } from "@/lib/utils";
import {
  toggleNutritionItem,
  addWater,
  addNutritionExtra,
  resetNutritionDay,
} from "@/lib/actions";
import type {
  NutritionTargets,
  PlanItem,
  Macros,
} from "@/lib/coach-nutrition";

// Animierter Fortschrittsring.
function Ring({
  value,
  target,
  label,
  unit,
  color,
  Icon,
  size = 96,
}: {
  value: number;
  target: number;
  label: string;
  unit: string;
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
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="var(--surface-2)"
            strokeWidth={8}
          />
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
      <p className="text-[10px] text-muted">{unit}</p>
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
        <div
          className="h-full rounded-full transition-[width] duration-500"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  );
}

const KIND_META: Record<PlanItem["kind"], { Icon: typeof Pill; label: string }> = {
  meal: { Icon: UtensilsCrossed, label: "Mahlzeiten" },
  shake: { Icon: Droplet, label: "Nach dem Training" },
  supp: { Icon: Pill, label: "Supplemente" },
};

function PlanRow({
  item,
  checked,
  onToggle,
}: {
  item: PlanItem;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className={cn(
        "flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors active:scale-[0.99]",
        checked
          ? "border-success/40 bg-success/5"
          : "border-border bg-surface hover:bg-surface-2",
      )}
    >
      <span
        className={cn(
          "flex size-7 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
          checked
            ? "border-success bg-success text-white"
            : "border-border text-transparent",
        )}
      >
        <Check className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className={cn("font-medium", checked && "text-muted line-through")}>
          {item.label}
          {item.dose && (
            <span className="ml-1.5 text-xs font-semibold text-primary">
              {item.dose}
            </span>
          )}
        </p>
        <p className="truncate text-xs text-muted">
          {item.time}
          {item.kind !== "supp" &&
            ` · ${item.macros.kcal} kcal · ${item.macros.protein} g Eiweiß`}
          {item.hint ? ` · ${item.hint}` : ""}
        </p>
      </div>
    </button>
  );
}

export function NutritionDashboard({
  date,
  targets,
  items,
  checkedKeys,
  consumed,
  waterMl,
  tips,
}: {
  date: string;
  targets: NutritionTargets;
  items: PlanItem[];
  checkedKeys: string[];
  consumed: Macros;
  waterMl: number;
  tips: string[];
}) {
  const [, start] = useTransition();
  const [busy, setBusy] = useState(false);
  const checked = new Set(checkedKeys);

  const act = (fn: () => Promise<unknown>) => {
    setBusy(true);
    start(async () => {
      await fn();
      setBusy(false);
    });
  };

  const groups: PlanItem["kind"][] = ["meal", "shake", "supp"];
  const waterGoalL = (targets.waterMl / 1000).toFixed(1);
  const waterL = (waterMl / 1000).toFixed(1);
  const waterPct = Math.min(100, (waterMl / targets.waterMl) * 100);

  return (
    <div className={cn("space-y-4", busy && "pointer-events-none opacity-90")}>
      {/* Status / Trainingstag */}
      <div
        className={cn(
          "rounded-2xl border p-3",
          targets.isTrainingDay
            ? "border-primary/30 bg-primary/5"
            : "border-border bg-surface",
        )}
      >
        <p className="flex items-center gap-2 text-sm font-semibold">
          <Sparkles className="size-4 text-primary" />
          {targets.isTrainingDay ? "Trainingstag" : "Ruhetag"} · {targets.goalLabel}
        </p>
        <p className="mt-1 text-xs leading-snug text-muted">{targets.note}</p>
      </div>

      {/* Ringe + Makro-Balken */}
      <Card className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          <Ring
            value={consumed.kcal}
            target={targets.kcal}
            label="Kalorien"
            unit="kcal"
            color="var(--primary)"
            Icon={Flame}
          />
          <Ring
            value={consumed.protein}
            target={targets.protein}
            label="Protein"
            unit="g"
            color="#22c55e"
            Icon={Beef}
          />
        </div>
        <div className="flex gap-4">
          <MacroBar
            value={consumed.carbs}
            target={targets.carbs}
            label="Kohlenhydrate"
            color="#f59e0b"
            Icon={Wheat}
          />
          <MacroBar
            value={consumed.fat}
            target={targets.fat}
            label="Fett"
            color="#a855f7"
            Icon={Droplet}
          />
        </div>
        <div className="flex flex-wrap gap-2 pt-1">
          <QuickAdd
            label="+ Eiweißshake"
            sub="30 g · 130 kcal"
            onClick={() =>
              act(() =>
                addNutritionExtra(date, { kcal: 130, protein: 30, carbs: 3, fat: 1 }),
              )
            }
          />
          <QuickAdd
            label="+ Mahlzeit"
            sub="~600 kcal"
            onClick={() =>
              act(() =>
                addNutritionExtra(date, {
                  kcal: 600,
                  protein: 35,
                  carbs: 60,
                  fat: 18,
                }),
              )
            }
          />
        </div>
      </Card>

      {/* Wasser */}
      <Card className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="flex items-center gap-2 font-semibold">
            <Droplets className="size-5 text-sky-400" /> Wasser
          </p>
          <p className="text-sm tabular-nums text-muted">
            <span className="font-bold text-foreground">{waterL} l</span> /{" "}
            {waterGoalL} l
          </p>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-surface-2">
          <div
            className="h-full rounded-full bg-sky-400 transition-[width] duration-500"
            style={{ width: `${waterPct}%` }}
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => act(() => addWater(date, 250))}
            className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-sky-400/15 py-2 text-sm font-semibold text-sky-400 active:scale-95"
          >
            <Plus className="size-4" /> 250 ml
          </button>
          <button
            onClick={() => act(() => addWater(date, 500))}
            className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-sky-400/15 py-2 text-sm font-semibold text-sky-400 active:scale-95"
          >
            <Plus className="size-4" /> 500 ml
          </button>
          <button
            onClick={() => act(() => addWater(date, -250))}
            className="flex items-center justify-center rounded-lg bg-surface-2 px-3 text-muted active:scale-95"
            aria-label="250 ml abziehen"
          >
            <Minus className="size-4" />
          </button>
        </div>
      </Card>

      {/* Tagesplan zum Abhaken */}
      {groups.map((kind) => {
        const list = items.filter((it) => it.kind === kind);
        if (list.length === 0) return null;
        const meta = KIND_META[kind];
        return (
          <section key={kind} className="space-y-2">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-muted">
              <meta.Icon className="size-4 text-primary" /> {meta.label}
            </h2>
            <div className="space-y-2">
              {list.map((it) => (
                <PlanRow
                  key={it.key}
                  item={it}
                  checked={checked.has(it.key)}
                  onToggle={() => act(() => toggleNutritionItem(date, it.key))}
                />
              ))}
            </div>
          </section>
        );
      })}

      {/* Coach-Tipps */}
      {tips.length > 0 && (
        <Card className="space-y-3 border-primary/30 bg-primary/5">
          <div className="flex items-center gap-2">
            <Lightbulb className="size-5 text-primary" />
            <h2 className="font-semibold">Coach-Tipps zur Ernährung</h2>
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
    </div>
  );
}

function QuickAdd({
  label,
  sub,
  onClick,
}: {
  label: string;
  sub: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 rounded-lg border border-border bg-surface-2 px-3 py-1.5 text-left active:scale-95"
    >
      <Plus className="size-4 text-primary" />
      <span>
        <span className="block text-sm font-medium leading-tight">{label}</span>
        <span className="block text-[10px] text-muted">{sub}</span>
      </span>
    </button>
  );
}
