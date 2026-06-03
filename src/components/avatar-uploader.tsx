"use client";

import { useActionState, useRef, useState } from "react";
import { Camera, Loader2, Trash2, Check } from "lucide-react";
import { Card } from "@/components/ui";
import { Avatar } from "@/components/avatar";
import {
  updateAvatar,
  removeAvatar,
  type AvatarState,
} from "@/lib/actions";

const SIZE = 256; // Ziel-Kantenlänge (quadratisch)

// Skaliert/zuschneidet ein gewähltes Bild clientseitig auf ein kleines Quadrat
// und liefert eine JPEG-data-URL – so bleibt die Datenbank schlank.
function fileToSquareDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Lesefehler"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Bildfehler"));
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = SIZE;
        canvas.height = SIZE;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Canvas nicht verfügbar"));
        // Center-Crop (cover).
        const side = Math.min(img.width, img.height);
        const sx = (img.width - side) / 2;
        const sy = (img.height - side) / 2;
        ctx.drawImage(img, sx, sy, side, side, 0, 0, SIZE, SIZE);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export function AvatarUploader({
  name,
  avatar,
}: {
  name: string;
  avatar: string | null;
}) {
  const [state, action] = useActionState<AvatarState, FormData>(
    updateAvatar,
    undefined,
  );
  const formRef = useRef<HTMLFormElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const hiddenRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const onPick = async (file: File | undefined) => {
    if (!file) return;
    setErr(null);
    setBusy(true);
    try {
      const dataUrl = await fileToSquareDataUrl(file);
      setPreview(dataUrl);
      if (hiddenRef.current) hiddenRef.current.value = dataUrl;
      formRef.current?.requestSubmit();
    } catch {
      setErr("Bild konnte nicht verarbeitet werden.");
    } finally {
      setBusy(false);
    }
  };

  const shown = preview ?? avatar;

  return (
    <Card className="space-y-3">
      <h2 className="font-semibold">Profilbild</h2>
      <div className="flex items-center gap-4">
        <Avatar src={shown} name={name} className="size-20 text-2xl ring-2 ring-border" />
        <div className="min-w-0 flex-1 space-y-2">
          <form ref={formRef} action={action} className="contents">
            <input ref={hiddenRef} type="hidden" name="avatar" />
          </form>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => onPick(e.target.files?.[0])}
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={busy}
              className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:opacity-90 disabled:opacity-60"
            >
              {busy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Camera className="size-4" />
              )}
              {shown ? "Bild ändern" : "Bild hochladen"}
            </button>
            {avatar && (
              <form action={removeAvatar}>
                <button
                  type="submit"
                  className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-muted transition-colors hover:text-danger"
                >
                  <Trash2 className="size-4" /> Entfernen
                </button>
              </form>
            )}
          </div>
          <p className="text-xs text-muted">
            Wird quadratisch zugeschnitten und oben rechts sowie in der
            Bestenliste angezeigt.
          </p>
        </div>
      </div>

      {state?.ok && (
        <div className="flex items-center gap-2 rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-sm text-primary">
          <Check className="size-4" /> Profilbild gespeichert ✓
        </div>
      )}
      {(err || state?.error) && (
        <div className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
          {err ?? state?.error}
        </div>
      )}
    </Card>
  );
}
