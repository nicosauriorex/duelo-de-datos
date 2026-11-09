// Datos curiosos: se definen con los metadatos del catálogo (sin datos cargados) y se calculan recién al evaluarlos.
// Cada uno es una plantilla curada del grupo Destacadas (ver plantillas.ts). Port de CURIOS de src/app.js.
import { fmtMes, nf0, nf1, nf2, ok, lastIdx } from "./formato";
import { crearIndicadoresDe } from "./catalogo";
import type { Calculo, Expr, Motor, SerieMeta, Vals } from "./motor";

export interface ResCurio { val: string; d: string; e?: Expr; v?: Vals }
export interface DefCurio {
  id: string; k: string;
  ids: string[];                                  // series cuyos datos hacen falta
  e: Expr;                                        // vista por defecto (el cálculo puede devolver otra)
  etiquetas: string[];
  ev: (m: Motor, c: Calculo) => ResCurio | null;
}

export function defCurios(S: Record<string, SerieMeta>): DefCurio[] {
  const { X, INDIC_IPC } = crearIndicadoresDe(S);
  const pctTxt = (a: number, b: number) => { const d = (a / b - 1) * 100; return `${d > 0 ? "+" : ""}${nf0.format(d)} %`; };
  const extremos = (m: Motor, arr: Vals, desde = 0) => {
    let mn: number | null = null, mx: number | null = null, u: number | null = null;
    for (let i = desde; i < m.N; i++) {
      const x = arr[i];
      if (ok(x)) {
        if (mn == null || x < (arr[mn] as number)) mn = i;
        if (mx == null || x > (arr[mx] as number)) mx = i;
        u = i;
      }
    }
    return { mn: mn as number, mx: mx as number, u: u as number };
  };
  const lista: (DefCurio | null)[] = [];
  const def = (id: string, k: string, e: Expr | null, ev: DefCurio["ev"], etiquetas: string[] = [], ids?: string[]) => {
    if (!e) return;
    lista.push({ id, k, e, ev, etiquetas, ids: ids ?? [e.id, ...(e.rel ? [e.rel] : [])] });
  };

  def("asado-kilos-salario", "Kilos de asado que paga un salario mediano", X("pp_gba_asado", "", "", { rel: "sipa_med", med: "corr" }), (m, c) => {
    const { F } = m, x = extremos(m, c.v), v = c.v as number[];
    return { v: c.v, val: `${nf0.format(v[x.u])} kg`, d: `Récord: ${nf0.format(v[x.mx])} kg en ${fmtMes(F[x.mx])}. Mínimo: ${nf0.format(v[x.mn])} kg en ${fmtMes(F[x.mn])}.` };
  }, ["asado", "carne", "sueldo"]);
  def("dolares-blue-salario", "Dólares blue que compra un salario mediano", X("fx_blue", "", "", { rel: "sipa_med", med: "corr" }), (m, c) => {
    const { F } = m, x = extremos(m, c.v), v = c.v as number[];
    return { v: c.v, val: `US$ ${nf0.format(v[x.u])}`, d: `Máximo: US$ ${nf0.format(v[x.mx])} (${fmtMes(F[x.mx])}). Mínimo: US$ ${nf0.format(v[x.mn])} (${fmtMes(F[x.mn])}).` };
  }, ["sueldo blue", "dolar"]);
  def("salario-mediano-record", "Salario mediano real: dónde está hoy", X("sipa_med", "", "", { med: "real" }), (m, c) => {
    const { F } = m, x = extremos(m, c.v), v = c.v as number[];
    return { v: c.v, val: pctTxt(v[x.u], v[x.mx]), d: `contra su récord de ${fmtMes(F[x.mx])} (${m.fmtC(c, v[x.mx])} de hoy). Hoy: ${m.fmtC(c, v[x.u])}. Piso: ${fmtMes(F[x.mn])}.` };
  }, ["sueldo", "record"]);
  def("jubilacion-minima", "Jubilación mínima con bono, en pesos de hoy", X("jub_min_bono", "", "", { med: "real" }), (m, c) => {
    const { F } = m, x = extremos(m, c.v, m.idxDe("2003-01")), v = c.v as number[];
    return { v: c.v, val: m.fmtC(c, v[x.u]), d: `Máximo desde 2003: ${m.fmtC(c, v[x.mx])} en ${fmtMes(F[x.mx])} (hoy ${pctTxt(v[x.u], v[x.mx])}). Mínimo: ${fmtMes(F[x.mn])}.` };
  }, ["jubilados", "haber minimo"]);
  def("inflacion-maxima", "La inflación mensual más alta", X("inflacion", ""), (m, c) => {
    const { F, SER } = m, x = extremos(m, c.v), v = c.v as number[]; let def = 0; c.v.forEach((y) => { if (ok(y) && y < 0) def++; });
    return { v: c.v, val: `${nf1.format(v[x.mx])} %`, d: `en ${fmtMes(F[x.mx])}. Hubo ${def} meses con deflación desde ${fmtMes(F[SER.inflacion.i0])}. Último: ${nf1.format(v[x.u])} % (${fmtMes(F[x.u])}).` };
  }, ["precios", "hiperinflacion"]);

  const idsPP = Object.keys(S).filter((id) => id.startsWith("pp_gba_"));
  if (idsPP.length) def("producto-que-mas-subio", "El producto que más subió contra la inflación (GBA)", { id: idsPP[0], med: "real" }, (m) => {
    const { F, SER } = m;
    const pp = Object.values(SER).filter((s) => s.id.startsWith("pp_gba_")).map((s) => { const c = m.calc({ id: s.id, med: "real" }); const i0 = c.v.findIndex(ok), u = lastIdx(c.v); return i0 >= 0 ? { s, c, d: (c.v[u] as number) / (c.v[i0] as number) - 1, i0 } : null; })
      .filter(Boolean).sort((a, b) => b!.d - a!.d) as { s: typeof SER[string]; c: Calculo; d: number; i0: number }[];
    if (!pp.length) return null; const a = pp[0], z = pp[pp.length - 1];
    return { e: { id: a.s.id, med: "real" }, v: a.c.v, val: a.s.n.replace(" (GBA)", ""), d: `${pctTxt(1 + a.d, 1)} real desde ${fmtMes(F[a.i0])}. El que más bajó: ${z.s.n.replace(" (GBA)", "")} (${pctTxt(1 + z.d, 1)}).` };
  }, ["comida", "supermercado"], idsPP);

  if (INDIC_IPC.length) def("rubro-ipc-que-mas-subio", "El rubro del IPC que más se encareció", INDIC_IPC[0], (m) => {
    const { F } = m;
    const r = INDIC_IPC.filter((i) => m.SER[i.id]).map((i) => { const c = m.calc(i); const i0 = c.v.findIndex(ok), u = lastIdx(c.v); return i0 >= 0 ? { i, c, d: (c.v[u] as number) / (c.v[i0] as number) - 1, i0 } : null; })
      .filter(Boolean).sort((a, b) => b!.d - a!.d) as { i: typeof INDIC_IPC[number]; c: Calculo; d: number; i0: number }[];
    if (!r.length) return null; const a = r[0], z = r[r.length - 1];
    return { e: a.i, v: a.c.v, val: a.i.nombre.replace(" (precio real)", ""), d: `${pctTxt(1 + a.d, 1)} contra la inflación general desde ${fmtMes(F[a.i0])}. El que más se abarató: ${z.i.nombre.replace(" (precio real)", "")} (${pctTxt(1 + z.d, 1)}).` };
  }, ["precios", "rubros"], INDIC_IPC.map((i) => i.id));

  def("brecha-blue-record", "Brecha blue récord", X("brecha_blue", ""), (m, c) => {
    const { F } = m, x = extremos(m, c.v), v = c.v as number[]; let n50 = 0; c.v.forEach((y) => { if (ok(y) && y > 50) n50++; });
    return { v: c.v, val: `${nf0.format(v[x.mx])} %`, d: `en ${fmtMes(F[x.mx])}. ${n50} meses con brecha de más de 50 %. Hoy: ${nf1.format(v[x.u])} %.` };
  }, ["cepo", "dolar"]);
  def("dolar-oficial-pesos-de-hoy", "Dólar oficial en pesos de hoy", X("fx_oficial", "", "", { med: "real" }), (m, c) => {
    const { F } = m, x = extremos(m, c.v, m.idxDe("2002-01")), v = c.v as number[];
    return { v: c.v, val: m.fmtC(c, v[x.u]), d: `Más caro desde 2002: ${m.fmtC(c, v[x.mx])} (${fmtMes(F[x.mx])}). Más barato: ${m.fmtC(c, v[x.mn])} (${fmtMes(F[x.mn])}).` };
  }, ["dolar", "atraso cambiario"]);
  def("plazo-fijo-vs-inflacion", "¿El plazo fijo le gana a la inflación?", X("bcra_12", "", "", { med: "real_m" }), (m, c) => {
    const { F } = m; let pos = 0, tot = 0; c.v.forEach((y) => { if (ok(y)) { tot++; if (y > 0) pos++; } });
    return { v: c.v, val: `${nf0.format(pos / tot * 100)} % de los meses`, d: `Desde ${fmtMes(F[c.v.findIndex(ok)])}, ${pos} de ${tot} meses rindió más que la inflación del mes.` };
  }, ["plazo fijo", "tasa", "ahorro"]);
  def("riesgo-pais-records", "Riesgo país: récords", X("riesgo", ""), (m, c) => {
    const { F } = m, x = extremos(m, c.v), v = c.v as number[];
    return { v: c.v, val: `${nf0.format(v[x.u])} pb`, d: `Máximo: ${nf0.format(v[x.mx])} pb (${fmtMes(F[x.mx])}). Mínimo: ${nf0.format(v[x.mn])} pb (${fmtMes(F[x.mn])}).` };
  });
  def("reservas-bcra-dolares-de-hoy", "Reservas brutas del BCRA (en dólares de hoy)", X("bcra_1", "", "", { med: "usdr" }), (m, c) => {
    const { F } = m, x = extremos(m, c.v), v = c.v as number[];
    return { v: c.v, val: `US$ ${nf0.format(v[x.u] / 1000)} mil M`, d: `Récord: US$ ${nf0.format(v[x.mx] / 1000)} mil millones en ${fmtMes(F[x.mx])}. Piso: ${fmtMes(F[x.mn])}.` };
  });
  def("pib-por-habitante-dolares", "PIB por habitante en dólares", S.pib_nom ? { id: "pib_nom", med: "usd_oficial", esc: "pc" } : null, (m) => {
    const { F, SER } = m, POB = m.base().POB, FX = m.base().FX;
    if (!SER.pib_nom || !POB) return null; const pn = SER.pib_nom.vals;
    const v: Vals = pn.map((x, i) => ok(x) && ok(FX.oficial[i]) && ok(POB[i]) ? x * 1e6 / (FX.oficial[i] as number) / (POB[i] as number) : null);
    const x = extremos(m, v); if (x.u == null) return null; const vb = (pn[x.u] as number) * 1e6 / (FX.blue[x.u] as number) / (POB[x.u] as number), vv = v as number[];
    return { v, val: `US$ ${nf0.format(vv[x.u])}`, d: `al oficial (${fmtMes(F[x.u])}); al blue, US$ ${nf0.format(vb)}. Máximo al oficial: US$ ${nf0.format(vv[x.mx])} (${fmtMes(F[x.mx])}).` };
  }, ["pbi", "riqueza"]);
  def("desocupacion-peor-y-mejor", "Desocupación: el peor y el mejor momento", X("dg_42_3_eph_puntuatal_0_m_30", ""), (m, c) => {
    const { F } = m, x = extremos(m, c.v), v = c.v as number[];
    return { v: c.v, val: `${nf1.format(v[x.u])} %`, d: `hoy (${fmtMes(F[x.u])}). Máximo: ${nf1.format(v[x.mx])} % (${fmtMes(F[x.mx])}). Mínimo: ${nf1.format(v[x.mn])} % (${fmtMes(F[x.mn])}).` };
  }, ["desempleo", "paro", "trabajo"]);
  def("pobreza-personas", "Pobreza (personas)", X("pob_tasa_pobreza_personas", ""), (m, c) => {
    const { F } = m, x = extremos(m, c.v), v = c.v as number[];
    return { v: c.v, val: `${nf1.format(v[x.u])} %`, d: `último semestre. Máximo de la serie: ${nf1.format(v[x.mx])} % (${fmtMes(F[x.mx])}); mínimo: ${nf1.format(v[x.mn])} % (${fmtMes(F[x.mn])}).` };
  }, ["pobres"]);
  def("anios-con-superavit-primario", "Años con superávit primario", X("dg_379_9_superavit_017_23_94", "", "", { esc: "pib" }), (m, c) => {
    const { F } = m; const anios: Record<string, number> = {};
    F.forEach((fe, i) => { const x = c.v[i]; if (fe.endsWith("-12") && ok(x)) anios[fe.slice(0, 4)] = x; });
    const sup = Object.entries(anios).filter(([, y]) => y > 0).map(([a]) => a);
    return { v: c.v, val: `${sup.length} de ${Object.keys(anios).length}`, d: `Desde ${Object.keys(anios)[0] || "–"}: ${sup.join(", ") || "ninguno"}. Último (12 meses): ${nf1.format(c.v[lastIdx(c.v)] as number)} % del PIB.` };
  }, ["deficit", "superavit", "gasto"]);
  def("compras-del-bcra-12-meses", "Dólares que compró el BCRA en 12 meses", X("bcra_78", ""), (m, c) => {
    const { F } = m, u = lastIdx(c.v); let s12 = 0; for (let i = u - 11; i <= u; i++) { const x = c.v[i]; if (ok(x)) s12 += x; }
    return { v: c.v, val: `US$ ${nf0.format(s12)} M`, d: `hasta ${fmtMes(F[u])}. Negativo = vendió.` };
  }, ["reservas", "compra de dolares"]);
  def("merval-en-dolares-ccl", "Merval en dólares CCL", X("mk_merv", "", "", { med: "usd_ccl" }), (m, c) => {
    const { F } = m, x = extremos(m, c.v, m.idxDe("2003-01")), v = c.v as number[];
    return { v: c.v, val: `US$ ${nf0.format(v[x.u])}`, d: `Máximo: US$ ${nf0.format(v[x.mx])} (${fmtMes(F[x.mx])}). Mínimo: US$ ${nf0.format(v[x.mn])} (${fmtMes(F[x.mn])}).` };
  }, ["bolsa", "acciones"]);
  def("salario-saca-de-la-pobreza", "¿Un salario mediano saca de la pobreza a una familia de 4?", X("can_cbt_h2", "", "", { rel: "sipa_med", med: "corr" }), (m, c) => {
    const { F } = m, x = extremos(m, c.v), v = c.v as number[];
    return { v: c.v, val: `${nf2.format(v[x.u])} canastas`, d: `${v[x.u] >= 1 ? "Sí" : "No"}: hoy cubre ${nf0.format(v[x.u] * 100)} % de la canasta total. Máximo: ${nf2.format(v[x.mx])} (${fmtMes(F[x.mx])}).` };
  }, ["canasta", "linea de pobreza", "sueldo"]);
  const ea = X("dg_151_1_aariadotac_2012_m_26", ""), eb = X("dg_151_1_aariadodad_2012_m_30", "");
  if (ea && eb) def("empleo-privado-vs-publico", "Empleo formal privado vs. público desde 2012", ea, (m, ca) => {
    const { F } = m, cb = m.calc(eb);
    const ua = lastIdx(ca.v), i0 = ca.v.findIndex(ok), ub = lastIdx(cb.v), j0 = cb.v.findIndex(ok);
    const A = ca.v as number[], B = cb.v as number[];
    return { v: ca.v, val: `${pctTxt(A[ua], A[i0])} privado`, d: `Asalariados privados registrados: ${pctTxt(A[ua], A[i0])}; públicos: ${pctTxt(B[ub], B[j0])} (${fmtMes(F[i0])} a ${fmtMes(F[ua])}).` };
  }, ["trabajo", "estado", "empleados publicos"], [ea.id, eb.id]);
  return lista.filter(Boolean) as DefCurio[];
}

