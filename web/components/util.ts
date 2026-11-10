import type { CSSProperties } from "react";
import { ok } from "@/lib/formato";

/** Fondo verde (mejor) o rojo (peor) según el puntaje (-1 a 1), en 4 pasos de suave a fuerte: lo mejor en el verde más fuerte y lo peor en el rojo más fuerte.
 *  Cada paso trae su color de texto con contraste AA (tokens `--bueno-f*` / `--malo-f*` de globals.css). */
export const tinte = (sc: number | null | undefined): CSSProperties | undefined => {
  if (!ok(sc) || sc === 0) return undefined;
  const a = Math.abs(sc), n = a > 0.8 ? 4 : a > 0.5 ? 3 : a > 0.25 ? 2 : 1, t = sc > 0 ? "bueno" : "malo";
  return { background: `var(--${t}-f${n})`, color: `var(--sobre-${t}-${n})` };
};
/** Como `tinte`, pero relativo al grupo: el mayor de la lista queda en +1 y el menor en -1. */
export const tinteRelativo = (v: number | null | undefined, min: number, max: number): CSSProperties | undefined =>
  !ok(v) || !(max > min) ? undefined : tinte(((v - min) / (max - min)) * 2 - 1);

export const PALETA = ["--series-1", "--series-2", "--series-3", "--series-4", "--series-5", "--series-6", "--series-7", "--series-8", "--neutral", "--text-secondary"];
export const vcolor = (c: string) => ({ ["--c" as string]: `var(${c})` }) as CSSProperties;
