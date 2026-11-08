// Datos curiosos (tarjetas de Curiosidades). Port de CURIOS de src/app.js.
import { fmtMes, nf0, nf1, nf2, ok, lastIdx } from "./formato";
import { crearIndicadores } from "./catalogo";
import type { Expr, Motor, Vals } from "./motor";

export interface Curio { e: Expr; v: Vals; k: string; val: string; d: string }

export function crearCurios(m: Motor): Curio[] {
  const { F, N, SER, calc, fmtC, idxDe } = m;
  const { X, INDIC_IPC } = crearIndicadores(m);
  const POB = m.base().POB, FX = m.base().FX;
  const pctTxt = (a: number, b: number) => { const d = (a / b - 1) * 100; return `${d > 0 ? "+" : ""}${nf0.format(d)} %`; };
  const extremos = (arr: Vals, desde = 0) => {
    let mn: number | null = null, mx: number | null = null, u: number | null = null;
    for (let i = desde; i < N; i++) {
      const x = arr[i];
      if (ok(x)) {
        if (mn == null || x < (arr[mn] as number)) mn = i;
        if (mx == null || x > (arr[mx] as number)) mx = i;
        u = i;
      }
    }
    return { mn: mn as number, mx: mx as number, u: u as number };
  };
  const f: (() => Curio | null)[] = [
    () => { const e = X("pp_gba_asado", "", "", { rel: "sipa_med", med: "corr" }); if (!e) return null; const c = calc(e), x = extremos(c.v), v = c.v as number[];
      return { e, v: c.v, k: "Kilos de asado que paga un salario mediano", val: `${nf0.format(v[x.u])} kg`, d: `Récord: ${nf0.format(v[x.mx])} kg en ${fmtMes(F[x.mx])}. Mínimo: ${nf0.format(v[x.mn])} kg en ${fmtMes(F[x.mn])}.` }; },
    () => { const e = X("fx_blue", "", "", { rel: "sipa_med", med: "corr" }); if (!e) return null; const c = calc(e), x = extremos(c.v), v = c.v as number[];
      return { e, v: c.v, k: "Dólares blue que compra un salario mediano", val: `US$ ${nf0.format(v[x.u])}`, d: `Máximo: US$ ${nf0.format(v[x.mx])} (${fmtMes(F[x.mx])}). Mínimo: US$ ${nf0.format(v[x.mn])} (${fmtMes(F[x.mn])}).` }; },
    () => { const e = X("sipa_med", "", "", { med: "real" }); if (!e) return null; const c = calc(e), x = extremos(c.v), v = c.v as number[];
      return { e, v: c.v, k: "Salario mediano real: dónde está hoy", val: pctTxt(v[x.u], v[x.mx]), d: `contra su récord de ${fmtMes(F[x.mx])} (${fmtC(c, v[x.mx])} de hoy). Hoy: ${fmtC(c, v[x.u])}. Piso: ${fmtMes(F[x.mn])}.` }; },
    () => { const e = X("jub_min_bono", "", "", { med: "real" }); if (!e) return null; const c = calc(e), x = extremos(c.v, idxDe("2003-01")), v = c.v as number[];
      return { e, v: c.v, k: "Jubilación mínima con bono, en pesos de hoy", val: fmtC(c, v[x.u]), d: `Máximo desde 2003: ${fmtC(c, v[x.mx])} en ${fmtMes(F[x.mx])} (hoy ${pctTxt(v[x.u], v[x.mx])}). Mínimo: ${fmtMes(F[x.mn])}.` }; },
    () => { const e = X("inflacion", ""); if (!e) return null; const c = calc(e), x = extremos(c.v), v = c.v as number[]; let def = 0; c.v.forEach((y) => { if (ok(y) && y < 0) def++; });
      return { e, v: c.v, k: "La inflación mensual más alta", val: `${nf1.format(v[x.mx])} %`, d: `en ${fmtMes(F[x.mx])}. Hubo ${def} meses con deflación desde ${fmtMes(F[SER.inflacion.i0])}. Último: ${nf1.format(v[x.u])} % (${fmtMes(F[x.u])}).` }; },
    () => { const pp = Object.values(SER).filter((s) => s.id.startsWith("pp_gba_")).map((s) => { const c = calc({ id: s.id, med: "real" }); const i0 = c.v.findIndex(ok), u = lastIdx(c.v); return i0 >= 0 ? { s, c, d: (c.v[u] as number) / (c.v[i0] as number) - 1, i0 } : null; })
        .filter(Boolean).sort((a, b) => b!.d - a!.d) as { s: typeof SER[string]; c: ReturnType<typeof calc>; d: number; i0: number }[];
      if (!pp.length) return null; const a = pp[0], z = pp[pp.length - 1];
      return { e: { id: a.s.id, med: "real" }, v: a.c.v, k: "El producto que más subió contra la inflación (GBA)", val: a.s.n.replace(" (GBA)", ""), d: `${pctTxt(1 + a.d, 1)} real desde ${fmtMes(F[a.i0])}. El que más bajó: ${z.s.n.replace(" (GBA)", "")} (${pctTxt(1 + z.d, 1)}).` }; },
    () => { const r = INDIC_IPC.map((i) => { const c = calc(i); const i0 = c.v.findIndex(ok), u = lastIdx(c.v); return i0 >= 0 ? { i, c, d: (c.v[u] as number) / (c.v[i0] as number) - 1, i0 } : null; })
        .filter(Boolean).sort((a, b) => b!.d - a!.d) as { i: typeof INDIC_IPC[number]; c: ReturnType<typeof calc>; d: number; i0: number }[];
      if (!r.length) return null; const a = r[0], z = r[r.length - 1];
      return { e: a.i, v: a.c.v, k: "El rubro del IPC que más se encareció", val: a.i.nombre.replace(" (precio real)", ""), d: `${pctTxt(1 + a.d, 1)} contra la inflación general desde ${fmtMes(F[a.i0])}. El que más se abarató: ${z.i.nombre.replace(" (precio real)", "")} (${pctTxt(1 + z.d, 1)}).` }; },
    () => { const e = X("brecha_blue", ""); if (!e) return null; const c = calc(e), x = extremos(c.v), v = c.v as number[]; let n50 = 0; c.v.forEach((y) => { if (ok(y) && y > 50) n50++; });
      return { e, v: c.v, k: "Brecha blue récord", val: `${nf0.format(v[x.mx])} %`, d: `en ${fmtMes(F[x.mx])}. ${n50} meses con brecha de más de 50 %. Hoy: ${nf1.format(v[x.u])} %.` }; },
    () => { const e = X("fx_oficial", "", "", { med: "real" }); if (!e) return null; const c = calc(e), x = extremos(c.v, idxDe("2002-01")), v = c.v as number[];
      return { e, v: c.v, k: "Dólar oficial en pesos de hoy", val: fmtC(c, v[x.u]), d: `Más caro desde 2002: ${fmtC(c, v[x.mx])} (${fmtMes(F[x.mx])}). Más barato: ${fmtC(c, v[x.mn])} (${fmtMes(F[x.mn])}).` }; },
    () => { const e = X("bcra_12", "", "", { med: "real_m" }); if (!e) return null; const c = calc(e); let pos = 0, tot = 0; c.v.forEach((y) => { if (ok(y)) { tot++; if (y > 0) pos++; } });
      return { e, v: c.v, k: "¿El plazo fijo le gana a la inflación?", val: `${nf0.format(pos / tot * 100)} % de los meses`, d: `Desde ${fmtMes(F[c.v.findIndex(ok)])}, ${pos} de ${tot} meses rindió más que la inflación del mes.` }; },
    () => { const e = X("riesgo", ""); if (!e) return null; const c = calc(e), x = extremos(c.v), v = c.v as number[];
      return { e, v: c.v, k: "Riesgo país: récords", val: `${nf0.format(v[x.u])} pb`, d: `Máximo: ${nf0.format(v[x.mx])} pb (${fmtMes(F[x.mx])}). Mínimo: ${nf0.format(v[x.mn])} pb (${fmtMes(F[x.mn])}).` }; },
    () => { const e = X("bcra_1", "", "", { med: "usdr" }); if (!e) return null; const c = calc(e), x = extremos(c.v), v = c.v as number[];
      return { e, v: c.v, k: "Reservas brutas del BCRA (en dólares de hoy)", val: `US$ ${nf0.format(v[x.u] / 1000)} mil M`, d: `Récord: US$ ${nf0.format(v[x.mx] / 1000)} mil millones en ${fmtMes(F[x.mx])}. Piso: ${fmtMes(F[x.mn])}.` }; },
    () => { if (!SER.pib_nom || !POB) return null; const pn = SER.pib_nom.vals;
      const v: Vals = pn.map((x, i) => ok(x) && ok(FX.oficial[i]) && ok(POB[i]) ? x * 1e6 / (FX.oficial[i] as number) / (POB[i] as number) : null);
      const x = extremos(v); if (x.u == null) return null; const vb = (pn[x.u] as number) * 1e6 / (FX.blue[x.u] as number) / (POB[x.u] as number), vv = v as number[];
      return { e: { id: "pib_nom", med: "usd_oficial", esc: "pc" }, v, k: "PIB por habitante en dólares", val: `US$ ${nf0.format(vv[x.u])}`, d: `al oficial (${fmtMes(F[x.u])}); al blue, US$ ${nf0.format(vb)}. Máximo al oficial: US$ ${nf0.format(vv[x.mx])} (${fmtMes(F[x.mx])}).` }; },
    () => { const e = X("dg_42_3_eph_puntuatal_0_m_30", ""); if (!e) return null; const c = calc(e), x = extremos(c.v), v = c.v as number[];
      return { e, v: c.v, k: "Desocupación: el peor y el mejor momento", val: `${nf1.format(v[x.u])} %`, d: `hoy (${fmtMes(F[x.u])}). Máximo: ${nf1.format(v[x.mx])} % (${fmtMes(F[x.mx])}). Mínimo: ${nf1.format(v[x.mn])} % (${fmtMes(F[x.mn])}).` }; },
    () => { const e = X("pob_tasa_pobreza_personas", ""); if (!e) return null; const c = calc(e), x = extremos(c.v), v = c.v as number[];
      return { e, v: c.v, k: "Pobreza (personas)", val: `${nf1.format(v[x.u])} %`, d: `último semestre. Máximo de la serie: ${nf1.format(v[x.mx])} % (${fmtMes(F[x.mx])}); mínimo: ${nf1.format(v[x.mn])} % (${fmtMes(F[x.mn])}).` }; },
    () => { const e = X("dg_379_9_superavit_017_23_94", "", "", { esc: "pib" }); if (!e) return null; const c = calc(e); const anios: Record<string, number> = {};
      F.forEach((fe, i) => { const x = c.v[i]; if (fe.endsWith("-12") && ok(x)) anios[fe.slice(0, 4)] = x; });
      const sup = Object.entries(anios).filter(([, y]) => y > 0).map(([a]) => a);
      return { e, v: c.v, k: "Años con superávit primario", val: `${sup.length} de ${Object.keys(anios).length}`, d: `Desde ${Object.keys(anios)[0] || "–"}: ${sup.join(", ") || "ninguno"}. Último (12 meses): ${nf1.format(c.v[lastIdx(c.v)] as number)} % del PIB.` }; },
    () => { const e = X("bcra_78", ""); if (!e) return null; const c = calc(e), u = lastIdx(c.v); let s12 = 0; for (let i = u - 11; i <= u; i++) { const x = c.v[i]; if (ok(x)) s12 += x; }
      return { e, v: c.v, k: "Dólares que compró el BCRA en 12 meses", val: `US$ ${nf0.format(s12)} M`, d: `hasta ${fmtMes(F[u])}. Negativo = vendió.` }; },
    () => { const e = X("mk_merv", "", "", { med: "usd_ccl" }); if (!e) return null; const c = calc(e), x = extremos(c.v, idxDe("2003-01")), v = c.v as number[];
      return { e, v: c.v, k: "Merval en dólares CCL", val: `US$ ${nf0.format(v[x.u])}`, d: `Máximo: US$ ${nf0.format(v[x.mx])} (${fmtMes(F[x.mx])}). Mínimo: US$ ${nf0.format(v[x.mn])} (${fmtMes(F[x.mn])}).` }; },
    () => { const e = X("can_cbt_h2", "", "", { rel: "sipa_med", med: "corr" }); if (!e) return null; const c = calc(e), x = extremos(c.v), v = c.v as number[];
      return { e, v: c.v, k: "¿Un salario mediano saca de la pobreza a una familia de 4?", val: `${nf2.format(v[x.u])} canastas`, d: `${v[x.u] >= 1 ? "Sí" : "No"}: hoy cubre ${nf0.format(v[x.u] * 100)} % de la canasta total. Máximo: ${nf2.format(v[x.mx])} (${fmtMes(F[x.mx])}).` }; },
    () => { const a = X("dg_151_1_aariadotac_2012_m_26", ""), b = X("dg_151_1_aariadodad_2012_m_30", ""); if (!a || !b) return null; const ca = calc(a), cb = calc(b);
      const ua = lastIdx(ca.v), i0 = ca.v.findIndex(ok), ub = lastIdx(cb.v), j0 = cb.v.findIndex(ok);
      const A = ca.v as number[], B = cb.v as number[];
      return { e: a, v: ca.v, k: "Empleo formal privado vs. público desde 2012", val: `${pctTxt(A[ua], A[i0])} privado`, d: `Asalariados privados registrados: ${pctTxt(A[ua], A[i0])}; públicos: ${pctTxt(B[ub], B[j0])} (${fmtMes(F[i0])} a ${fmtMes(F[ua])}).` }; },
  ];
  return f.map((g) => { try { return g(); } catch { return null; } }).filter(Boolean) as Curio[];
}
