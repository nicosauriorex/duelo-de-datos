// Chequeo del semáforo de actividad: carga el JSON real, arma la tabla con lib/semaforo.ts en las dos medidas e imprime
// indicador × mes, la difusión, el resumen y los textos de la vista previa. Se corre a ojo, desde web/: npx tsx scripts/chequeo-semaforo.ts
// Con `--imagenes <carpeta>` además dibuja la imagen compartible en los tres formatos (PNG) para mirarla.
import fs from "node:fs";
import path from "node:path";
import { createCanvas, GlobalFonts } from "@napi-rs/canvas";
import { paletaDe } from "../lib/imagen-paleta";
import { armarImagenSemaforo, dibujarImagenSemaforo } from "../lib/imagen-semaforo";
import { FORMATOS } from "../lib/imagen";
import type { FormatoImg } from "../lib/config";
import { armarTabla, decodificar, textosPreviaSemaforo, txtMes, ultimoMesConVariacion, ultimoMesDato, variacionEn, escalaDe, MEDIDAS, type SemaforoCrudo } from "../lib/semaforo";

const archivo = path.resolve(__dirname, "..", "public", "datos", "semaforo.json");
if (!fs.existsSync(archivo)) { console.error("Falta " + archivo + ": correr antes el pipeline"); process.exit(1); }
const sem = decodificar(JSON.parse(fs.readFileSync(archivo, "utf8")) as SemaforoCrudo);
if (!sem) { console.error("Sin indicadores"); process.exit(1); }

let fallas = 0;
const espero = (que: string, bien: boolean) => { if (!bien) { fallas++; console.error("FALLA: " + que); } };

for (const [med, nombre] of MEDIDAS) {
  const t = armarTabla(sem, med);
  if (!t) { console.log(`\n=== ${nombre}: sin datos`); continue; }
  console.log(`\n=== ${nombre}: ${t.total} indicadores, columnas ${t.mesesTxt.join(" ")}`);
  for (const g of t.grupos) {
    console.log(`  [${g.grupo}]`);
    for (const f of g.filas) {
      const celdas = f.admite ? f.celdas.map((c) => (c ? `${c.txt}/${c.nivel}`.padStart(9) : "·".padStart(9))).join("") : "  solo interanual";
      console.log(`    ${f.ind.clave.padEnd(17)}${celdas}   último ${f.ultimo}  escala ${f.admite ? escalaDe(f.ind, med).toFixed(2) : "-"}`);
      // las cuentas cierran: la celda es la variación de los valores crudos, redondeada a un decimal
      if (f.admite) f.celdas.forEach((c, k) => {
        const m = t.meses[k], lista = med === "ia" ? f.ind.orig : f.ind.sa, ahora = lista[m - f.ind.mes0] ?? null, antes = lista[m - f.ind.mes0 - (med === "ia" ? 12 : 1)] ?? null;
        const bruta = ahora != null && antes != null && antes > 0 ? Math.round(((ahora / antes - 1) * 100) * 10) / 10 : null;
        espero(`${f.ind.clave} ${txtMes(m)}: celda ${c?.valor ?? null} contra cuenta directa ${bruta}`, (c?.valor ?? null) === bruta || (bruta != null && c != null && Math.abs(c.valor - bruta) <= 0.1001));
        espero(`${f.ind.clave} ${txtMes(m)}: texto sin "-0,0" ni "−0,0"`, !c || !/^[-−]0,0$/.test(c.txt));
        espero(`${f.ind.clave} ${txtMes(m)}: variacionEn coincide`, (variacionEn(f.ind, med, m) ?? null) === (c?.valor ?? null));
      });
    }
  }
  console.log("  DIFUSIÓN:  " + t.difusion.map((d) => `${txtMes(d.mes)} ${d.txtPct} (${d.suben}/${d.entran}${d.atenuada ? ", atenuada" : ""})`).join("  |  "));
  t.difusion.forEach((d, k) => {
    const celdas = t.grupos.flatMap((g) => g.filas).map((f) => f.celdas[k]).filter((c) => c != null);
    espero(`difusión ${txtMes(d.mes)}: entran ${d.entran} = ${celdas.length}`, d.entran === celdas.length);
    espero(`difusión ${txtMes(d.mes)}: suben ${d.suben} = ${celdas.filter((c) => c!.valor > 0).length}`, d.suben === celdas.filter((c) => c!.valor > 0).length);
  });
  console.log("  RESUMEN:   " + t.resumen + "  (columna " + t.mesesTxt[t.columnaResumen] + ")");
  const pv = textosPreviaSemaforo(t);
  console.log(`  PREVIA:    ${pv.titulo}\n             ${pv.descripcion} (${pv.descripcion.length} caracteres)`);
  const dist = [0, 0, 0, 0, 0];
  t.grupos.forEach((g) => g.filas.forEach((f) => f.celdas.forEach((c) => { if (c) dist[c.nivel]++; })));
  console.log(`  NIVELES de color (1..4): ${dist.slice(1).join(" ")}`);
  espero(`${nombre}: la última columna es el dato más nuevo de los indicadores de la medida`, t.meses[t.meses.length - 1] === Math.max(...t.grupos.flatMap((g) => g.filas).filter((f) => f.admite).map((f) => ultimoMesConVariacion(f.ind, med) ?? 0)));
  t.grupos.forEach((g) => g.filas.filter((f) => !f.admite).forEach((f) => espero(`${f.ind.clave}: "último dato" de una fila solo interanual sale de la serie original`, f.ultimo === (ultimoMesDato(f.ind, "ia") == null ? null : txtMes(ultimoMesDato(f.ind, "ia")!)))));
}

