import type { CSSProperties } from "react";
import { ok } from "@/lib/formato";

/** Fondo verde/rojo según el puntaje (-1 a 1), igual que `tinte` de la página vieja. */
export const tinte = (sc: number | null | undefined): CSSProperties | undefined =>
  !ok(sc) || sc === 0 ? undefined
    : { background: `color-mix(in srgb, var(${sc > 0 ? "--pos" : "--neg"}) ${Math.round(8 + Math.min(1, Math.abs(sc)) * 30)}%, transparent)` };

export const PALETA = ["--series-1", "--series-2", "--series-3", "--series-4", "--series-5", "--series-6", "--series-7", "--series-8", "--neutral", "--text-secondary"];
export const vcolor = (c: string) => ({ ["--c" as string]: `var(${c})` }) as CSSProperties;
