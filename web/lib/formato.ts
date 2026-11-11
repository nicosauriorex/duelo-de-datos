// Formato es-AR de números y fechas (mismos Intl.NumberFormat y fmtMes que la página vieja).
export const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
export const fmtMes = (s: string | null | undefined): string => {
  if (!s) return "–";
  const [y, m] = s.split("-");
  return MESES[+m - 1] + "-" + y.slice(2);
};
export const nf0 = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 });
export const nf1 = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 1, minimumFractionDigits: 1 });
export const nf2 = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 2, minimumFractionDigits: 2 });
export const nf3 = new Intl.NumberFormat("es-AR", { maximumSignificantDigits: 3 });
export const fmtNum = (v: number): string => {
  const a = Math.abs(v);
  return a >= 1000 ? nf0.format(v) : a >= 10 ? nf1.format(v) : a >= 0.1 || a === 0 ? nf2.format(v) : nf3.format(v);
};
export const ok = (v: number | null | undefined): v is number => v != null && isFinite(v);
export const lastIdx = (arr: (number | null)[]): number => {
  for (let i = arr.length - 1; i >= 0; i--) if (ok(arr[i])) return i;
  return -1;
};
export const mul = (...xs: (number | null | undefined)[]): number | null =>
  xs.some((v) => !ok(v)) ? null : (xs as number[]).reduce((a, b) => a * b, 1);
export const norm = (s: string): string => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
export const mesNum = (f: string): number => +f.slice(0, 4) * 12 + (+f.slice(5, 7) - 1);

/** Formato es-AR con una cantidad fija de decimales (para animar un número sin que cambie de forma). */
const _nfDec = new Map<number, Intl.NumberFormat>();
export const nfDec = (d: number): Intl.NumberFormat => {
  if (!_nfDec.has(d)) _nfDec.set(d, new Intl.NumberFormat("es-AR", { minimumFractionDigits: d, maximumFractionDigits: d }));
  return _nfDec.get(d)!;
};
/** Separa el primer número (formato es-AR) de un texto ya armado: "$ 1.415,5 por mes" → antes "$ ", valor 1415.5, 1 decimal, después " por mes". */
export function partirNumero(texto: string): { antes: string; valor: number; decimales: number; despues: string } | null {
  const m = /\d{1,3}(?:\.\d{3})+(?:,\d+)?|\d+(?:,\d+)?/.exec(texto);
  if (!m) return null;
  const [ent, dec = ""] = m[0].split(",");
  const valor = Number(ent.replace(/\./g, "") + (dec ? "." + dec : ""));
  if (!Number.isFinite(valor)) return null;
  return { antes: texto.slice(0, m.index), valor, decimales: dec.length, despues: texto.slice(m.index + m[0].length) };
}

/** El número tal como lo muestra un texto ya formateado ("$ 1.415,5" → 1415,5; "−2,1 %" → -2,1). null si el texto no trae número. */
export function valorMostrado(texto: string): number | null {
  const p = partirNumero(texto);
  if (!p) return null;
  return /[-−–]\s*$/.test(p.antes) ? -p.valor : p.valor;
}
/** `v` redondeado como lo muestra `fmt` (1,94 mostrado como "1,9" → 1,9). Si el texto no trae número, devuelve `v`. */
export const redondeadoComo = (fmt: (v: number) => string, v: number): number => valorMostrado(fmt(v)) ?? v;
/** Resta `b - a` sin el ruido de la coma flotante (2,1 - 1,9 → 0,2 y no 0,20000000000000018). */
export const restaLimpia = (b: number, a: number): number => Math.round((b - a) * 1e9) / 1e9;
/** `x` redondeado a un decimal igual que lo muestra `nf1` (mismo criterio en los empates) y sin cero negativo. Es el redondeo de todos los porcentajes del sitio. */
export const r1 = (x: number): number => (valorMostrado(nf1.format(x)) ?? x) || 0;
