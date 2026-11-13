// Vista previa de los links en redes (docs/specs/vista-previa-links.md). Se corre con `npm run previas` desde `web/`, después de que el
// pipeline escribió los JSON de `public/datos/` y antes de `npm run build`.
// Por cada dato fijo (lib/datos-fijos.ts) dibuja la imagen del Histórico de su ficha —el mismo dibujo y los mismos datos que "Compartir"
// en la página— y la guarda en `public/previas/<slug>.png`. Además escribe `public/previas/_datos.json` (título, descripción y fecha de
// cada dato: lo lee `generateMetadata` de /dato/<slug>/) y `public/previas/sitio.png` (imagen general).
//
// Tamaño 1200 × 630: la composición es la del formato horizontal (16:9) de la imagen compartible, dibujada a 1600 × 840 (la misma
// proporción que 1200 × 630, un poco más baja que 1600 × 900) y reducida. Colores: los tokens oscuros de app/globals.css. Tipografía:
// Archivo (scripts/fuentes/, licencia OFL), la misma del sitio, en ancho normal como la usa el canvas del navegador.
import fs from "node:fs";
import path from "node:path";
import { createCanvas, GlobalFonts } from "@napi-rs/canvas";
import { crearMotor, normalizarMeta, BASE_IDS, type Motor, type SerieDatos, type SerieMeta } from "../lib/motor";
import { DATOS_FIJOS, PLACAS, SLUGS_RETIRADOS, mismaVariable, type DatoFijo } from "../lib/datos-fijos";
import { TEMAS, idsDe, todosLosPrincipales } from "../lib/temas";
import { contextoDato } from "../lib/contexto-dato";
import { armarImagen, tituloVariable } from "../lib/imagen-datos";
import { dibujarImagen, type LienzoCanvas } from "../lib/imagen";
import { dibujarImagenSitio } from "../lib/imagen-sitio";
import { paletaDe } from "../lib/imagen-paleta";
import { historicoFicha } from "../lib/ficha";
import { baseDeConfig, DEFECTO, IMAGEN_DEFECTO } from "../lib/config";
import { PRES_DEF } from "../lib/estadisticas";
import { CARPETA_PREVIAS, DESCRIPCION_SITIO, PREVIA, textosPrevia, type DatosPrevias, type PreviaDato, type PreviaGasto, type PreviaHerencia, type PreviaParte, type PreviaSemaforo, type PreviaUniversidades } from "../lib/previas";
import { armarParte, decodificar, isoDeDia, textosPreviaParte, type DiarioCrudo } from "../lib/diario";
import { armarImagenParte } from "../lib/imagen-parte";
import { armarTabla, decodificar as decodificarSemaforo, isoDeMes, mesResumen, textosPreviaSemaforo, type SemaforoCrudo } from "../lib/semaforo";
import { armarImagenSemaforo, dibujarImagenSemaforo } from "../lib/imagen-semaforo";
import { armarImagenPres } from "../lib/imagen-presidentes";
import { anioDefecto, armarImagenGasto, armarVista, crearDeflactor, decodificarAnio, decodificarIndice, textosPreviaGasto } from "../lib/gasto";
import { anioDefectoU, armarImagenU, armarVistaU, crearContexto, decodificarUniv, textosPreviaU } from "../lib/universidades";
import { BASE_HERENCIA, idsHerencia, tablaHerencia, textosPreviaHerencia } from "../lib/herencia";
import type { DatoInforme, DatosInformes, ReservasNetas } from "../lib/herencia-informes";

const RAIZ = path.resolve(__dirname, "..");
const DATOS = path.join(RAIZ, "public", "datos");
const SALIDA = path.join(RAIZ, "public", CARPETA_PREVIAS);
const FUENTE = path.join(RAIZ, "scripts", "fuentes", "Archivo-variable.ttf");
const FAMILIA = "Archivo";
/** La composición horizontal se dibuja a este tamaño (proporción de 1200 × 630) y se reduce. */
const DIBUJO = { w: 1600, h: Math.round((1600 * PREVIA.h) / PREVIA.w) };

