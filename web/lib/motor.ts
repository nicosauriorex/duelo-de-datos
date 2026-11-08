// Motor de cálculo: port tipado de las líneas "datos / medidas / calc" de src/app.js.
// Una sola fuente de verdad: todas las secciones usan estas funciones.
import { fmtMes, nf0, nf1, fmtNum, ok, lastIdx, mul } from "./formato";

export type Vals = (number | null)[];
export interface Banda { i0: number; v: (number | null)[] }
export interface SerieMeta {
  id: string; n: string; cat: string[]; tipo: string; u: string; dir: number; fuente: string; desc: string;
  agg?: number; flujo?: number; archivo: string;
}
export interface SerieDatos { i0: number; v: (number | null)[]; min?: Banda; max?: Banda }
export interface Serie extends SerieMeta {
  vals: Vals; mn?: Vals; mx?: Vals; busca?: string; i0: number;
}
export interface Expr {
  id: string; med?: string; rel?: string | null; modo?: string; esc?: string; forzar?: boolean;
}
export interface Calculo {
  v: Vals; lo?: Vals; hi?: Vals; nombre: string; corto: string; unidad: string; dir: number;
  flujo?: boolean; ultimo?: boolean; pct: boolean; serie: Serie;
}
export type Opcion = [string, string];

export const FX_NOM: Record<string, string> = { oficial: "oficial", blue: "blue", mep: "MEP", ccl: "CCL" };
export const FX_COLOR: Record<string, string> = { oficial: "--series-1", blue: "--series-2", mep: "--series-3", ccl: "--series-4" };
export const FX_KEYS = ["oficial", "blue", "mep", "ccl"] as const;
export const BASE_IDS = ["ipc_empalme", "cpi_usa", "fx_oficial", "fx_blue", "fx_mep", "fx_ccl", "poblacion", "pib_nom_anual"];

const VARS: Opcion[] = [["vm", "Variación mensual (%)"], ["via", "Variación interanual (%)"], ["vac", "Acumulada en el año (%)"]];
export const ES_VAR = (m?: string) => m === "vm" || m === "via" || m === "vac";
export const FACTOR_U = (u: string): [number, string] =>
  /^millones de /.test(u) ? [1e6, u.replace(/^millones de /, "")] : /^miles de /.test(u) ? [1e3, u.replace(/^miles de /, "")] : [1, u];

/** Las tasas nominales anuales llegan como tipo "none" con TNA en la unidad: se tratan como "tasa". */
export const normalizarMeta = (m: SerieMeta): SerieMeta => (m.tipo === "none" && /TNA/.test(m.u) ? { ...m, tipo: "tasa" } : m);

export function expandir(i0: number, v: (number | null)[], N: number): Vals {
  const a: Vals = new Array(N).fill(null);
  v.forEach((x, k) => { a[i0 + k] = x; });
  return a;
}

