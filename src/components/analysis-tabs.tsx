"use client";

import { useState } from "react";
import { Gauge, HeartPulse, TrendingUp, Apple } from "lucide-react";
import { cn } from "@/lib/utils";

type TabId = "overview" | "body" | "progress" | "nutrition";

// Gliedert die Analyse in klare Tabs, statt alles untereinander zu stapeln.
export function AnalysisTabs({
  overview,
  body,
  progress,
  nutrition,
}: {
  overview: React.ReactNode;
  body: React.ReactNode;
  progress: React.ReactNode;
  nutrition: React.ReactNode;
}) {
  const [tab, setTab] = useState<TabId>("overview");
  const tabs: { id: TabId; label: string; Icon: typeof Gauge }[] = [
    { id: "overview", label: "Überblick", Icon: Gauge },
    { id: "body", label: "Körper", Icon: HeartPulse },
    { id: "progress", label: "Fortschritt", Icon: TrendingUp },
    { id: "nutrition", label: "Ernährung", Icon: Apple },
  ];
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-1 rounded-xl bg-surface-2 p-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            aria-current={tab === t.id}
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-1.5 text-[11px] font-semibold transition-colors",
              tab === t.id
                ? "bg-surface text-foreground shadow-sm"
                : "text-muted hover:text-foreground",
            )}
          >
            <t.Icon className="size-4" />
            {t.label}
          </button>
        ))}
      </div>
      <div className="space-y-5">
        {tab === "overview"
          ? overview
          : tab === "body"
            ? body
            : tab === "progress"
              ? progress
              : nutrition}
      </div>
    </div>
  );
}