const inicio = Date.now();
const avisos: string[] = [];
const avisar = (t: string) => { avisos.push(t); console.warn("Aviso: " + t); };
const fallar = (t: string): never => { console.error("Error: " + t); process.exit(1); };

// ---------------------------------------------------------------- tipografía y paleta
function registrarFuente() {
  if (!fs.existsSync(FUENTE)) fallar(`falta la fuente ${FUENTE}`);
  GlobalFonts.registerFromPath(FUENTE, FAMILIA);
  // Si la fuente no se cargó, el canvas usa una de reserva: se nota en el ancho del texto.
  const x = createCanvas(10, 10).getContext("2d"), muestra = "PRIMERO LOS DATOS 1,9 %";
  x.font = `900 40px ${FAMILIA}`; const a = x.measureText(muestra).width;
  x.font = `900 40px FuenteQueNoExiste`; const b = x.measureText(muestra).width;
  x.font = `400 40px ${FAMILIA}`; const c = x.measureText(muestra).width;
  if (!GlobalFonts.has(FAMILIA) || a === b || a === c) fallar("la fuente Archivo no se pudo usar (el texto saldría con una fuente de reemplazo)");
}

/** Tokens oscuros de globals.css (los bloques `:root, .fijo-oscuro`), con las referencias `var(--x)` resueltas. */
function tokensOscuros(): (n: string) => string {
  const css = fs.readFileSync(path.join(RAIZ, "app", "globals.css"), "utf8");
  const t = new Map<string, string>();
  for (const bloque of css.matchAll(/:root,\s*\.fijo-oscuro\s*\{([^}]*)\}/g)) {
    for (const d of bloque[1].replace(/\/\*[\s\S]*?\*\//g, "").matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) t.set(d[1], d[2].trim());
  }
  return (n: string) => {
    let v = t.get(n) ?? "";
    for (let i = 0; i < 10 && v.includes("var("); i++) v = v.replace(/var\((--[\w-]+)\)/g, (_, k: string) => t.get(k) ?? "");
    if (!v) fallar(`el token ${n} no está en los bloques oscuros de globals.css`);
    return v;
  };
}

// ---------------------------------------------------------------- datos
function leerJson<T>(archivo: string): T {
  const p = path.join(DATOS, archivo);
  if (!fs.existsSync(p)) fallar(`no está ${p}: correr antes el pipeline (python pipeline/obtener_datos.py --solo-json)`);
  return JSON.parse(fs.readFileSync(p, "utf8")) as T;
}

function cargarMotor(fijos: DatoFijo[]): { m: Motor; metas: SerieMeta[] } {
  const cat = leerJson<{ fechas: string[]; series: SerieMeta[] }>("catalogo.json");
  const metas = cat.series.map(normalizarMeta);
  const m = crearMotor(cat.fechas);
  const porId = new Map(metas.map((s) => [s.id, s]));
  const archivos = new Set(["base"]);
  fijos.forEach((d) => idsDe(d.e).forEach((id) => { const a = porId.get(id)?.archivo; if (a) archivos.add(a); }));
  for (const a of archivos) m.agregar(metas.filter((s) => s.archivo === a), leerJson<Record<string, SerieDatos>>(`${a}.json`));
  if (!BASE_IDS.every((id) => m.SER[id])) fallar("faltan series base en base.json");
  return { m, metas };
}

/** Controles de la lista de datos fijos: slugs únicos, bien escritos y no retirados; principales y placas con su dato fijo. */
function revisarLista(metas: SerieMeta[]) {
  const vistos = new Set<string>();
  for (const d of DATOS_FIJOS) {
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(d.slug)) fallar(`slug mal escrito: "${d.slug}"`);
    if (vistos.has(d.slug)) fallar(`slug repetido: "${d.slug}"`);
    if (SLUGS_RETIRADOS.includes(d.slug)) fallar(`el slug "${d.slug}" está retirado y no se puede reutilizar`);
    vistos.add(d.slug);
  }
  DATOS_FIJOS.forEach((a, i) => DATOS_FIJOS.slice(i + 1).forEach((b) => { if (mismaVariable(a.e, b.e)) fallar(`"${a.slug}" y "${b.slug}" son la misma variable`); }));
  const S = Object.fromEntries(metas.map((s) => [s.id, s]));
  for (const p of todosLosPrincipales(S)) if (!DATOS_FIJOS.some((d) => mismaVariable(d.e, p))) avisar(`el principal "${p.nombre}" (${p.id}, ${p.med}${p.esc ? ", " + p.esc : ""}) no tiene dato fijo en lib/datos-fijos.ts`);
  for (const [k, e] of Object.entries(PLACAS)) if (!DATOS_FIJOS.some((d) => mismaVariable(d.e, e))) avisar(`la placa "${k}" de la portada no tiene dato fijo`);
}

