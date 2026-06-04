"use client";

import { useState, useTransition } from "react";
import {
  Mail,
  X,
  ChevronRight,
  Dumbbell,
  Apple,
  Flame,
  Layers,
  HeartPulse,
  Gauge,
  CalendarDays,
  Award,
  User,
  Sparkles,
  CheckCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { markNewsRead } from "@/lib/actions";
import { KIND_LABEL, type NewsItem, type NewsKind } from "@/lib/news";

const ICON: Record<string, typeof Apple> = {
  apple: Apple,
  flame: Flame,
  layers: Layers,
  heart: HeartPulse,
  gauge: Gauge,
  calendar: CalendarDays,
  dumbbell: Dumbbell,
  award: Award,
  user: User,
};

function fmtDate(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
}

export function NewsInbox({
  items,
  readIds,
}: {
  items: NewsItem[];
  readIds: string[];
}) {
  const [read, setRead] = useState<Set<string>>(() => new Set(readIds));
  const [openId, setOpenId] = useState<string | null>(null);
  const [filter, setFilter] = useState<NewsKind | "all">("all");
  const [, start] = useTransition();

  const open = (id: string) => {
    setOpenId(id);
    if (!read.has(id)) {
      setRead((prev) => new Set(prev).add(id));
      start(() => markNewsRead([id]));
    }
  };

  const markAll = () => {
    const unread = items.filter((n) => !read.has(n.id)).map((n) => n.id);
    if (unread.length === 0) return;
    setRead(new Set(items.map((n) => n.id)));
    start(() => markNewsRead(unread));
  };

  const current = items.find((n) => n.id === openId) ?? null;
  const unreadTotal = items.filter((n) => !read.has(n.id)).length;

  const kinds = [...new Set(items.map((n) => n.kind))];
  const shownItems = filter === "all" ? items : items.filter((n) => n.kind === filter);

  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-1.5 overflow-x-auto">
          <button
            onClick={() => setFilter("all")}
            className={cn(
              "whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium",
              filter === "all" ? "border-primary bg-primary/15 text-primary" : "border-border bg-surface text-muted",
            )}
          >
            Alle
          </button>
          {kinds.map((k) => (
            <button
              key={k}
              onClick={() => setFilter(k)}
              className={cn(
                "whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium",
                filter === k ? "border-primary bg-primary/15 text-primary" : "border-border bg-surface text-muted",
              )}
            >
              {KIND_LABEL[k]}
            </button>
          ))}
        </div>
        {unreadTotal > 0 && (
          <button
            onClick={markAll}
            className="flex shrink-0 items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            <CheckCheck className="size-4" /> Alle gelesen
          </button>
        )}
      </div>

      <ul className="space-y-2">
        {shownItems.map((n) => {
          const isUnread = !read.has(n.id);
          return (
            <li key={n.id}>
              <button
                onClick={() => open(n.id)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-colors active:scale-[0.99]",
                  isUnread
                    ? "border-primary/40 bg-primary/5"
                    : "border-border bg-surface hover:bg-surface-2",
                )}
              >
                <span className="relative flex size-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/30 to-primary/10">
                  <Mail className="size-5 text-primary" />
                  {isUnread && (
                    <span className="absolute -right-0.5 -top-0.5 size-3 rounded-full border-2 border-surface bg-danger" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="rounded-md bg-surface-2 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                      {n.category}
                    </span>
                    <span className="text-[11px] text-muted">{fmtDate(n.date)}</span>
                  </div>
                  <p className={cn("mt-0.5 truncate", isUnread ? "font-bold" : "font-medium")}>
                    {n.title}
                  </p>
                  <p className="truncate text-xs text-muted">{n.summary}</p>
                </div>
                <ChevronRight className="size-4 shrink-0 text-muted" />
              </button>
            </li>
          );
        })}
      </ul>

      {/* Mail-Detailansicht */}
      {current && (
        <div className="fixed inset-0 z-[70] flex flex-col bg-background">
          <div className="flex items-center gap-3 border-b border-border px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))]">
            <button
              onClick={() => setOpenId(null)}
              aria-label="Schließen"
              className="-ml-2 flex size-11 items-center justify-center rounded-lg text-muted hover:bg-surface-2 hover:text-foreground"
            >
              <X className="size-5" />
            </button>
            <p className="font-semibold">Postfach</p>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4 pb-[calc(2rem+env(safe-area-inset-bottom))]">
            <div className="mx-auto max-w-xl space-y-5">
              {/* Absender */}
              <div className="flex items-center gap-3">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary">
                  <Dumbbell className="size-5 text-primary-foreground" />
                </span>
                <div className="min-w-0">
                  <p className="font-semibold">Train · Dein Coach</p>
                  <p className="text-xs text-muted">
                    {fmtDate(current.date)} · {current.category}
                  </p>
                </div>
              </div>

              <h1 className="text-2xl font-extrabold leading-tight">
                {current.title}
              </h1>
              <p className="leading-relaxed text-muted">{current.summary}</p>

              {/* Bilder */}
              {current.images?.map((src) => (
                <div
                  key={src}
                  className="overflow-hidden rounded-2xl border border-border"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="" className="block w-full" />
                </div>
              ))}

              {/* Highlights */}
              <div className="space-y-2.5">
                {current.highlights.map((h, i) => {
                  const Icon = ICON[h.icon] ?? Sparkles;
                  return (
                    <div
                      key={i}
                      className="flex gap-3 rounded-2xl border border-border bg-surface p-4"
                    >
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/15">
                        <Icon className="size-5 text-primary" />
                      </span>
                      <div className="min-w-0">
                        <p className="font-semibold">{h.title}</p>
                        <p className="mt-0.5 text-sm leading-snug text-muted">
                          {h.text}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {current.footer && (
                <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4">
                  <p className="flex items-start gap-2 text-sm text-muted">
                    <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" />
                    {current.footer}
                  </p>
                </div>
              )}

              <button
                onClick={() => setOpenId(null)}
                className="w-full rounded-xl bg-surface-2 py-3 text-sm font-semibold text-muted hover:text-foreground"
              >
                Zurück zum Postfach
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