export function crearMotor(F: string[]) {
  const N = F.length;
  const SER: Record<string, Serie> = {};
  const idxDe = (f: string) => F.indexOf(f);
  let cache = new Map<string, Calculo>();

  function agregar(metas: SerieMeta[], datos: Record<string, SerieDatos>) {
    for (const m of metas) {
      const d = datos[m.id];
      if (!d) continue;
      const s: Serie = { ...normalizarMeta(m), i0: d.i0, vals: expandir(d.i0, d.v, N) };
      if (d.min && d.max) { s.mn = expandir(d.min.i0, d.min.v, N); s.mx = expandir(d.max.i0, d.max.v, N); }
      SER[s.id] = s;
    }
    cache = new Map();
  }
  const baseLista = () => ({
    IPC: SER.ipc_empalme.vals, CPI: SER.cpi_usa.vals,
    FX: { oficial: SER.fx_oficial.vals, blue: SER.fx_blue.vals, mep: SER.fx_mep.vals, ccl: SER.fx_ccl.vals } as Record<string, Vals>,
    POB: SER.poblacion ? SER.poblacion.vals : null,
    PIB_AN: SER.pib_nom_anual ? SER.pib_nom_anual.vals : null,
  });
  // Se resuelve perezosamente: la base se carga siempre antes de calcular.
  let B: ReturnType<typeof baseLista> | null = null;
  let REF_AR = -1, REF_US = -1, refAR = "", refUS = "";
  const base = () => {
    if (!B) {
      B = baseLista();
      REF_AR = lastIdx(B.IPC); REF_US = lastIdx(B.CPI);
      refAR = fmtMes(F[REF_AR]); refUS = fmtMes(F[REF_US]);
    }
    return B;
  };
  const realAR = (i: number) => { const b = base(); return ok(b.IPC[i]) ? (b.IPC[REF_AR] as number) / (b.IPC[i] as number) : null; };
  const realUS = (i: number) => { const b = base(); return ok(b.CPI[i]) ? (b.CPI[REF_US] as number) / (b.CPI[i] as number) : null; };

  const esIndice = (s: SerieMeta) => s.tipo === "idx" || /índice/i.test(s.u || "");
  const MONETARIA = (s: SerieMeta) => ["ars", "idx", "usd", "fx"].includes(s.tipo);

  function medidasDe(s: SerieMeta): Opcion[] {
    base();
    const ars: Opcion[] = [["real", `Pesos reales (de ${refAR})`], ["corr", "Pesos corrientes"],
      ...FX_KEYS.map((k): Opcion => [`usdr_${k}`, `Dólares reales al ${FX_NOM[k]} (de ${refUS})`]),
      ...FX_KEYS.map((k): Opcion => [`usd_${k}`, `Dólares corrientes al ${FX_NOM[k]}`]),
      ...VARS.map(([k, n]): Opcion => [k, n.replace(" (%)", " en pesos (%)")])];
    switch (s.tipo) {
      case "ars": return ars;
      case "fx": return [["corr", "Pesos corrientes"], ["real", `Pesos reales (de ${refAR})`], ["realbi", "Pesos reales, neto de inflación de EEUU"], ...VARS];
      case "usd": return [["corr", "Dólares corrientes"], ["usdr", `Dólares reales (de ${refUS})`], ["arscorr", "Pesos corrientes (al oficial)"], ["real", `Pesos reales (de ${refAR}, al oficial)`]];
      case "tasa": return [["asis", "Nominal (TNA)"], ["tea", "Efectiva anual (TEA)"], ["real_a", "Real anual: TEA descontada la inflación de 12 meses"], ["real_m", "Real mensual: tasa del mes descontada la inflación del mes"]];
      case "idx": {
        if (s.dir === 1) return [["corr", "Índice tal cual (nominal)"], ["real", "Real: descontada la inflación"], ...VARS];
        if (s.cat[0] === "Precios") return [["corr", "Índice tal cual"], ["real", "Precio relativo: contra la inflación general"], ...VARS];
        return [["corr", "Índice tal cual"], ...VARS];
      }
      default: return [["asis", "Tal cual"]];
    }
  }
  const medDefault = (s: SerieMeta): string =>
    ({ ars: "real", idx: s.dir === 1 ? "real" : "corr", fx: "corr", usd: "corr" } as Record<string, string>)[s.tipo] || "asis";

  function variacion(arr: Vals, med: string): Vals {
    return arr.map((x, i) => {
      if (!ok(x)) return null;
      let j = med === "vm" ? i - 1 : med === "via" ? i - 12 : i - +F[i].slice(5, 7); // vac: contra diciembre del año anterior
      if (med === "vm") { while (j >= 0 && i - j < 4 && !ok(arr[j])) j--; }          // series trimestrales
      const a = arr[j];
      return j >= 0 && ok(a) && a !== 0 ? (x / a - 1) * 100 : null;
    });
  }

  function transformar(s: Serie, arr: Vals, med: string): Vals {
    const b = base();
    const { IPC, FX } = b;
    const t = s.tipo;
    if (t === "tasa") {
      if (med === "tea") return arr.map((x) => ok(x) ? (Math.pow(1 + x / 1200, 12) - 1) * 100 : null);
      if (med === "real_a") return arr.map((x, i) => ok(x) && i >= 12 && ok(IPC[i]) && ok(IPC[i - 12]) ? (Math.pow(1 + x / 1200, 12) / ((IPC[i] as number) / (IPC[i - 12] as number)) - 1) * 100 : null);
      if (med === "real_m") return arr.map((x, i) => ok(x) && i >= 1 && ok(IPC[i]) && ok(IPC[i - 1]) ? ((1 + x / 1200) / ((IPC[i] as number) / (IPC[i - 1] as number)) - 1) * 100 : null);
      return arr.slice();
    }
    if (ES_VAR(med)) return variacion(arr, med);
    if (t === "none" || med === "asis") return arr.slice();
    if (t === "ars" || t === "idx") return arr.map((x, i) => {
      if (!ok(x)) return null;
      if (med === "corr") return x;
      if (med === "real") return mul(x, realAR(i));
      const [tipo, fx] = med.split("_");
      const f = FX[fx] ? FX[fx][i] : null;
      const usd = f ? x / f : null;
      return tipo === "usd" ? usd : mul(usd, realUS(i));
    });
    if (t === "fx") return arr.map((x, i) => !ok(x) ? null : med === "corr" ? x : med === "real" ? mul(x, realAR(i)) : mul(x, realAR(i), 1 / (realUS(i) as number)));
    if (t === "usd") return arr.map((x, i) => !ok(x) ? null : med === "corr" ? x : med === "usdr" ? mul(x, realUS(i))
      : med === "arscorr" ? mul(x, FX.oficial[i]) : mul(x, FX.oficial[i], realAR(i)));
    return arr.slice();
  }

  function unidadDe(s: SerieMeta, med: string): string {
    base();
    const u = s.u || "";
    if (s.tipo === "tasa") return ({ tea: "% efectiva anual (TEA)", real_a: "% real anual (TEA vs. inflación de 12 meses)", real_m: "% real mensual (vs. inflación del mes)" } as Record<string, string>)[med] || u;
    if (ES_VAR(med)) return ({ vm: "% de variación mensual", via: "% de variación interanual", vac: "% acumulado en el año" } as Record<string, string>)[med];
    if (s.tipo === "none" || med === "asis") return u;
    if (s.tipo === "idx") {
      if (med === "corr") return u;
      if (med === "real") return s.cat[0] === "Precios" ? `${u}, relativo al IPC general` : `${u}, descontada la inflación`;
      const [tipo, fx] = med.split("_");
      return `${u}, en dólares${tipo === "usdr" ? " reales" : ""} al ${FX_NOM[fx]}`;
    }
    if (s.tipo === "ars") {
      if (med === "corr") return u;
      if (med === "real") return u.replace("$", `$ de ${refAR}`);
      const [tipo, fx] = med.split("_");
      return u.replace("$", tipo === "usdr" ? `US$ de ${refUS}` : "US$") + ` (${FX_NOM[fx]})`;
    }
    if (s.tipo === "fx") return med === "corr" ? u : med === "real" ? `$ de ${refAR} por US$` : `$ de ${refAR} por US$, neto infl. EEUU`;
    if (s.tipo === "usd") return ({ corr: u, usdr: u.replace("US$", `US$ de ${refUS}`), arscorr: u.replace("US$", "$"), real: u.replace("US$", `$ de ${refAR}`) } as Record<string, string>)[med] || u;
    return u;
  }

  const nominalPesos = (s: Serie): Vals => s.tipo === "usd" ? s.vals.map((x, i) => mul(x, base().FX.oficial[i])) : s.vals;
  const relPermitido = (s: SerieMeta) => !s.agg && ((s.tipo === "ars" && (s.cat[0] === "Precios" || s.id.startsWith("can_"))) || s.tipo === "fx");
  const relDestino = (s: SerieMeta) => !s.agg && (s.tipo === "ars" || s.tipo === "fx");
  const escPermitidas = (s: SerieMeta): Opcion[] => {
    const b = base();
    return s.agg ? [["", "Total"], ...(b.POB ? [["pc", "Por habitante"] as Opcion] : []), ...(b.PIB_AN && s.tipo !== "none" ? [["pib", "% del PIB"] as Opcion] : [])] : [];
  };
  function suma12(arr: Vals): Vals {
    return arr.map((_, i) => {
      if (i < 11) return null;
      let t = 0;
      for (let k = i - 11; k <= i; k++) { const x = arr[k]; if (!ok(x)) return null; t += x; }
      return t;
    });
  }

  function calc(e: Expr): Calculo {
    const k = JSON.stringify(e);
    const hit = cache.get(k); if (hit) return hit;
    const b = base();
    const A = SER[e.id];
    let r: Omit<Calculo, "pct" | "serie">;
    const esc = escPermitidas(A).some((o) => o[0] === e.esc) ? (e.esc || "") : "";
    if (esc === "pib") {
      const [fa] = FACTOR_U(A.u || "");
      let nom = nominalPesos(A).map((x) => ok(x) ? x * fa / 1e6 : null);
      if (A.flujo) nom = suma12(nom);
      const PIB = b.PIB_AN as Vals;
      const v = nom.map((x, i) => ok(x) && ok(PIB[i]) && PIB[i] ? x / (PIB[i] as number) * 100 : null);
      r = { v, nombre: `${A.n} (% del PIB)`, corto: `${A.n}, % PIB`, unidad: A.flujo ? "% del PIB (suma de 12 meses / PIB de 12 meses)" : "% del PIB anual", dir: A.dir || 0, ultimo: !!A.flujo };
    } else if (e.rel && SER[e.rel] && relPermitido(A)) {
      const B2 = SER[e.rel];
      const a = nominalPesos(A), bb = nominalPesos(B2);
      let v = a.map((x, i) => ok(x) && ok(bb[i]) && x !== 0 && bb[i] !== 0 ? (e.modo === "medido" ? x / (bb[i] as number) : (bb[i] as number) / x) : null);
      const esIdx = A.tipo === "idx" || B2.tipo === "idx";
      if (esIdx) { const p = v.find(ok) as number; v = v.map((x) => ok(x) ? x / p * 100 : null); }
      const cant = (A.u || "").startsWith("$ por ") ? A.u.slice(6) : "unidades";
      const dirAB = Math.sign((B2.dir || 0) - (A.dir || 0));
      r = e.modo === "medido"
        ? { v, nombre: `${A.n} medido en ${B2.n}`, unidad: esIdx ? "índice (primer dato = 100)" : `veces "${B2.n}"`, dir: -dirAB, corto: "" }
        : { v, nombre: `${A.n}: cuánto se compra con 1 ${B2.n}`, unidad: esIdx ? "índice (primer dato = 100)" : `${cant} por cada ${B2.n}`, dir: dirAB, corto: "" };
      r.corto = e.modo === "medido" ? `${A.n} / ${B2.n}` : `${A.n} por ${B2.n}`;
    } else {
      const med = e.forzar || medidasDe(A).some((m) => m[0] === e.med) ? (e.med as string) : medDefault(A);
      r = { v: transformar(A, A.vals, med), nombre: A.n, corto: A.n, unidad: unidadDe(A, med), dir: A.dir || 0, flujo: !!A.flujo };
      if (A.mn && A.mx) { r.lo = transformar(A, A.mn, med); r.hi = transformar(A, A.mx, med); }
      if (esc === "pc") {
        const [fa, uu] = FACTOR_U(r.unidad);
        const POB = b.POB as Vals;
        const pc = (arr: Vals) => arr.map((x, i) => ok(x) && ok(POB[i]) ? x * fa / (POB[i] as number) : null);
        r.v = pc(r.v); if (r.lo && r.hi) { r.lo = pc(r.lo); r.hi = pc(r.hi); }
        r.unidad = `${uu.replace(/^personas$/, "")} por habitante`.trim(); r.nombre += " por habitante"; r.corto += " p/hab.";
      }
    }
    const res: Calculo = { ...r, pct: /%/.test(r.unidad) && !/\$/.test(r.unidad), serie: A };
    cache.set(k, res);
    return res;
  }

  const fmtC = (c: { pct: boolean }, x: number | null | undefined) => !ok(x) ? "–" : c.pct ? nf1.format(x) + " %" : fmtNum(x);
  const variacionTxt = (c: { pct: boolean }, desde: number | null, hasta: number | null) => {
    if (!ok(desde) || !ok(hasta)) return "–";
    if (c.pct) { const d = hasta - desde; return `${d > 0 ? "+" : ""}${nf1.format(d)} p.p.`; }
    if (desde === 0) return "–";
    const d = (hasta / desde - 1) * 100;
    return `${d > 0 ? "+" : ""}${Math.abs(d) >= 1000 ? nf0.format(d) : nf1.format(d)} %`;
  };

  return {
    F, N, SER, idxDe, agregar, calc, transformar, variacion, unidadDe, medidasDe, medDefault, esIndice, MONETARIA,
    relPermitido, relDestino, escPermitidas, nominalPesos, fmtC, variacionTxt,
    refs: () => { base(); return { refAR, refUS, REF_AR, REF_US }; },
    base,
    medFx: (): Opcion[] => medidasDe({ tipo: "fx", cat: [], dir: 0 } as unknown as SerieMeta),
    medArs: (): Opcion[] => medidasDe({ tipo: "ars", cat: [], dir: 0 } as unknown as SerieMeta),
  };
}
export type Motor = ReturnType<typeof crearMotor>;