/** Nombre público del dato: el del principal del tema si lo es; si no, el título de la imagen (nombre y medida). */
function nombreDe(m: Motor, d: DatoFijo): string {
  const p = todosLosPrincipales(m.SER).find((x) => mismaVariable(x, d.e));
  return p ? p.nombre : tituloVariable(m, d.e, m.calc(d.e));
}

// ---------------------------------------------------------------- dibujo
function aPng(dibujar: (c: LienzoCanvas) => void, tam: { w: number; h: number }): Buffer {
  const grande = createCanvas(tam.w, tam.h);
  dibujar(grande as unknown as LienzoCanvas);
  if (tam.w === PREVIA.w && tam.h === PREVIA.h) return grande.toBuffer("image/png");
  const chica = createCanvas(PREVIA.w, PREVIA.h), ctx = chica.getContext("2d");
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "high";
  ctx.drawImage(grande, 0, 0, PREVIA.w, PREVIA.h);
  return chica.toBuffer("image/png");
}

/** Imagen y textos del parte diario del Banco Central (/bcra/): `previas/bcra.png` y `previas/bcra.json`. Si falta `diario_bcra.json`, avisa y sigue. */
function previaDelParte(pal: ReturnType<typeof paletaDe>): boolean {
  const archivo = path.join(DATOS, "diario_bcra.json");
  if (!fs.existsSync(archivo)) { avisar("no está diario_bcra.json: se saltea la imagen del parte del Banco Central (/bcra/ usa la imagen general)"); return false; }
  try {
    const parte = armarParte(decodificar(JSON.parse(fs.readFileSync(archivo, "utf8")) as DiarioCrudo));
    if (!parte) { avisar("diario_bcra.json no trae datos: se saltea la imagen del parte del Banco Central"); return false; }
    const datos = armarImagenParte(parte, "16x9");
    fs.writeFileSync(path.join(SALIDA, "bcra.png"), aPng((cv) => dibujarImagen(cv, datos, pal, DIBUJO), DIBUJO));
    const { titulo, descripcion } = textosPreviaParte(parte), fecha = isoDeDia(parte.dia);
    const previa: PreviaParte = { titulo, descripcion, fecha, imagen: `/${CARPETA_PREVIAS}/bcra.png?v=${fecha}` };
    fs.writeFileSync(path.join(SALIDA, "bcra.json"), JSON.stringify(previa, null, 1));
    console.log(`bcra: ${titulo}
  ${descripcion}`);
    return true;
  } catch (err) {
    avisar(`parte del Banco Central: ${(err as Error).message}`);
    return false;
  }
}

/** Imagen y textos del semáforo de actividad (/semaforo/): `previas/semaforo.png` y `previas/semaforo.json`. Si falta `semaforo.json`, avisa y sigue. */
function previaDelSemaforo(pal: ReturnType<typeof paletaDe>): boolean {
  const archivo = path.join(DATOS, "semaforo.json");
  if (!fs.existsSync(archivo)) { avisar("no está semaforo.json: se saltea la imagen del semáforo de actividad (/semaforo/ usa la imagen general)"); return false; }
  try {
    const sem = decodificarSemaforo(JSON.parse(fs.readFileSync(archivo, "utf8")) as SemaforoCrudo);
    const tabla = sem && armarTabla(sem, "ia");
    if (!tabla) { avisar("semaforo.json no trae datos: se saltea la imagen del semáforo de actividad"); return false; }
    const datos = armarImagenSemaforo(tabla, "16x9");
    fs.writeFileSync(path.join(SALIDA, "semaforo.png"), aPng((cv) => dibujarImagenSemaforo(cv, datos, pal, DIBUJO), DIBUJO));
    const { titulo, descripcion } = textosPreviaSemaforo(tabla), fecha = isoDeMes(mesResumen(tabla));
    const previa: PreviaSemaforo = { titulo, descripcion, fecha, imagen: `/${CARPETA_PREVIAS}/semaforo.png?v=${fecha}` };
    fs.writeFileSync(path.join(SALIDA, "semaforo.json"), JSON.stringify(previa, null, 1));
    console.log(`semaforo: ${titulo}
  ${descripcion}`);
    return true;
  } catch (err) {
    avisar(`semáforo de actividad: ${(err as Error).message}`);
    return false;
  }
}

