"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { Check, Loader2, Save } from "lucide-react";
import { Card, Input, Select } from "@/components/ui";
import { updateCoachProfile, type CoachProfileState } from "@/lib/actions";
import {
  GOAL_CONFIG,
  GOAL_LABELS,
  EXPERIENCE_LABELS,
  STYLE_LABELS,
  REP_STYLE_LABELS,
  type CoachProfile,
  type RepStyle,
} from "@/lib/coach";

type EquipmentOption = { slug: string; nameDe: string };

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium">{label}</span>
      {children}
      {hint && <span className="block text-xs text-muted">{hint}</span>}
    </label>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex min-h-11 w-full select-none items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:opacity-90 active:opacity-80 disabled:opacity-60"
    >
      {pending ? (
        <>
          <Loader2 className="size-4 animate-spin" /> Speichern…
        </>
      ) : (
        <>
          <Save className="size-4" /> Speichern
        </>
      )}
    </button>
  );
}

export function CoachProfileForm({
  profile: p,
  equipment,
}: {
  profile: CoachProfile;
  equipment: EquipmentOption[];
}) {
  const [state, action] = useActionState<CoachProfileState, FormData>(
    updateCoachProfile,
    undefined,
  );
  const feedbackRef = useRef<HTMLDivElement>(null);

  // Vorausgewählte Equipment-Slugs aus dem gespeicherten CSV.
  const selectedEquipment = new Set(
    (p.availableEquipment ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  );

  // Erfolg/Fehler kurz hervorheben.
  useEffect(() => {
    if (state && feedbackRef.current) {
      feedbackRef.current.classList.remove("error-shake");
      void feedbackRef.current.offsetWidth;
      feedbackRef.current.classList.add("error-shake");
    }
  }, [state]);

  return (
    <form action={action} className="space-y-5">
      <Card className="space-y-4">
        <h2 className="font-semibold">Trainingsziel</h2>
        <Field
          label="Ziel"
          hint={`Steuert Wiederholungsbereich (${GOAL_CONFIG[p.goal].repLow}–${GOAL_CONFIG[p.goal].repHigh} Wdh) und Intensität.`}
        >
          <Select name="goal" defaultValue={p.goal}>
            {(Object.keys(GOAL_LABELS) as (keyof typeof GOAL_LABELS)[]).map(
              (g) => (
                <option key={g} value={g}>
                  {GOAL_LABELS[g]} ({GOAL_CONFIG[g].repLow}–{GOAL_CONFIG[g].repHigh} Wdh)
                </option>
              ),
            )}
          </Select>
        </Field>

        <Field
          label="Erfahrung"
          hint="Anfänger steigern schneller, Erfahrene in kleineren Schritten."
        >
          <Select name="experience" defaultValue={p.experience}>
            {(
              Object.keys(EXPERIENCE_LABELS) as (keyof typeof EXPERIENCE_LABELS)[]
            ).map((e) => (
              <option key={e} value={e}>
                {EXPERIENCE_LABELS[e]}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          label="Coach-Stil"
          hint="Wie hart soll der Coach dich pushen und ans Limit führen?"
        >
          <Select name="coachStyle" defaultValue={p.coachStyle}>
            {(Object.keys(STYLE_LABELS) as (keyof typeof STYLE_LABELS)[]).map(
              (s) => (
                <option key={s} value={s}>
                  {STYLE_LABELS[s]}
                </option>
              ),
            )}
          </Select>
        </Field>

        <Field
          label="Wiederholungs-Stil"
          hint="Feinjustierung: lieber schwerer mit weniger oder leichter mit mehr Wiederholungen."
        >
          <Select
            name="preferredRepStyle"
            defaultValue={p.preferredRepStyle ?? "auto"}
          >
            {(Object.keys(REP_STYLE_LABELS) as RepStyle[]).map((r) => (
              <option key={r} value={r}>
                {REP_STYLE_LABELS[r]}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          label="Trainingstage pro Woche"
          hint="Beeinflusst Volumen- und Erholungs-Hinweise (1–7)."
        >
          <Input
            name="trainingDaysPerWeek"
            type="number"
            inputMode="numeric"
            min={1}
            max={7}
            placeholder="z. B. 4"
            defaultValue={p.trainingDaysPerWeek ?? ""}
          />
        </Field>
      </Card>

      <Card className="space-y-4">
        <h2 className="font-semibold">Über dich</h2>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Geschlecht">
            <Select name="sex" defaultValue={p.sex}>
              <option value="">Keine Angabe</option>
              <option value="m">Männlich</option>
              <option value="f">Weiblich</option>
            </Select>
          </Field>
          <Field label="Geburtsjahr">
            <Input
              name="birthYear"
              type="number"
              inputMode="numeric"
              placeholder="z. B. 1995"
              defaultValue={p.birthYear ?? ""}
            />
          </Field>
          <Field label="Körpergewicht (kg)">
            <Input
              name="bodyweightKg"
              type="number"
              inputMode="decimal"
              step="0.1"
              placeholder="z. B. 80"
              defaultValue={p.bodyweightKg ?? ""}
            />
          </Field>
          <Field label="Größe (cm)">
            <Input
              name="heightCm"
              type="number"
              inputMode="numeric"
              placeholder="z. B. 180"
              defaultValue={p.heightCm ?? ""}
            />
          </Field>
        </div>

        <Field
          label="Einschränkungen / Verletzungen"
          hint="z. B. „Schulter links empfindlich, kein schweres Überkopfdrücken“. Der Coach berücksichtigt das in seinen Hinweisen."
        >
          <textarea
            name="limitations"
            rows={3}
            placeholder="Optional — alles, worauf der Coach achten soll."
            defaultValue={p.limitations ?? ""}
            className="w-full resize-y rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-sm outline-none placeholder:text-muted focus:border-primary"
          />
        </Field>
      </Card>

      {equipment.length > 0 && (
        <Card className="space-y-3">
          <div>
            <h2 className="font-semibold">Verfügbares Equipment</h2>
            <p className="mt-1 text-xs text-muted">
              Wähle aus, was dir zur Verfügung steht. Nichts ausgewählt = alles
              verfügbar. Der Coach bevorzugt passende Übungen.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {equipment.map((eq) => (
              <label
                key={eq.slug}
                className="flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm transition-colors hover:border-primary/50"
              >
                <input
                  type="checkbox"
                  name="availableEquipment"
                  value={eq.slug}
                  defaultChecked={selectedEquipment.has(eq.slug)}
                  className="size-4 accent-primary"
                />
                <span>{eq.nameDe}</span>
              </label>
            ))}
          </div>
        </Card>
      )}

      {state?.ok && (
        <div
          ref={feedbackRef}
          role="status"
          className="error-shake flex items-center gap-2 rounded-lg border border-primary/40 bg-primary/10 px-3 py-2.5 text-sm text-primary"
        >
          <Check className="size-4" /> Gespeichert ✓
        </div>
      )}
      {state?.error && (
        <div
          ref={feedbackRef}
          role="alert"
          className="error-shake rounded-lg border border-danger/40 bg-danger/10 px-3 py-2.5 text-sm text-danger"
        >
          {state.error}
        </div>
      )}

      <SubmitButton />
    </form>
  );
}
