// "Preguntale a los datos": oraciones con huecos y los links que arman. Pura lógica, sin React.
import { FX_KEYS, FX_NOM, type Calculo, type Expr, type Motor, type SerieMeta, type Vals } from "./motor";
import { PRES_DEF, claseVariacion, crearPres, statsMandato } from "./estadisticas";
import type { BaseCfg } from "./config";
import { fmtMes, lastIdx, nf0, nf1, ok, r1 } from "./formato";
import type { DeltaProps } from "@/components/sistema/Delta";
import { encExpr } from "./url";
import { todosLosPrincipales, hrefDato, hrefHistorico, type Principal } from "./temas";

export type Opcion = [string, string];
const minus = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

/** Cómo se nombra una variable dentro de una oración. */
const ROTULOS: Record<string, string> = {
  sipa_med: "salario mediano", sipa_prom: "salario promedio", smvm: "salario mínimo", jub_min: "jubilación mínima", ripte: "salario promedio de empleos estables (RIPTE)",
  ipc_gba_01_1_2_coicop: "la carne", ipc_gba_04_1_1_coicop: "los alquileres",
};
export const rotulo = (id: string, S: Record<string, SerieMeta>): string =>
  ROTULOS[id] ?? (S[id] ? minus(S[id].n.replace(/ \((GBA|Nacional)\)$/, "").replace(/^IPC /, "")) : id);

/** Preposición + texto con la contracción que corresponde: "a" + "el riesgo país" → "al riesgo país", "de" + "el salario" → "del salario" (nunca "a el" ni "de el"). */
export const contraer = (prep: "a" | "de", texto: string): string => {
  const t = texto.trim();
  if (/^el(\s|$)/i.test(t)) return (prep === "a" ? "al" : "del") + t.slice(2);
  return `${prep} ${t}`;
};

export const SALARIOS = ["sipa_med", "sipa_prom", "smvm", "jub_min", "ripte"];
const ids = (S: Record<string, SerieMeta>, f: (s: SerieMeta) => boolean) => Object.values(S).filter(f).map((s) => s.id);

/** Qué compra el salario: productos, canastas y dólares. */
export const idsCompra = (S: Record<string, SerieMeta>) =>
  ids(S, (s) => s.id.startsWith("pp_gba_") || s.id.startsWith("can_") || (FX_KEYS as readonly string[]).some((k) => s.id === "fx_" + k));
/** Los ítems de "¿Cuánto … compra un …?" ya ordenados y con sus separadores: Canastas, Precios promedio (una sección por categoría) y Dólares. */
export interface SeccionCompra { grupo: "Canastas" | "Precios promedio" | "Dólares"; categoria?: string; ids: string[] }
export function seccionesCompra(S: Record<string, SerieMeta>, ids: string[]): SeccionCompra[] {
  const nombre = (id: string) => rotulo(id, S);
  const porNombre = (a: string, b: string) => nombre(a).localeCompare(nombre(b), "es");
  const out: SeccionCompra[] = [];
  const canastas = ids.filter((i) => i.startsWith("can_") && S[i]).sort(porNombre);
  if (canastas.length) out.push({ grupo: "Canastas", ids: canastas });
  const cats = new Map<string, string[]>();
  ids.filter((i) => i.startsWith("pp_gba_") && S[i]).forEach((i) => { const c = S[i].cat[3] ?? "Otros"; if (!cats.has(c)) cats.set(c, []); cats.get(c)!.push(i); });
  [...cats].sort((a, b) => a[0].localeCompare(b[0], "es")).forEach(([c, v]) => out.push({ grupo: "Precios promedio", categoria: c.replace(/^\d+\s+/, ""), ids: v.sort(porNombre) }));
  const dolares = (FX_KEYS as readonly string[]).map((k) => "fx_" + k).filter((i) => ids.includes(i) && S[i]);
  if (dolares.length) out.push({ grupo: "Dólares", ids: dolares });
  return out;
}
/** Montos en pesos: salarios, canastas y productos. */
export const idsMontos = (S: Record<string, SerieMeta>) =>
  [...SALARIOS.filter((i) => S[i]), ...ids(S, (s) => s.id.startsWith("can_") || s.id.startsWith("pp_gba_"))];
