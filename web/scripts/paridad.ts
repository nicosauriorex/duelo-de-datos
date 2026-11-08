// Comprueba que los módulos TS (web/lib) dan el mismo resultado que src/app.js (sitio viejo), dentro de 1e-9.
// Se corre con: npm run paridad   (usa web/public/datos/ y datos/datos.js; sin red)
// Descartable: se borra junto con src/ al cortar.
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { crearMotor, normalizarMeta, type SerieDatos, type SerieMeta, type Expr } from "../lib/motor";

const RAIZ = path.resolve(__dirname, "..", "..");
const dir = path.join(RAIZ, "web", "public", "datos");
const cat = JSON.parse(fs.readFileSync(path.join(dir, "catalogo.json"), "utf8")) as { fechas: string[]; series: SerieMeta[] };

// ---- motor nuevo
const nuevo = crearMotor(cat.fechas);
const archivos = [...new Set(cat.series.map((s) => s.archivo))];
for (const a of archivos) nuevo.agregar(cat.series.filter((s) => s.archivo === a), JSON.parse(fs.readFileSync(path.join(dir, a + ".json"), "utf8")) as Record<string, SerieDatos>);

// ---- motor viejo: las primeras 180 líneas de src/app.js (datos + medidas + calc) son código puro
const js = fs.readFileSync(path.join(RAIZ, "datos", "datos.js"), "utf8");
const DATOS = JSON.parse(js.slice("window.DATOS = ".length).trim().replace(/;$/, ""));
const app = fs.readFileSync(path.join(RAIZ, "src", "app.js"), "utf8").split("\n").slice(0, 180).join("\n");
const ctx: any = { window: { DATOS }, Intl, Math, JSON, Map, Set, Array, Object, String, Number, isFinite, console };
vm.createContext(ctx);
const viejo: any = vm.runInContext(app + "\n;({calc, SER, medidasDe, escPermitidas, relPermitido, relDestino, variacionTxt, fmtC, unidadDe})", ctx);

let n = 0, malos = 0;
const mal = (msg: string) => { malos++; if (malos <= 25) console.log("DIFERENCIA:", msg); };
function comparar(e: Expr, etiqueta: string) {
  const a = viejo.calc(JSON.parse(JSON.stringify(e))), b = nuevo.calc(e);
  n++;
  for (const campo of ["v", "lo", "hi"] as const) {
    const x = a[campo], y = (b as any)[campo];
    if ((x == null) !== (y == null)) { mal(`${etiqueta} ${campo}: presencia`); return; }
    if (!x) continue;
    if (x.length !== y.length) { mal(`${etiqueta} ${campo}: largo`); return; }
    for (let i = 0; i < x.length; i++) {
      const p = x[i], q = y[i];
      const np = p == null || !isFinite(p), nq = q == null || !isFinite(q);
      if (np !== nq || (!np && Math.abs(p - q) > 1e-9 * Math.max(1, Math.abs(p)))) { mal(`${etiqueta} ${campo}[${i}] viejo=${p} nuevo=${q}`); return; }
    }
  }
  for (const campo of ["nombre", "corto", "unidad", "dir", "pct"]) if (a[campo] !== (b as any)[campo]) { mal(`${etiqueta} ${campo}: "${a[campo]}" vs "${(b as any)[campo]}"`); return; }
}

const metas = cat.series.map(normalizarMeta);
for (const s of metas) {
  const A = viejo.SER[s.id], medsV = viejo.medidasDe(A).map((m: string[]) => m[0]), medsN = nuevo.medidasDe(s).map((m) => m[0]);
  if (JSON.stringify(medsV) !== JSON.stringify(medsN)) mal(`${s.id}: medidas ${medsV} vs ${medsN}`);
  for (const med of medsV) comparar({ id: s.id, med }, `${s.id}/${med}`);
  const escV = viejo.escPermitidas(A).map((o: string[]) => o[0]), escN = nuevo.escPermitidas(s).map((o) => o[0]);
  if (JSON.stringify(escV) !== JSON.stringify(escN)) mal(`${s.id}: escalas`);
  for (const esc of escV) if (esc) for (const med of medsV.slice(0, 3)) comparar({ id: s.id, med, esc }, `${s.id}/${med}/${esc}`);
  if (viejo.relPermitido(A) !== nuevo.relPermitido(s)) mal(`${s.id}: relPermitido`);
}
// "en términos de": precios y dólar contra salarios, canastas, dólar y otros precios (ambos modos)
const destinos = ["sipa_med", "sipa_prom", "fx_blue", "fx_oficial", "can_cbt_h2", "pp_gba_asado"].filter((id) => nuevo.SER[id]);
for (const s of metas.filter((m) => viejo.relPermitido(viejo.SER[m.id])))
  for (const rel of destinos) for (const modo of ["compra", "medido"]) comparar({ id: s.id, med: "corr", rel, modo }, `${s.id} en ${rel} (${modo})`);
// textos de formato
const c1 = nuevo.calc({ id: "sipa_med", med: "real" }), c2 = viejo.calc({ id: "sipa_med", med: "real" });
for (const [d, h] of [[100, 150], [0, 5], [5, 0], [null, 3], [1000, 40000]] as const)
  if (nuevo.variacionTxt(c1, d as any, h as any) !== viejo.variacionTxt(c2, d, h)) mal(`variacionTxt(${d},${h})`);

console.log(`Series: ${metas.length} (viejo ${DATOS.series.length}). Comparaciones de calc: ${n}. Diferencias: ${malos}.`);
process.exit(malos ? 1 : 0);
