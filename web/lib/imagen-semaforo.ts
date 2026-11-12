// Imagen compartible del semáforo de actividad (docs/specs/semaforo-actividad.md): la tabla con celdas de color y número, la fila de difusión,
// el título, el mes, la fuente, la marca y la dirección. No toca `imagen.ts` más que para usar sus helpers (marca, tipografía, ajuste de texto):
// la composición es propia porque la tabla de 30 indicadores no entra en ninguno de los lienzos de filas. Siempre con el aspecto oscuro de la marca.
// Palabras neutras y sin veredicto (D-012): verde es "subió" y rojo es "bajó".
import type { FormatoImg } from "./config";
import { ALTO_MARCA, FORMATOS, MARGEN, SITIO, ajustar, alto, dibujarMarca, fuenteDe, texto, type LienzoCanvas, type Paleta } from "./imagen";
import { isoDeMes, mesResumen, type Direccion, type Tabla } from "./semaforo";

export interface CeldaImg { txt: string; dir: Direccion; nivel: 1 | 2 | 3 | 4 }
export interface FilaImgSem { grupo: string; nombre: string; celdas: (CeldaImg | null)[] }
export interface DifusionImg { txt: string; detalle: string; atenuada: boolean }
export interface DatosSemaforo {
  formato: FormatoImg;
  titulo: string; resumen: string; unidad: string; fuente: string; fecha: string; archivo: string;
  meses: string[];                 // "sep-26", uno por columna
  filas: FilaImgSem[];
  difusion: DifusionImg[];
}

/** Datos de la imagen a partir de la tabla que ya muestra la página (los mismos números). Mes contra mes: solo las filas que entran en la medida. */
export function armarImagenSemaforo(t: Tabla, formato: FormatoImg, hoy: Date = new Date()): DatosSemaforo {
  const filas: FilaImgSem[] = t.grupos.flatMap((g) => g.filas.filter((f) => f.admite).map((f) => ({
    grupo: g.grupo, nombre: f.ind.corto,
    celdas: f.celdas.map((c) => (c ? { txt: c.txt, dir: c.dir, nivel: c.nivel } : null)),
  })));
  return {
    formato, titulo: "Semáforo de actividad", resumen: t.resumen,
    unidad: `Verde: subió. Rojo: bajó. El número es la variación en %. ${t.comparado}`,
    fuente: "Fuentes oficiales y cámaras del sector",
    fecha: hoy.toLocaleDateString("es-AR"),
    archivo: `primerolosdatos-semaforo-actividad-${t.medida === "ia" ? "interanual" : "mes-contra-mes"}-${isoDeMes(mesResumen(t))}`,
    meses: t.mesesTxt,
    filas,
    difusion: t.difusion.map((d) => ({ txt: d.txtPct, detalle: d.entran ? `${d.suben} de ${d.entran}` : "sin datos", atenuada: d.atenuada })),
  };
}

const colorTinta = (pal: Paleta, c: CeldaImg) => (c.dir === "sube" ? pal.sobreBueno[c.nivel - 1] : c.dir === "baja" ? pal.sobreMalo[c.nivel - 1] : pal.tinta);
const colorFondo = (pal: Paleta, c: CeldaImg): string | null => (c.dir === "sube" ? pal.fondosBueno[c.nivel - 1] : c.dir === "baja" ? pal.fondosMalo[c.nivel - 1] : null);