/** Precios para comparar: productos y rubros del IPC (nacional y GBA). */
export const idsPrecios = (S: Record<string, SerieMeta>) =>
  ids(S, (s) => s.id.startsWith("pp_gba_") || (s.tipo === "idx" && s.cat[1]?.startsWith("IPC INDEC") && (s.cat[2] === "Nacional" || s.cat[2] === "GBA") && s.id !== "ipc_nacional"));

export const MEDIDAS_DOLAR: Opcion[] = [["real", "pesos de hoy"], ...FX_KEYS.map((k) => ["usdr_" + k, `dólares ${FX_NOM[k]}`] as Opcion)];
export const PRESIDENTES: Opcion[] = PRES_DEF.slice().reverse().map((p) => [p.id, p.n]);
export const anios = (hasta: number): Opcion[] => Array.from({ length: hasta - 1995 + 1 }, (_, k) => String(1995 + k)).map((a) => [a, a]);

const e = (id: string, extra: Partial<Expr> = {}): Expr => ({ id, rel: null, modo: "compra", esc: "", ...extra });

// ---- los links de cada oración
// Una pregunta sobre una sola variable abre la ficha del dato (/dato/: Histórico, Por presidente y Meses de mandato, R11).
// Con un período ("desde [año]") o con dos variables se queda en Histórico, que es la vista que responde eso.
/** ¿Cuánto [producto] compra un [salario]? Una variable (el producto medido en salarios): la ficha. */
export const hrefCompra = (producto: string, salario: string) =>
  hrefDato(e(producto, { rel: salario, med: "corr" }));
/** ¿Cómo le fue a [indicador] con [presidente]? La ficha de esa variable con el presidente resaltado en la tabla y sumado a Meses de mandato. */
export const hrefPresidente = (p: Principal, presidente: string) =>
  hrefDato(p, PRES_DEF.some((x) => x.id === presidente) ? { pd: presidente } : {});
/** ¿Cómo cambió [indicador] desde [año]? Histórico desde ese año (la ficha no recorta el período). */
export const hrefDesde = (p: Principal, anio: string) => hrefHistorico(p, { d: `${anio}-01` });
/** ¿Cómo evolucionó [monto] en [medida]? Una variable con su medida: la ficha. */
export const hrefMedida = (id: string, med: string) => hrefDato(e(id, { med }));
/** ¿Qué subió más: [a] o [b]? Dos variables: Histórico en base 100, contra la inflación. */
export const hrefSubio = (a: string, b: string) =>
  `/historico/?${new URLSearchParams({ v: [e(a, { med: "real" }), e(b, { med: "real" })].map(encExpr).join(","), m: "b100" }).toString()}`;

export { todosLosPrincipales };

// ---- las respuestas en el lugar (funciones puras sobre el Motor; las cuentas salen de los valores mostrados)
/** Lo que se dibuja bajo una pregunta: cifra grande, fecha y detalle, minigráfico (desde `desde`) y cambios. */
export interface Respuesta { cifra: string; fecha?: string; detalle?: string; v?: Vals; desde?: number; deltas?: DeltaProps[] }