// ---------------------------------------------------------------- Curiosidades generadas por presidente
import { baseIdx, nivelComparable, statsMandato, type Pres } from "./estadisticas";
import type { BaseCfg } from "./config";
import type { Indic } from "./catalogo";

export type TipoCurio = "mejor" | "peor" | "record" | "contraste";
export interface CurioGen {
  id: string; pres: Pres; tema: string; tipo: TipoCurio; bueno: boolean;
  frase: string; valor: string; e: Expr; v: Vals; desde: string; hasta: string; enCurso: boolean;
}
export const TIPOS_CURIO: [TipoCurio, string][] = [["mejor", "Mejor nivel"], ["peor", "Peor nivel"], ["record", "Récord"], ["contraste", "Contraste"]];
const MIN_MESES = 12;

/** Curiosidades sobre los indicadores y los productos de GBA. Todos los presidentes se evalúan con las mismas reglas:
 *  hace falta que el indicador tenga al menos 12 meses de datos en el mandato y que el nivel sea comparable entre épocas. */
export function generarCuriosidades(m: Motor, PRES: Pres[], INDIC: Indic[], INDIC_PP: Indic[], b: BaseCfg): CurioGen[] {
  const F = m.F, out: CurioGen[] = [];
  const ultimo = F.length - 1;
  const ultMes = (v: Vals) => { for (let i = ultimo; i >= 0; i--) if (ok(v[i])) return i; return ultimo; };
  const hasta = (p: Pres, v: Vals) => fmtMes(F[Math.min(p.i1, ultMes(v))]);
  const enCurso = (p: Pres) => p.i1 >= ultimo;
  const suf = (p: Pres, v: Vals) => (enCurso(p) ? ` (hasta ${hasta(p, v)})` : "");
  const mandato = (p: Pres) => ({ desde: F[baseIdx(F, p, b)], hasta: F[p.i1] });
  const quien = (p: Pres) => (p.id === "menem1" || p.id === "menem2" || p.id === "cfk1" || p.id === "cfk2" ? p.n.replace(/ (\d)$/, " (mandato $1)") : p.n);

  [...INDIC, ...INDIC_PP].forEach((ind) => {
    if (!m.SER[ind.id] || (ind.rel && !m.SER[ind.rel])) return;
    const c = m.calc(ind);
    if (!c.dir) return;
    const comparable = c.pct || nivelComparable(m, ind);
    if (!comparable) return;
    const sts = PRES.map((p) => statsMandato(F, c.v, p, b));
    const con = PRES.map((p, k) => (sts[k].n >= MIN_MESES ? k : -1)).filter((k) => k >= 0);
    if (con.length < 3) return;
    const tema = ind.grupo, nombre = (ind.nombre || c.corto).replace(/ \(precio real\)$/, "");
    const clave = ind.id + (ind.rel || "") + (ind.esc || "") + (ind.med || "");
    // mejor y peor nivel
    const prom = (k: number) => (sts[k].prom as number) * c.dir;
    const mejor = con.reduce((a, k) => (prom(k) > prom(a) ? k : a)), peor = con.reduce((a, k) => (prom(k) < prom(a) ? k : a));
    ([[mejor, "mejor"], [peor, "peor"]] as [number, TipoCurio][]).forEach(([k, tipo]) => {
      const p = PRES[k];
      out.push({
        id: `${tipo}-${clave}`, pres: p, tema, tipo, bueno: tipo === "mejor",
        frase: `Con ${quien(p)}, ${nombre} tuvo el ${tipo === "mejor" ? "mejor" : "peor"} promedio de todos los mandatos${suf(p, c.v)}`,
        valor: m.fmtC(c, sts[k].prom), e: ind, v: c.v, ...mandato(p), enCurso: enCurso(p),
      });
    });
    // récord histórico (máximo y mínimo de toda la serie)
    let imx = -1, imn = -1;
    c.v.forEach((x, i) => { if (!ok(x)) return; if (imx < 0 || x > (c.v[imx] as number)) imx = i; if (imn < 0 || x < (c.v[imn] as number)) imn = i; });
    ([[imx, "máximo"], [imn, "mínimo"]] as [number, string][]).forEach(([i, cual]) => {
      if (i < 0 || imx === imn) return;
      const k = PRES.findIndex((p) => i >= p.i0 && i <= p.i1);
      if (k < 0 || sts[k].n < MIN_MESES) return;
      const p = PRES[k], bueno = (cual === "máximo") === (c.dir > 0);
      out.push({
        id: `record-${cual}-${clave}`, pres: p, tema, tipo: "record", bueno,
        frase: `El ${cual === "máximo" ? "récord" : "mínimo"} histórico de ${nombre} (${m.fmtC(c, c.v[i])}, ${fmtMes(F[i])}) fue con ${quien(p)}, y es ${bueno ? "bueno" : "malo"}`,
        valor: m.fmtC(c, c.v[i]), e: ind, v: c.v, ...mandato(p), enCurso: enCurso(p),
      });
    });
  });

  // contraste: producto más barato (precio real) con uno y mayor poder de compra por salario con otro
  INDIC_PP.forEach((ind) => {
    const sal = m.SER.sipa_med; if (!sal || !m.SER[ind.id]) return;
    const eSal: Expr = { id: ind.id, med: "corr", rel: "sipa_med", modo: "compra", esc: "" };
    const cP = m.calc(ind), cS = m.calc(eSal);
    const stP = PRES.map((p) => statsMandato(F, cP.v, p, b)), stS = PRES.map((p) => statsMandato(F, cS.v, p, b));
    const con = PRES.map((_, k) => (stP[k].n >= MIN_MESES && stS[k].n >= MIN_MESES ? k : -1)).filter((k) => k >= 0);
    if (con.length < 3) return;
    const barato = con.reduce((a, k) => ((stP[k].prom as number) < (stP[a].prom as number) ? k : a));
    const compra = con.reduce((a, k) => ((stS[k].prom as number) > (stS[a].prom as number) ? k : a));
    if (barato === compra) return;
    const prod = (ind.nombre || cP.corto).replace(/ \(precio real\)$/, "");
    const P = PRES[barato], Q = PRES[compra];
    out.push({
      id: `contraste-${ind.id}`, pres: P, tema: "Productos (precio real, GBA)", tipo: "contraste", bueno: true,
      frase: `Con ${quien(P)}, ${prod} fue el más barato en pesos de hoy${suf(P, cP.v)}, pero el salario mediano compraba más con ${quien(Q)}${suf(Q, cS.v)}`,
      valor: m.fmtC(cP, stP[barato].prom), e: ind, v: cP.v, ...mandato(P), enCurso: enCurso(P),
    });
  });
  return out;
}

/** Selección pareja: de a una buena y una mala por presidente, del más reciente al más antiguo (con 0 de un lado se muestra lo que haya). */
export function mezclarCurios(todas: CurioGen[], PRES: Pres[]): CurioGen[] {
  const res: CurioGen[] = [];
  PRES.slice().reverse().forEach((p) => {
    const de = todas.filter((c) => c.pres.id === p.id);
    const buenas = de.filter((c) => c.bueno), malas = de.filter((c) => !c.bueno);
    const alt = (a: CurioGen[], otra?: CurioGen) => a.find((c) => !otra || c.e.id !== otra.e.id) || a[0];
    const b1 = alt(buenas), m1 = alt(malas, b1);
    [b1, m1].forEach((c) => { if (c) res.push(c); });
  });
  return res;
}
