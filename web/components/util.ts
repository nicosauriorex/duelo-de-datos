import type { CSSProperties } from "react";

export const PALETA = ["--series-1", "--series-2", "--series-3", "--series-4", "--series-5", "--series-6", "--series-7", "--series-8", "--neutral", "--text-secondary"];
export const vcolor = (c: string) => ({ ["--c" as string]: `var(${c})` }) as CSSProperties;