const signo = (d: number): 1 | -1 | 0 => (d > 0 ? 1 : d < 0 ? -1 : 0);
/** Un cambio entre dos valores del mismo cálculo, con el texto del motor y el tono según la dirección de la variable. */
function deltaDe(m: Motor, c: Calculo, antes: number, ahora: number, contra?: string): DeltaProps {
  const txt = m.variacionTxt(c, antes, ahora);
  const d = c.pct ? r1(ahora) - r1(antes) : Math.abs(antes ? (ahora / antes - 1) * 100 : 0) < 0.05 ? 0 : ahora - antes;
  // El triángulo sigue al signo del texto que se muestra (con base negativa, el cociente invierte el signo de la resta)
  const porTexto = /^\+/.test(txt) ? 1 : /^[−-]/.test(txt) ? -1 : null;
  return { texto: txt, tono: claseVariacion(c.dir, c.pct, antes, ahora), dir: txt === "–" ? 0 : porTexto ?? signo(d), contra };
}
const ultimo = (c: Calculo): number => lastIdx(c.v);
const sinCalcular = (m: Motor, e: Expr) => !m.SER[e.id] || (!!e.rel && !m.SER[e.rel]);

/** ¿Cuánto [producto] compra un [salario]? El último valor de "producto medido en salarios". */
export function respuestaCompra(m: Motor, producto: string, salario: string): Respuesta | null {
  const ex = e(producto, { rel: salario, med: "corr" });
  if (sinCalcular(m, ex)) return null;
  try {
    const c = m.calc(ex), u = ultimo(c);
    if (u < 0) return null;
    const ant = c.v[u - 12];
    // Como el gráfico listo de la misma cuenta ("110 kg", lib/curiosidades.ts): entero desde 100 y con la unidad corta ("kg", "litros")
    const x = c.v[u] as number, unidad = c.unidad.split(" ")[0];
    const cifra = (Math.abs(x) >= 100 ? nf0 : nf1).format(x) + (unidad && unidad.length <= 8 && !/^\d/.test(unidad) ? " " + unidad : "");
    return {
      cifra, fecha: fmtMes(m.F[u]), detalle: c.unidad, v: c.v, desde: m.idxDe("2003-01"),
      deltas: ok(ant) ? [deltaDe(m, c, ant, c.v[u] as number, "vs hace un año")] : undefined,
    };
  } catch { return null; }
}

/** ¿Cómo le fue a [indicador] con [presidente]? Inicio → cierre del mandato; si es una tasa, el promedio (no la variación entre dos meses, D-023). */
export function respuestaPresidente(m: Motor, p: Principal, presidente: string, base: BaseCfg): Respuesta | null {
  if (sinCalcular(m, p)) return null;
  try {
    const pr = crearPres(m.F).find((x) => x.id === presidente);
    if (!pr) return null;
    const c = m.calc(p), st = statsMandato(m.F, c.v, pr, base);
    if (!ok(st.ini) || !ok(st.fin) || st.iniI == null || st.finI == null) return null;
    const rango = `${fmtMes(m.F[st.iniI])} → ${fmtMes(m.F[st.finI])}`;
    const cifra = `${m.fmtC(c, st.ini)} → ${m.fmtC(c, st.fin)}`;
    if (c.pct) {
      return { cifra, fecha: rango, detalle: `Promedio del mandato de ${pr.n}: ${m.fmtC(c, st.prom)}`, v: c.v, desde: pr.i0 };
    }
    return { cifra, fecha: rango, detalle: `Mandato de ${pr.n}`, v: c.v, desde: pr.i0, deltas: [deltaDe(m, c, st.ini, st.fin)] };
  } catch { return null; }
}

/** ¿Cómo cambió [indicador] desde [año]? El primer valor desde enero de ese año → el último. */
export function respuestaDesde(m: Motor, p: Principal, anio: string): Respuesta | null {
  if (sinCalcular(m, p)) return null;
  try {
    const c = m.calc(p), u = ultimo(c), i0 = Math.max(0, m.idxDe(`${anio}-01`));
    let j = i0;
    while (j < u && !ok(c.v[j])) j++;
    if (u < 0 || j >= u || !ok(c.v[j])) return null;
    return {
      cifra: `${m.fmtC(c, c.v[j])} → ${m.fmtC(c, c.v[u])}`, fecha: `${fmtMes(m.F[j])} → ${fmtMes(m.F[u])}`, detalle: c.unidad, v: c.v, desde: j,
      deltas: [deltaDe(m, c, c.v[j] as number, c.v[u] as number)],
    };
  } catch { return null; }
}

