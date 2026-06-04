"use client";

import { useState } from "react";
import { Sparkles, LayoutList, FolderHeart } from "lucide-react";
import { cn } from "@/lib/utils";

type TabId = "coach" | "templates" | "mine";

// Trennt den Pläne-Tab in klare Bereiche (kein vermischtes Scrollen mehr):
// Coach-Plan · Vorlagen · Meine Pläne.
export function PlansTabs({
  coach,
  templates,
  mine,
  mineCount,
}: {
  coach: React.ReactNode;
  templates: React.ReactNode;
  mine: React.ReactNode;
  mineCount: number;
}) {
  const [tab, setTab] = useState<TabId>("coach");
  const tabs: { id: TabId; label: string; Icon: typeof Sparkles; badge?: number }[] = [
    { id: "coach", label: "Coach-Plan", Icon: Sparkles },
    { id: "templates", label: "Vorlagen", Icon: LayoutList },
    { id: "mine", label: "Meine", Icon: FolderHeart, badge: mineCount },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-1 rounded-xl bg-surface-2 p-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            aria-current={tab === t.id}
            className={cn(
              "flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-sm font-semibold transition-colors",
              tab === t.id
                ? "bg-surface text-foreground shadow-sm"
                : "text-muted hover:text-foreground",
            )}
          >
            <t.Icon className="size-4 shrink-0" />
            <span className="truncate">{t.label}</span>
            {t.badge ? (
              <span className="rounded-full bg-surface-2 px-1.5 text-[10px] tabular-nums text-muted">
                {t.badge}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      <div>
        {tab === "coach" ? coach : tab === "templates" ? templates : mine}
      </div>
    </div>
  );
}