/** Imagen y textos de la herencia (/herencia/), con el presidente en funciones: `previas/herencia.png` y `previas/herencia.json`.
 *  Es la misma imagen que arma "Compartir" en la página (lib/imagen-presidentes.ts, tipo "herencia"). Si algo falla, avisa y sigue. */
function previaDeHerencia(m: Motor, metas: SerieMeta[], pal: ReturnType<typeof paletaDe>): boolean {
  try {
    const ids = idsHerencia().filter((id) => metas.some((s) => s.id === id));
    const archivos = new Set(ids.map((id) => metas.find((s) => s.id === id)!.archivo));
    for (const a of archivos) m.agregar(metas.filter((s) => s.archivo === a), leerJson<Record<string, SerieDatos>>(`${a}.json`));
    const presId = PRES_DEF[PRES_DEF.length - 1].id, t = tablaHerencia(m, presId);
    // datos de informes (fase 2): si el archivo no está, la imagen sale solo con las series, como la página
    let informes: DatoInforme[] = [];
    if (fs.existsSync(path.join(DATOS, "herencia_informes.json"))) informes = leerJson<DatosInformes>("herencia_informes.json").datos ?? [];
    else avisar("herencia: sin herencia_informes.json, la imagen va sin los datos de informes");
    const rn = fs.existsSync(path.join(DATOS, "reservas_netas.json")) ? leerJson<ReservasNetas>("reservas_netas.json") : null;
    const datos = t && armarImagenPres(m, { tipo: "herencia", presId, ids, base: BASE_HERENCIA, informes, rn }, { formato: "16x9", comentario: "" });
    if (!t || !datos) { avisar("herencia: no hay datos para armar la imagen (/herencia/ usa la imagen general)"); return false; }
    fs.writeFileSync(path.join(SALIDA, "herencia.png"), aPng((cv) => dibujarImagen(cv, datos, pal, DIBUJO), DIBUJO));
    const ult = Math.max(...t.filas.map((f) => f.entrego?.i ?? -1)), fecha = m.F[Math.max(0, ult)];
    const { titulo, descripcion } = textosPreviaHerencia(t);
    const previa: PreviaHerencia = { titulo, descripcion, fecha, imagen: `/${CARPETA_PREVIAS}/herencia.png?v=${fecha}` };
    fs.writeFileSync(path.join(SALIDA, "herencia.json"), JSON.stringify(previa, null, 1));
    console.log(`herencia: ${titulo}
  ${descripcion}`);
    return true;
  } catch (err) {
    avisar(`herencia: ${(err as Error).message}`);
    return false;
  }
}

/** Imagen y textos del gasto de la Nación (/gasto/), con la vista de entrada (último año cerrado, Para qué, gastado, pesos de hoy):
 *  `previas/gasto.png` y `previas/gasto.json`. Es la misma imagen que arma "Compartir" en la página. Si faltan los archivos, avisa y sigue. */