/** Dibuja la imagen completa en el canvas, con el tamaño del formato (o `tam`). */
export function dibujarImagenSemaforo(canvas: LienzoCanvas, d: DatosSemaforo, pal: Paleta, tam: { w: number; h: number } = FORMATOS[d.formato]): void {
  const { w: W, h: H } = tam, m = MARGEN, horiz = d.formato === "16x9";
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  dibujarMarca(ctx, pal, W, H);

  // ----- pie: unidad y cómo se compara, fuente, dirección del sitio
  const fPie = horiz ? 20 : 22;
  const aUnidad = ajustar(ctx, pal, d.unidad, { peso: 600, max: fPie, min: 15, ancho: W - 2 * m, lineas: 2 });
  const aFuente = ajustar(ctx, pal, d.fuente, { peso: 400, max: fPie, min: 15, ancho: W - 2 * m, lineas: 1 });
  const fBase = 26;
  const hPie = alto(aUnidad, 1.25) + alto(aFuente, 1.25) + fBase * 1.3 + 30;
  const yPie = H - 28 - hPie;
  ctx.fillStyle = pal.borde; ctx.fillRect(m, yPie, W - 2 * m, 2);
  let y = yPie + 14;
  texto(ctx, pal, aUnidad, 600, m, y, pal.tintaSec, 1.25); y += alto(aUnidad, 1.25);
  texto(ctx, pal, aFuente, 400, m, y, pal.tintaTenue, 1.25); y += alto(aFuente, 1.25) + 6;
  ctx.font = fuenteDe(pal, 800, fBase); ctx.textBaseline = "top"; ctx.textAlign = "left"; ctx.fillStyle = pal.acento; ctx.fillText(SITIO, m, y);
  ctx.font = fuenteDe(pal, 400, 22); ctx.textAlign = "right"; ctx.fillStyle = pal.tintaTenue; ctx.fillText(`Generado el ${d.fecha}`, W - m, y + 2);

  // ----- título y resumen
  y = ALTO_MARCA + 4 + 28;
  const aTit = ajustar(ctx, pal, d.titulo, { peso: 800, max: horiz ? 44 : 56, min: 30, ancho: W - 2 * m, lineas: 1 });
  texto(ctx, pal, aTit, 800, m, y, pal.tinta, 1.12); y += alto(aTit, 1.12) + 8;
  const aRes = ajustar(ctx, pal, d.resumen, { peso: 800, max: horiz ? 34 : 40, min: 22, ancho: W - 2 * m, lineas: 1 });
  texto(ctx, pal, aRes, 800, m, y, pal.acento, 1.12); y += alto(aRes, 1.12) + 16;

  // ----- tabla
  const n = d.filas.length, base = yPie - 18;
  const doble = n > 16 && !(d.formato === "4x5");                                   // dos columnas de filas
  const nMeses = d.meses.length ? (doble ? (horiz ? 6 : 4) : d.meses.length) : 0;
  const meses = d.meses.slice(-nMeses), primero = d.meses.length - nMeses;
  const ALTO_ENC = 30, ALTO_DIF = horiz ? 52 : 60, SEP = 12;
  const hFilas = base - y - ALTO_ENC - ALTO_DIF - SEP;
  const porCol = doble ? Math.ceil(n / 2) : n;
  const rowH = Math.min(hFilas / Math.max(1, porCol), n <= 8 ? 88 : 64);
  const gap = 36, cw = doble ? (W - 2 * m - gap) / 2 : W - 2 * m;
  const nomW = cw * (doble ? (horiz ? 0.34 : 0.4) : 0.3), mesW = (cw - nomW) / Math.max(1, nMeses);
  const fs = Math.max(12, Math.min(24, rowH * 0.5)), fNom = Math.max(11, Math.min(22, rowH * 0.5));
  const yEnc = y, yFilas = y + ALTO_ENC;
  // un solo tamaño para todos los números y otro para todos los nombres: la tabla se ve pareja
  const comun = (textos: string[], peso: number, max: number, min: number, ancho: number): number => {
    for (let t = Math.round(max); t > min; t--) {
      ctx.font = fuenteDe(pal, peso, t);
      if (textos.every((x) => ctx.measureText(x).width <= ancho)) return t;
    }
    return min;
  };
  const tamNum = comun(d.filas.flatMap((f) => f.celdas.slice(primero).flatMap((c) => (c ? [c.txt] : []))), 800, fs, 10, mesW - 10);
  const tamNom = comun(d.filas.map((f) => f.nombre), 700, fNom, 11, nomW - 12);

  for (let c = 0; c < (doble ? 2 : 1); c++) {
    const x0 = m + c * (cw + gap), xm = x0 + nomW;
    // encabezado de columnas: el mes
    ctx.font = fuenteDe(pal, 800, 15); ctx.textBaseline = "top"; ctx.textAlign = "center"; ctx.fillStyle = pal.tintaTenue;
    meses.forEach((t, k) => ctx.fillText(t.toUpperCase(), xm + k * mesW + mesW / 2, yEnc + 6));
    ctx.textAlign = "left"; ctx.fillText("INDICADOR", x0 + 6, yEnc + 6);
    ctx.fillStyle = pal.borde; ctx.fillRect(x0, yFilas - 2, cw, 2);
    const desde = c * porCol, hasta = Math.min(n, desde + porCol);
    for (let i = desde; i < hasta; i++) {
      const f = d.filas[i], y0 = yFilas + (i - desde) * rowH;
      if (i > desde && f.grupo !== d.filas[i - 1].grupo) { ctx.fillStyle = pal.borde; ctx.fillRect(x0, y0, cw, 2); }
      else if (i > desde) { ctx.fillStyle = pal.grilla; ctx.fillRect(x0, y0, cw, 1); }
      const aN = ajustar(ctx, pal, f.nombre, { peso: 700, max: tamNom, min: tamNom, ancho: nomW - 12, lineas: 1 });
      texto(ctx, pal, aN, 700, x0 + 6, y0 + (rowH - aN.tam) / 2, pal.tinta, 1);
      f.celdas.slice(primero).forEach((cel, k) => {
        const cx = xm + k * mesW;
        if (!cel) {
          ctx.font = fuenteDe(pal, 600, fs); ctx.textAlign = "center"; ctx.textBaseline = "top"; ctx.fillStyle = pal.tintaTenue;
          ctx.fillText("–", cx + mesW / 2, y0 + (rowH - fs) / 2);
          return;
        }
        const fondo = colorFondo(pal, cel);
        if (fondo) { ctx.fillStyle = fondo; ctx.fillRect(cx + 2, y0 + 2, mesW - 4, rowH - 4); }
        const aC = ajustar(ctx, pal, cel.txt, { peso: 800, max: tamNum, min: tamNum, ancho: mesW - 8, lineas: 1 });
        texto(ctx, pal, aC, 800, cx + mesW / 2, y0 + (rowH - aC.tam) / 2, colorTinta(pal, cel), 1, "center");
      });
    }
  }

  // ----- difusión: una tira debajo de la tabla (en dos columnas ocupa todo el ancho)
  const hTabla = (hFilas > 0 ? Math.min(hFilas, porCol * rowH) : 0), yDif = yFilas + hTabla + SEP;
  ctx.fillStyle = pal.superficie; ctx.fillRect(m, yDif, W - 2 * m, ALTO_DIF);
  ctx.strokeStyle = pal.borde; ctx.lineWidth = 2; ctx.strokeRect(m + 1, yDif + 1, W - 2 * m - 2, ALTO_DIF - 2);
  const etqW = doble ? 330 : nomW, difW = (W - 2 * m - etqW) / Math.max(1, nMeses);
  const aEtq = ajustar(ctx, pal, "Indicadores que subieron", { peso: 800, max: 22, min: 12, ancho: etqW - 18, lineas: 2 });
  texto(ctx, pal, aEtq, 800, m + 12, yDif + (ALTO_DIF - alto(aEtq, 1.15)) / 2, pal.tinta, 1.15);
  d.difusion.slice(primero).forEach((df, k) => {
    const cx = m + etqW + k * difW + difW / 2;
    ctx.save();
    if (df.atenuada) ctx.globalAlpha = 0.5;
    const aP = ajustar(ctx, pal, df.txt, { peso: 900, max: horiz ? 24 : 26, min: 12, ancho: difW - 8, lineas: 1 });
    const aD = ajustar(ctx, pal, df.detalle, { peso: 600, max: 15, min: 10, ancho: difW - 8, lineas: 1 });
    const yy = yDif + (ALTO_DIF - aP.tam - aD.tam - 2) / 2;
    texto(ctx, pal, aP, 900, cx, yy, pal.tinta, 1, "center");
    texto(ctx, pal, aD, 600, cx, yy + aP.tam + 2, pal.tintaSec, 1, "center");
    ctx.restore();
  });
}
