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