function previaDelGasto(m: Motor, pal: ReturnType<typeof paletaDe>): boolean {
  const archivo = path.join(DATOS, "gasto_nacion.json");
  if (!fs.existsSync(archivo)) { avisar("no está gasto_nacion.json: se saltea la imagen del gasto de la Nación (/gasto/ usa la imagen general)"); return false; }
  try {
    const ix = decodificarIndice(JSON.parse(fs.readFileSync(archivo, "utf8")));
    if (!ix) { avisar("gasto_nacion.json no trae años: se saltea la imagen del gasto de la Nación"); return false; }
    const anio = anioDefecto(ix), pa = path.join(DATOS, anio.archivo);
    if (!fs.existsSync(pa)) { avisar(`no está ${anio.archivo}: se saltea la imagen del gasto de la Nación`); return false; }
    const ar = decodificarAnio(JSON.parse(fs.readFileSync(pa, "utf8")));
    const vista = ar && armarVista({ archivo: ar, anio, forma: "para_que", ruta: [], medida: "hoy", etapa: "dev", deflactor: crearDeflactor(m.F, m.base().IPC) });
    if (!vista) { avisar("gasto de la Nación: no hay datos para armar la imagen"); return false; }
    fs.writeFileSync(path.join(SALIDA, "gasto.png"), aPng((cv) => dibujarImagen(cv, armarImagenGasto(vista, "16x9"), pal, DIBUJO), DIBUJO));
    const { titulo, descripcion } = textosPreviaGasto(vista), fecha = anio.actualizado ?? String(anio.anio);
    const previa: PreviaGasto = { titulo, descripcion, fecha, imagen: `/${CARPETA_PREVIAS}/gasto.png?v=${fecha}` };
    fs.writeFileSync(path.join(SALIDA, "gasto.json"), JSON.stringify(previa, null, 1));
    console.log(`gasto: ${titulo}
  ${descripcion}`);
    return true;
  } catch (err) {
    avisar(`gasto de la Nación: ${(err as Error).message}`);
    return false;
  }
}

/** Imagen y textos de las universidades (/universidades/), con la vista de entrada (último año cerrado, pesos de hoy, por monto): `previas/universidades.png`
 *  y `previas/universidades.json`. Es la misma imagen que arma "Compartir" en la página. Si falta `universidades.json`, avisa y sigue. */
function previaDeUniversidades(m: Motor, pal: ReturnType<typeof paletaDe>): boolean {
  const archivo = path.join(DATOS, "universidades.json");
  if (!fs.existsSync(archivo)) { avisar("no está universidades.json: se saltea la imagen de las universidades (/universidades/ usa la imagen general)"); return false; }
  try {
    const d = decodificarUniv(JSON.parse(fs.readFileSync(archivo, "utf8")));
    if (!d) { avisar("universidades.json no trae datos: se saltea la imagen de las universidades"); return false; }
    // años en curso y PIB que falten, del índice del gasto (lo mismo que hace la página)
    const enCurso: number[] = [], pib = new Map<number, number>(), act = new Map<number, string>();
    const archivoIx = path.join(DATOS, "gasto_nacion.json");
    if (fs.existsSync(archivoIx)) {
      const ix = decodificarIndice(JSON.parse(fs.readFileSync(archivoIx, "utf8")));
      ix?.anios.forEach((a) => { if (a.en_curso) enCurso.push(a.anio); if (a.pib) pib.set(a.anio, a.pib); if (a.actualizado) act.set(a.anio, a.actualizado); });
    }
    const c = crearContexto(d, crearDeflactor(m.F, m.base().IPC), { enCurso, pib, actualizado: act });
    const anio = anioDefectoU(c), vista = armarVistaU(c, { anio, medida: "hoy", orden: "monto" });
    if (!vista) { avisar("universidades: no hay datos para armar la imagen"); return false; }
    fs.writeFileSync(path.join(SALIDA, "universidades.png"), aPng((cv) => dibujarImagen(cv, armarImagenU(vista, "16x9"), pal, DIBUJO), DIBUJO));
    const { titulo, descripcion } = textosPreviaU(vista), fecha = d.generado || String(anio);
    const previa: PreviaUniversidades = { titulo, descripcion, fecha, imagen: `/${CARPETA_PREVIAS}/universidades.png?v=${encodeURIComponent(fecha)}` };
    fs.writeFileSync(path.join(SALIDA, "universidades.json"), JSON.stringify(previa, null, 1));
    console.log(`universidades: ${titulo}
  ${descripcion}`);
    return true;
  } catch (err) {
    avisar(`universidades: ${(err as Error).message}`);
    return false;
  }
}