// borde del redondeo: "−0,0" no existe y un valor anterior cero o negativo no da variación
const probar = decodificar({ actualizado: "", control: [], indicadores: [{ clave: "x", grupo: "G", nombre: "X", fuente: "F", unidad: "u", ajuste: "ninguno", real: false, id: null, f0: "2025-01",
  orig: [100, 100.04, 99.96, 0, 5, -1, 3], sa: [100, 100.04, 99.96, 0, 5, -1, 3] }] })!.indicadores[0];
const esperado: [number, number | null][] = [[1, 0], [2, -0.1], [3, -100], [4, null], [5, -120], [6, null]];   // 100,04/100 → +0,04 → 0,0 (sin signo); 99,96/100,04 → −0,1; el anterior cero o negativo no da variación
for (const [k, e] of esperado) espero(`mes contra mes borde k=${k}: ${variacionEn(probar, "mm", probar.mes0 + k)} debía ser ${e}`, variacionEn(probar, "mm", probar.mes0 + k) === e);

// Imágenes de los tres formatos y de las dos medidas, para mirarlas: --imagenes <carpeta>
const iImg = process.argv.indexOf("--imagenes");
if (iImg > 0) {
  const carpeta = path.resolve(process.argv[iImg + 1] ?? "."), raiz = path.resolve(__dirname, "..");
  fs.mkdirSync(carpeta, { recursive: true });
  GlobalFonts.registerFromPath(path.join(raiz, "scripts", "fuentes", "Archivo-variable.ttf"), "Archivo");
  const css = fs.readFileSync(path.join(raiz, "app", "globals.css"), "utf8"), tok = new Map<string, string>();
  for (const b of css.matchAll(/:root,\s*\.fijo-oscuro\s*\{([^}]*)\}/g)) for (const d of b[1].replace(/\/\*[\s\S]*?\*\//g, "").matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) tok.set(d[1], d[2].trim());
  const token = (n: string) => { let v = tok.get(n) ?? ""; for (let k = 0; k < 10 && v.includes("var("); k++) v = v.replace(/var\((--[\w-]+)\)/g, (_, x: string) => tok.get(x) ?? ""); return v; };
  const pal = paletaDe(token, "Archivo", {});
  for (const [med] of MEDIDAS) {
    const t = armarTabla(sem, med)!;
    for (const f of ["1x1", "4x5", "16x9"] as FormatoImg[]) {
      const cv = createCanvas(FORMATOS[f].w, FORMATOS[f].h);
      dibujarImagenSemaforo(cv as never, armarImagenSemaforo(t, f), pal);
      fs.writeFileSync(path.join(carpeta, `semaforo-${med}-${f}.png`), cv.toBuffer("image/png"));
    }
  }
  console.log("Imágenes en " + carpeta);
}

if (fallas) { console.error(`\nCuentas que no cierran: ${fallas}`); process.exit(1); }
console.log("\nChequeo del semáforo: sin hallazgos.");
