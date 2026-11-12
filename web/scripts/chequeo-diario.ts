// Chequeo del parte diario del Banco Central: carga el JSON real, calcula el parte con lib/diario.ts e imprime cada variable
// (valor, fecha, comparaciones y frases) y el texto para copiar. Se corre a ojo, desde web/: npx tsx scripts/chequeo-diario.ts
import fs from "node:fs";
import path from "node:path";
import { armarParte, decodificar, textoParte, textosPreviaParte, type DiarioCrudo } from "../lib/diario";

const archivo = path.resolve(__dirname, "..", "public", "datos", "diario_bcra.json");
if (!fs.existsSync(archivo)) { console.error("Falta " + archivo + ": correr antes el pipeline"); process.exit(1); }
const diario = decodificar(JSON.parse(fs.readFileSync(archivo, "utf8")) as DiarioCrudo);
const p = armarParte(diario);
if (!p) { console.error("Sin datos"); process.exit(1); }

console.log(`PARTE DEL ${p.fechaTxt}  (actualizado ${p.actualizado}; atrasadas: ${p.atrasadas.join(", ") || "ninguna"})\n`);
for (const v of p.variables) {
  console.log(`== ${v.nombre} [${v.unidad}] ${v.atrasada ? "(ATRASADA) " : ""}`);
  console.log(`   ${v.etiqueta ? v.etiqueta + " " : ""}${v.valor}  | dato del ${v.fechaTxt}  | cls ${v.cls} | anterior ${v.anteriorCorto} -> ${v.difAnterior ?? "-"} ${v.pctAnterior ?? ""} (${v.clsAnterior})`);
  for (const f of v.filas) console.log(`   - ${f.rotulo} (${f.nota}): ${f.valor}${f.sub ? " / " + f.sub : ""}  [${f.cls}]`);
  for (const f of v.frases) console.log(`   * ${f}`);
  console.log(`   spark: ${v.spark.length} datos, de ${v.spark[0]} a ${v.spark[v.spark.length - 1]}`);
}
console.log("\n--- TEXTO PARA COPIAR ---\n" + textoParte(p));
const pv = textosPreviaParte(p);
console.log(`\n--- VISTA PREVIA ---\n${pv.titulo}\n${pv.descripcion} (${pv.descripcion.length} caracteres)`);
