// Datos de la imagen del parte diario del Banco Central (docs/specs/parte-diario-bcra.md). No dibuja: eso es `imagen.ts` (filas con variables).
// Palabras neutras y sin veredicto (D-012): la imagen dice qué cambió, no si es bueno o malo. Los números salen de `diario.ts`, los mismos de la página.
import type { FormatoImg } from "./config";
import type { DatosImagen, FilaVariable } from "./imagen";
import { isoDeDia, type Parte } from "./diario";

/** Datos de la imagen del parte. La fila de cada variable lleva el dato anterior, el último, la diferencia y los últimos 90 datos. */
export function armarImagenParte(p: Parte, formato: FormatoImg, hoy: Date = new Date()): DatosImagen {
  const filas: FilaVariable[] = p.variables.map((v) => ({
    nombre: v.corto, unidad: v.unidad,
    ini: v.anteriorCorto, fin: v.valorCorto,
    // en compras no se resta un día del otro (un flujo no tiene "variación"): se muestra "–"; la fila dice qué hizo el Banco Central
    variacion: v.difAnterior === "sin cambios" ? "0" : v.difAnterior,
    cls: v.clsAnterior,
    // si el dato es anterior a la fecha del parte, su fecha va en lugar del porcentaje
    nota: v.atrasada ? `al ${v.fechaTxt}` : v.clave === "compras" ? (v.etiqueta ? v.etiqueta.toLowerCase() : "sin operaciones") : v.pctAnterior,
    spark: v.spark,
  }));
  const hayAtraso = p.atrasadas.length > 0;
  return {
    formato, titulo: "Parte del Banco Central", temporalidad: "Datos diarios",
    cifra: { valor: p.fechaTxt, mes: "Fecha del parte", aviso: false },
    frases: [{ texto: hayAtraso ? "Algunos datos se publican con atraso: cada fila dice hasta qué día llega." : "Variación contra el dato anterior.", cls: "neutro" }],
    leyenda: null, x: [], series: [], fmtEje: (v) => String(v), fmtEje2: null, franjas: [], inicioTxt: null,
    comentario: "",
    unidad: "Último dato y el anterior, y la diferencia entre ambos. A la derecha, los últimos 90 datos.",
    fuente: "Fuente: BCRA (Banco Central de la República Argentina)", fuenteCorta: "Fuente: BCRA", nota: "",
    fecha: hoy.toLocaleDateString("es-AR"),
    archivo: `primerolosdatos-parte-banco-central-${isoDeDia(p.dia)}`,
    lienzo: { tipo: "variables", filas, presId: "", enc: { ini: "Anterior", fin: "Último", sp: "Últimos 90 datos", sinDato: "sin datos" } },
  };
}