/** ¿Cómo evolucionó [monto] en [medida]? El último valor en esa medida y su cambio contra hace un año. */
export function respuestaMedida(m: Motor, monto: string, med: string): Respuesta | null {
  const ex = e(monto, { med });
  if (sinCalcular(m, ex)) return null;
  try {
    const c = m.calc(ex), u = ultimo(c);
    if (u < 0) return null;
    const ant = c.v[u - 12];
    // Montos en pesos o dólares: entero desde 100 y con la moneda adelante ("US$ 1.205"); el resto, con el formato del motor
    const x = c.v[u] as number, unidad = c.unidad.split(" ")[0];
    const cifra = /^(US\$|\$)/.test(unidad) ? `${unidad} ${(Math.abs(x) >= 100 ? nf0 : nf1).format(x)}` : m.fmtC(c, x);
    return {
      cifra, fecha: fmtMes(m.F[u]), detalle: c.unidad, v: c.v, desde: m.idxDe("2003-01"),
      deltas: ok(ant) ? [deltaDe(m, c, ant, c.v[u] as number, "vs hace un año")] : undefined,
    };
  } catch { return null; }
}

/** ¿Qué subió más: [a] o [b]? Variación real acumulada de cada uno desde el primer mes en que los dos tienen dato, hasta el último mes en que los dos tienen. */
export function respuestaSubio(m: Motor, a: string, b: string, S: Record<string, SerieMeta>): Respuesta | null {
  const ea = e(a, { med: "real" }), eb = e(b, { med: "real" });
  if (sinCalcular(m, ea) || sinCalcular(m, eb)) return null;
  try {
    const ca = m.calc(ea), cb = m.calc(eb);
    const n = Math.min(ca.v.length, cb.v.length);
    let s = -1, u = -1;
    for (let i = 0; i < n; i++) if (ok(ca.v[i]) && ok(cb.v[i])) { if (s < 0) s = i; u = i; }
    if (s < 0 || u <= s) return null;
    const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
    const na = rotulo(a, S), nb = rotulo(b, S);
    // El % que se muestra (1 decimal) es el que se compara: si dan igual, se dice igual.
    const pa = r1(((ca.v[u] as number) / (ca.v[s] as number) - 1) * 100), pb = r1(((cb.v[u] as number) / (cb.v[s] as number) - 1) * 100);
    const txt = (x: number) => `${x > 0 ? "+" : x < 0 ? "−" : ""}${nf1.format(Math.abs(x))} %`;
    const plural = (t: string) => /^(los|las)\s/.test(t);
    // Si los dos bajaron en pesos de hoy, el que "ganó" bajó menos: decirlo así (palabras neutras, D-012)
    const [ga, pe] = pa > pb ? [na, nb] : [nb, na], verbo = (t: string, uno: string, varios: string) => (plural(t) ? varios : uno);
    const cifra = pa === pb ? `${cap(na)} y ${nb} ${pa < 0 ? "bajaron" : "subieron"} igual`
      : Math.max(pa, pb) < 0 ? `${cap(ga)} ${verbo(ga, "bajó", "bajaron")} menos que ${pe}`
      : `${cap(ga)} ${verbo(ga, "subió", "subieron")} más que ${pe}`;
    return {
      cifra, fecha: `${fmtMes(m.F[s])} → ${fmtMes(m.F[u])}`, detalle: "Variación en pesos de hoy, desde el primer mes con datos de los dos",
      deltas: [
        { texto: txt(pa), tono: "neutro", dir: signo(pa), contra: na },
        { texto: txt(pb), tono: "neutro", dir: signo(pb), contra: nb },
      ],
    };
  } catch { return null; }
}