function main() {
  registrarFuente();
  const pal = paletaDe(tokensOscuros(), FAMILIA, {});
  const cat = leerJson<{ series: SerieMeta[] }>("catalogo.json");
  const enCatalogo = new Set(cat.series.map((s) => s.id));
  const fijos = DATOS_FIJOS.filter((d) => {
    const ok = idsDe(d.e).every((id) => enCatalogo.has(id));
    if (!ok) avisar(`"${d.slug}": la serie ${d.e.id} no está en el catálogo; su página no se genera (queda 404)`);
    return ok;
  });
  const { m, metas } = cargarMotor(fijos);
  revisarLista(metas);

  fs.rmSync(SALIDA, { recursive: true, force: true });   // sin imágenes viejas de datos que ya no están
  fs.mkdirSync(SALIDA, { recursive: true });
  const base = baseDeConfig(DEFECTO, PRES_DEF.map((p) => p.id));
  const salida: DatosPrevias = { generado: new Date().toISOString(), datos: {} };

  for (const d of fijos) {
    try {
      const e = d.e, c = m.calc(e), ctx = contextoDato(m, e);
      if (!ctx) { avisar(`"${d.slug}": la serie no tiene datos`); continue; }
      // la vista del bloque Histórico de la ficha, con las opciones de imagen de fábrica (lo que arma "Compartir" sin tocar nada)
      const { E } = historicoFicha(m, c, DEFECTO.desde);
      const datos = armarImagen(m, { exprs: [e], modo: "valor", eje: "propia", desde: E.desde, hasta: E.hasta, meses: E.meses, freq: "M", ag: "promedio" },
        { formato: "16x9", comentario: "", base, personal: IMAGEN_DEFECTO });
      if (!datos) { avisar(`"${d.slug}": no hay datos para armar la imagen`); continue; }
      fs.writeFileSync(path.join(SALIDA, `${d.slug}.png`), aPng((cv) => dibujarImagen(cv, datos, pal, DIBUJO), DIBUJO));
      const nombre = nombreDe(m, d);
      const { titulo, descripcion } = textosPrevia({
        nombre, valor: ctx.valor, mes: ctx.mes, unidad: c.unidad, pct: c.pct, indice: c.serie.tipo === "idx" || /índice/i.test(c.unidad),
        frases: ctx.frases.map((f) => f.texto), fuente: c.serie.fuente,
      });
      const previa: PreviaDato = {
        nombre, titulo, descripcion, fecha: ctx.fecha,
        imagen: `/${CARPETA_PREVIAS}/${d.slug}.png?v=${ctx.fecha}`,
      };
      salida.datos[d.slug] = previa;
      console.log(`${d.slug}: ${previa.titulo}`);
    } catch (err) {
      avisar(`"${d.slug}": ${(err as Error).message}`);
    }
  }

  const n = Object.keys(salida.datos).length;
  if (!n) fallar("no se pudo generar ninguna imagen");
  fs.writeFileSync(path.join(SALIDA, "_datos.json"), JSON.stringify(salida, null, 1));
  const conParte = previaDelParte(pal);
  const conSemaforo = previaDelSemaforo(pal);
  const conHerencia = previaDeHerencia(m, metas, pal);
  const conGasto = previaDelGasto(m, pal);
  const conUniversidades = previaDeUniversidades(m, pal);
  fs.writeFileSync(path.join(SALIDA, "sitio.png"), aPng((cv) => dibujarImagenSitio(cv, pal, {
    titulo: "Datos de Argentina, en debate.",
    bajada: DESCRIPCION_SITIO.replace(/^Datos de Argentina, en debate\.\s*/, ""),
    temas: TEMAS.map((t) => t.nombre),
    pie: "Datos oficiales: INDEC, BCRA, Secretaría de Trabajo y otras fuentes",
  }, PREVIA), PREVIA));
  console.log(`\nPrevias: ${n} de ${DATOS_FIJOS.length} datos fijos, más sitio.png${conParte ? ", bcra.png" : ""}${conSemaforo ? ", semaforo.png" : ""}${conHerencia ? ", herencia.png" : ""}${conGasto ? ", gasto.png" : ""}${conUniversidades ? ", universidades.png" : ""}, en ${((Date.now() - inicio) / 1000).toFixed(1)} s.${avisos.length ? ` Avisos: ${avisos.length}.` : ""}`);
}

main();
