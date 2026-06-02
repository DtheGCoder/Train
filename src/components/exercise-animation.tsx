import { Card } from "@/components/ui";

// Zeigt die Bewegungs-Demo: zwei Posen (Start/Ende), die per CSS weich
// ineinander überblenden (ease-in-out, mit Halte-Phasen) → wirkt flüssig.
// Bilder kommen zur Laufzeit vom CDN (gemeinfreier Datensatz, siehe
// exercise-animation.ts). Respektiert prefers-reduced-motion (Keyframes aus).
export function ExerciseAnimation({ frames }: { frames: [string, string] }) {
  return (
    <Card>
      <h2 className="mb-3 text-sm font-semibold">Übungsausführung</h2>
      <div className="relative mx-auto max-w-sm overflow-hidden rounded-xl bg-white">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={frames[0]}
          alt="Startposition der Übung"
          loading="lazy"
          className="demo-a block h-auto w-full"
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={frames[1]}
          alt="Endposition der Übung"
          loading="lazy"
          className="demo-b absolute inset-0 block h-auto w-full"
        />
      </div>
      <p className="mt-2 text-center text-[11px] text-muted">
        Bewegungs-Demo · Start ↔ Ende
      </p>
    </Card>
  );
}
