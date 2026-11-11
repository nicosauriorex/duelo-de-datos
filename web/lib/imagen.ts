// Dibujo de la imagen para compartir, en un canvas. Recibe datos ya calculados (`DatosImagen`) y una paleta ya leída: no toca la página.
// Siempre con el aspecto oscuro de la marca. Los textos largos bajan de tamaño hasta un mínimo y después se cortan con puntos suspensivos.
import { fmtMes } from "./formato";
import type { FormatoImg } from "./config";
import type { Frase } from "./contexto-dato";

export const FORMATOS: Record<FormatoImg, { w: number; h: number }> = {
  "1x1": { w: 1080, h: 1080 }, "4x5": { w: 1080, h: 1350 }, "16x9": { w: 1600, h: 900 },
};

export interface Paleta {
  familia: string;
  fondo: string; superficie: string; barra: string; sobreBarra: string; borde: string; tinta: string; tintaSec: string; tintaTenue: string;
  grilla: string; eje: string; acento: string; sobreAcento: string; accion: string; bueno: string; malo: string;
  series: string[];                 // en el orden de PALETA de components/util.ts
  pres: Record<string, string>;     // color de cada presidente (id → color)
}
export interface SerieImg { nombre: string; color: number; axis: 0 | 1; v: (number | null)[] }
export interface PresImg { id: string; nombre: string; ini: string | null; fin: string | null; variacion: string | null; cls: "bueno" | "malo" | "neutro" }
export interface DatosImagen {
  formato: FormatoImg;
  titulo: string;
  cifra: { valor: string; mes: string; aviso: boolean } | null;
  frases: Frase[];
  leyenda: { nombre: string; valor: string; color: number }[] | null;   // varias variables: nombre y último valor de cada una
  x: number[];                       // mes de cada punto (años * 12 + mes)
  series: SerieImg[];
  fmtEje: (v: number) => string; fmtEje2: ((v: number) => string) | null;
  franjas: { ini: number; fin: number; id: string; nombre: string }[];
  presidentes: PresImg[] | null; inicioTxt: string | null;
  comentario: string;
  unidad: string; fuente: string; nota: string; fecha: string;
  archivo: string;                   // nombre del archivo, sin extensión
}

const SITIO = "primerolosdatos.com.ar";
const ETQ_COMENTARIO = "Comentario de quien comparte";
const px = (n: number) => Math.round(n);

type Ctx = CanvasRenderingContext2D;
const fuenteDe = (pal: Paleta, peso: number, tam: number) => `${peso} ${px(tam)}px ${pal.familia}`;

/** Carga las fuentes de la marca antes de dibujar (si no, el canvas usa la de reserva). */
export async function esperarFuentes(familia: string): Promise<void> {
  try {
    await Promise.all([400, 600, 800, 900].map((p) => document.fonts.load(`${p} 32px ${familia}`)));
    await document.fonts.ready;
  } catch { /* sin API de fuentes: se dibuja con lo que haya */ }
}

function partir(ctx: Ctx, texto: string, ancho: number): string[] {
  const out: string[] = [];
  let linea = "";
  for (const w of texto.split(/\s+/).filter(Boolean)) {
    const prueba = linea ? linea + " " + w : w;
    if (linea && ctx.measureText(prueba).width > ancho) { out.push(linea); linea = w; } else linea = prueba;
  }
  if (linea) out.push(linea);
  return out;
}
function recortarPuntos(ctx: Ctx, s: string, ancho: number): string {
  if (ctx.measureText(s).width <= ancho) return s;
  let t = s;
  while (t.length > 1 && ctx.measureText(t.trimEnd() + "…").width > ancho) t = t.slice(0, -1);
  return t.trimEnd() + "…";
}
interface Ajustado { lineas: string[]; tam: number }
/** Entra en `ancho` y `lineas` renglones bajando el tamaño de `max` a `min`; si no entra ni al mínimo, corta el último renglón con puntos suspensivos. */
function ajustar(ctx: Ctx, pal: Paleta, texto: string, o: { peso: number; max: number; min: number; ancho: number; lineas: number }): Ajustado {
  const limpio = texto.replace(/\s+/g, " ").trim();
  for (let t = px(o.max); t >= px(o.min); t -= 2) {
    ctx.font = fuenteDe(pal, o.peso, t);
    const ls = partir(ctx, limpio, o.ancho);
    if (ls.length <= o.lineas && ls.every((l) => ctx.measureText(l).width <= o.ancho)) return { lineas: ls, tam: t };
  }
  const t = px(o.min);
  ctx.font = fuenteDe(pal, o.peso, t);
  const ls = partir(ctx, limpio, o.ancho);
  const cortadas = ls.slice(0, o.lineas);
  if (ls.length > o.lineas) cortadas[o.lineas - 1] = [cortadas[o.lineas - 1], ...ls.slice(o.lineas)].join(" ");
  return { lineas: cortadas.map((l) => recortarPuntos(ctx, l, o.ancho)), tam: t };
}
const alto = (a: Ajustado, inter = 1.18) => a.lineas.length * a.tam * inter;
function texto(ctx: Ctx, pal: Paleta, a: Ajustado, peso: number, x: number, y: number, color: string, inter = 1.18, alinear: CanvasTextAlign = "left") {
  ctx.font = fuenteDe(pal, peso, a.tam); ctx.fillStyle = color; ctx.textAlign = alinear; ctx.textBaseline = "top";
  a.lineas.forEach((l, k) => ctx.fillText(l, x, y + k * a.tam * inter));
}
const colorFrase = (pal: Paleta, f: Frase) => (f.cls === "bueno" ? pal.bueno : f.cls === "malo" ? pal.malo : pal.tintaSec);
const colorCls = (pal: Paleta, c: "bueno" | "malo" | "neutro") => (c === "bueno" ? pal.bueno : c === "malo" ? pal.malo : pal.tintaSec);

// ---------------------------------------------------------------- gráfico
function ticksY(min: number, max: number, n: number): number[] {
  const span = max - min || Math.abs(max) || 1, raw = span / Math.max(1, n), mag = Math.pow(10, Math.floor(Math.log10(raw))), norm = raw / mag;
  const paso = (norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10) * mag, out: number[] = [];
  for (let v = Math.ceil(min / paso - 1e-9) * paso; v <= max + paso * 1e-9; v += paso) out.push(+v.toFixed(10));
  return out;
}
interface Rect { x: number; y: number; w: number; h: number }

function grafico(ctx: Ctx, r: Rect, d: DatosImagen, pal: Paleta, esc: number) {
  const fs = px(22 * esc), pad = px(14 * esc);
  ctx.fillStyle = pal.superficie; ctx.fillRect(r.x, r.y, r.w, r.h);
  ctx.strokeStyle = pal.borde; ctx.lineWidth = 2; ctx.strokeRect(r.x + 1, r.y + 1, r.w - 2, r.h - 2);
  const vis = d.series.map((s, k) => ({ s, k })).filter(({ s }) => s.v.some((x) => x != null));
  if (!vis.length || !d.x.length) return;
  const rango = (axis: number) => {
    let mn = Infinity, mx = -Infinity;
    vis.filter(({ s }) => s.axis === axis).forEach(({ s }) => s.v.forEach((x) => { if (x != null) { mn = Math.min(mn, x); mx = Math.max(mx, x); } }));
    if (!isFinite(mn)) return null;
    const sp = (mx - mn) || Math.abs(mx) * 0.1 || 1;
    return { mn: mn - sp * 0.08, mx: mx + sp * 0.08 };
  };
  const R0 = rango(0), R1 = rango(1);
  const x0 = Math.min(...d.x), x1 = Math.max(...d.x) === x0 ? x0 + 1 : Math.max(...d.x);
  ctx.font = fuenteDe(pal, 600, fs);
  const ancho = (fmt: (v: number) => string, R: { mn: number; mx: number }) => Math.max(...ticksY(R.mn, R.mx, 4).map((t) => ctx.measureText(fmt(t)).width), 0);
  const izq = pad + (R0 ? ancho(d.fmtEje, R0) : 0) + pad, der = R1 && d.fmtEje2 ? ancho(d.fmtEje2, R1) + pad * 2 : pad * 1.6;
  const pl = { x: r.x + izq, y: r.y + pad, w: r.w - izq - der, h: r.h - pad * 2 - fs - px(10 * esc) };
  const X = (n: number) => pl.x + ((n - x0) / (x1 - x0)) * pl.w;
  const Yde = (R: { mn: number; mx: number }) => (v: number) => pl.y + pl.h - ((v - R.mn) / (R.mx - R.mn)) * pl.h;

  ctx.save();
  ctx.beginPath(); ctx.rect(r.x + 2, r.y + 2, r.w - 4, r.h - 4); ctx.clip();
  // franjas de mandatos
  d.franjas.forEach((f) => {
    const a = Math.max(f.ini, x0), b = Math.min(f.fin, x1);
    if (b <= a) return;
    ctx.globalAlpha = 0.2; ctx.fillStyle = pal.pres[f.id] ?? pal.eje; ctx.fillRect(X(a), pl.y, X(b) - X(a), pl.h);
    ctx.globalAlpha = 1;
    ctx.font = fuenteDe(pal, 700, px(fs * 0.82));
    const nom = f.nombre.toUpperCase();
    if (ctx.measureText(nom).width + 10 < X(b) - X(a)) { ctx.fillStyle = pal.tintaSec; ctx.textAlign = "center"; ctx.textBaseline = "top"; ctx.fillText(nom, (X(a) + X(b)) / 2, pl.y + 6); }
  });
  // grilla y eje Y izquierdo
  ctx.textBaseline = "middle"; ctx.font = fuenteDe(pal, 600, fs);
  if (R0) {
    const Y = Yde(R0);
    ticksY(R0.mn, R0.mx, Math.max(2, Math.round(pl.h / (70 * esc)))).forEach((t) => {
      const y = Y(t); if (y < pl.y - 1 || y > pl.y + pl.h + 1) return;
      ctx.strokeStyle = pal.grilla; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(pl.x, y); ctx.lineTo(pl.x + pl.w, y); ctx.stroke();
      ctx.fillStyle = pal.tintaTenue; ctx.textAlign = "right"; ctx.fillText(d.fmtEje(t), pl.x - pad * 0.6, y);
    });
  }
  if (R1 && d.fmtEje2) {
    const Y = Yde(R1), col = pal.series[vis.find(({ s }) => s.axis === 1)!.s.color];
    ticksY(R1.mn, R1.mx, Math.max(2, Math.round(pl.h / (70 * esc)))).forEach((t) => {
      const y = Y(t); if (y < pl.y - 1 || y > pl.y + pl.h + 1) return;
      ctx.fillStyle = col; ctx.textAlign = "left"; ctx.fillText(d.fmtEje2!(t), pl.x + pl.w + pad * 0.6, y);
    });
  }
  // eje X: años (o meses si el período es corto)
  const span = x1 - x0, marcas: { n: number; t: string }[] = [];
  if (span > 36) {
    const porAnio = (pl.w * 12) / span;
    const paso = [1, 2, 5, 10, 20].find((p) => porAnio * p >= 90 * esc) ?? 20;
    for (let a = Math.ceil(x0 / 12); a * 12 <= x1; a++) if (a % paso === 0) marcas.push({ n: a * 12, t: String(a) });
  } else {
    const porMes = pl.w / span;
    const paso = [1, 2, 3, 6, 12].find((p) => porMes * p >= 100 * esc) ?? 12;
    for (let n = Math.ceil(x0); n <= x1; n++) if (n % paso === 0) marcas.push({ n, t: fmtMes(`${Math.floor(n / 12)}-${String((n % 12) + 1).padStart(2, "0")}`) });
  }
  ctx.textBaseline = "top"; ctx.font = fuenteDe(pal, 600, fs);
  marcas.forEach(({ n, t }) => {
    const x = X(n), w = ctx.measureText(t).width;
    ctx.strokeStyle = pal.eje; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, pl.y + pl.h); ctx.lineTo(x, pl.y + pl.h + 6); ctx.stroke();
    ctx.fillStyle = pal.tintaTenue; ctx.textAlign = "center";
    ctx.fillText(t, Math.max(r.x + w / 2 + 4, Math.min(r.x + r.w - w / 2 - 4, x)), pl.y + pl.h + 9);
  });
  ctx.strokeStyle = pal.eje; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(pl.x, pl.y + pl.h); ctx.lineTo(pl.x + pl.w, pl.y + pl.h); ctx.stroke();
  // líneas, con corte donde falta el dato, y el último punto marcado
  ctx.save();
  ctx.beginPath(); ctx.rect(pl.x - 2, pl.y - 6, pl.w + 4, pl.h + 12); ctx.clip();
  vis.forEach(({ s }) => {
    const R = s.axis === 1 && R1 ? R1 : R0!, Y = Yde(R), col = pal.series[s.color] ?? pal.acento;
    ctx.strokeStyle = col; ctx.lineWidth = px(4.5 * esc); ctx.lineJoin = "round"; ctx.lineCap = "round";
    let abierto = false, ultimo = null as [number, number] | null;
    ctx.beginPath();
    s.v.forEach((v, i) => {
      if (v == null) { abierto = false; return; }
      const xx = X(d.x[i]), yy = Y(v);
      if (abierto) ctx.lineTo(xx, yy); else { ctx.moveTo(xx, yy); abierto = true; }
      ultimo = [xx, yy];
    });
    ctx.stroke();
    if (ultimo) {
      const [ux, uy] = ultimo;
      ctx.fillStyle = col; ctx.strokeStyle = pal.superficie; ctx.lineWidth = px(3 * esc);
      ctx.beginPath(); ctx.arc(ux, uy, px(9 * esc), 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }
  });
  ctx.restore();
  ctx.restore();
}

// ---------------------------------------------------------------- composición
interface Resultado { holgura: number }

/** Compone toda la imagen. Con `pintar` en falso solo mide (para elegir la escala de texto con la que todo entra). */
function componer(ctx: Ctx, d: DatosImagen, pal: Paleta, esc: number, pintar: boolean): Resultado {
  const { w: W, h: H } = FORMATOS[d.formato], horiz = d.formato === "16x9";
  const m = 56, S = (n: number) => n * esc;
  const hMarca = 64;
  if (pintar) {
    ctx.fillStyle = pal.fondo; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = pal.barra; ctx.fillRect(0, 0, W, hMarca);
    ctx.font = fuenteDe(pal, 900, 30); const tw = ctx.measureText("PRIMERO LOS DATOS").width, bw = m + tw + 56;
    ctx.fillStyle = pal.acento; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(bw, 0); ctx.lineTo(bw - 20, hMarca); ctx.lineTo(0, hMarca); ctx.closePath(); ctx.fill();
    ctx.fillStyle = pal.sobreAcento; ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.fillText("PRIMERO LOS DATOS", m, hMarca / 2 + 1);
    ctx.fillStyle = pal.acento; ctx.fillRect(0, hMarca, W, 4);
  }
  const wCol = horiz ? 520 : W - 2 * m, xCol = m;
  const xGraf = horiz ? m + wCol + 48 : m, wGraf = horiz ? W - xGraf - m : W - 2 * m;

  // ----- pie (se mide primero: queda pegado abajo)
  const fPie = px(S(24)), minPie = px(S(17));
  const aUnidad = ajustar(ctx, pal, d.unidad, { peso: 600, max: fPie, min: minPie, ancho: W - 2 * m, lineas: 1 });
  const aFuente = ajustar(ctx, pal, `Fuente: ${d.fuente}${d.nota ? ". " + d.nota : ""}`, { peso: 400, max: fPie, min: minPie, ancho: W - 2 * m, lineas: 2 });
  const aInicio = d.inicioTxt ? ajustar(ctx, pal, d.inicioTxt, { peso: 600, max: fPie, min: minPie, ancho: W - 2 * m, lineas: 1 }) : null;
  const fBase = px(S(26));
  const hPie = alto(aUnidad, 1.25) + alto(aFuente, 1.25) + (aInicio ? alto(aInicio, 1.25) : 0) + fBase * 1.3 + S(30);
  const yPie = H - px(S(28)) - hPie;
  if (pintar) {
    ctx.fillStyle = pal.borde; ctx.fillRect(m, yPie, W - 2 * m, 2);
    let y = yPie + S(14);
    texto(ctx, pal, aUnidad, 600, m, y, pal.tintaSec, 1.25); y += alto(aUnidad, 1.25);
    texto(ctx, pal, aFuente, 400, m, y, pal.tintaTenue, 1.25); y += alto(aFuente, 1.25);
    if (aInicio) { texto(ctx, pal, aInicio, 600, m, y, pal.tintaSec, 1.25); y += alto(aInicio, 1.25); }
    y += S(6);
    ctx.font = fuenteDe(pal, 800, fBase); ctx.textBaseline = "top"; ctx.textAlign = "left"; ctx.fillStyle = pal.acento; ctx.fillText(SITIO, m, y);
    ctx.font = fuenteDe(pal, 400, px(S(22))); ctx.textAlign = "right"; ctx.fillStyle = pal.tintaTenue; ctx.fillText(`Generado el ${d.fecha}`, W - m, y + 2);
  }

  // ----- texto de arriba (título, cifra, contexto)
  let y = hMarca + S(34);
  const aTit = ajustar(ctx, pal, d.titulo, { peso: 800, max: S(horiz ? 46 : 58), min: S(horiz ? 28 : 34), ancho: wCol, lineas: 2 });
  if (pintar) texto(ctx, pal, aTit, 800, xCol, y, pal.tinta, 1.12);
  y += alto(aTit, 1.12) + S(14);
  if (d.cifra) {
    const aCifra = ajustar(ctx, pal, d.cifra.valor, { peso: 900, max: S(horiz ? 104 : 124), min: S(56), ancho: wCol, lineas: 1 });
    if (pintar) texto(ctx, pal, aCifra, 900, xCol, y, pal.acento, 1);
    y += aCifra.tam * 1.0 + S(4);
    const mes = d.cifra.aviso ? `${d.cifra.mes} · Último dato disponible` : d.cifra.mes;
    const aMes = ajustar(ctx, pal, mes, { peso: 600, max: S(32), min: S(20), ancho: wCol, lineas: 1 });
    if (pintar) texto(ctx, pal, aMes, 600, xCol, y, pal.tintaSec, 1.2);
    y += alto(aMes, 1.2) + S(16);
  }
  if (d.leyenda) {
    const fila = S(horiz ? 42 : 46);
    d.leyenda.forEach((l, k) => {
      const yy = y + k * fila;
      const aVal = ajustar(ctx, pal, l.valor, { peso: 800, max: S(32), min: S(18), ancho: wCol * 0.5, lineas: 1 });
      ctx.font = fuenteDe(pal, 800, aVal.tam);
      const wVal = Math.min(ctx.measureText(aVal.lineas[0] ?? "").width, wCol * 0.5);
      const aNom = ajustar(ctx, pal, l.nombre, { peso: 600, max: S(30), min: S(18), ancho: wCol - wVal - S(54), lineas: 1 });
      if (pintar) {
        ctx.fillStyle = pal.series[l.color] ?? pal.acento; ctx.beginPath(); ctx.arc(xCol + S(11), yy + fila * 0.42, S(9), 0, Math.PI * 2); ctx.fill();
        texto(ctx, pal, aNom, 600, xCol + S(34), yy + (fila - aNom.tam * 1.2) / 2 - S(3), pal.tinta, 1.2);
        texto(ctx, pal, aVal, 800, xCol + wCol, yy + (fila - aVal.tam * 1.2) / 2 - S(3), pal.tinta, 1.2, "right");
      }
    });
    y += d.leyenda.length * fila + S(10);
  }
  d.frases.forEach((f) => {
    const a = ajustar(ctx, pal, f.texto, { peso: 600, max: S(horiz ? 32 : 36), min: S(22), ancho: wCol, lineas: 2 });
    if (pintar) texto(ctx, pal, a, 600, xCol, y, colorFrase(pal, f), 1.2);
    y += alto(a, 1.2) + S(10);
  });
  const yFinTexto = y;

  // ----- comentario propio (una sola línea, con su etiqueta)
  let hCom = 0, aCom: Ajustado | null = null, aEtq: Ajustado | null = null;
  const wCom = horiz ? wCol : wGraf;
  if (d.comentario) {
    aEtq = ajustar(ctx, pal, ETQ_COMENTARIO.toUpperCase(), { peso: 800, max: S(18), min: S(14), ancho: wCom - S(28), lineas: 1 });
    aCom = ajustar(ctx, pal, `“${d.comentario}”`, { peso: 600, max: S(32), min: S(18), ancho: wCom - S(28), lineas: 1 });
    hCom = alto(aEtq, 1.2) + alto(aCom, 1.25) + S(24);
  }
  const dibujarComentario = (x: number, yy: number) => {
    if (!aCom || !aEtq) return;
    ctx.fillStyle = pal.superficie; ctx.fillRect(x, yy, wCom, hCom);
    ctx.fillStyle = pal.accion; ctx.fillRect(x, yy, S(6), hCom);
    texto(ctx, pal, aEtq, 800, x + S(22), yy + S(10), pal.tintaTenue, 1.2);
    texto(ctx, pal, aCom, 600, x + S(22), yy + S(12) + alto(aEtq, 1.2), pal.tinta, 1.25);
  };

  // ----- presidentes (una tarjeta por mandato): su texto baja menos que el resto, para que se siga leyendo
  const pres = d.presidentes, St = (n: number) => n * Math.max(esc, 0.92);
  let hPres = 0;
  if (pres?.length) hPres = St(horiz ? 176 : 190);

  // ----- región del gráfico
  const sep = S(18);
  let yGraf: number, hGraf: number, yPres: number, yComBajo = 0;
  if (horiz) {
    const base = yPie - sep;
    hGraf = base - (hMarca + 4 + S(26)) - (hPres ? hPres + sep : 0);
    yGraf = hMarca + 4 + S(26);
    yPres = yGraf + hGraf + sep;
    if (aCom) yComBajo = yFinTexto + S(4);
  } else {
    const base = yPie - sep;
    yPres = base - hPres;
    const yComY = (hPres ? yPres - sep : base) - hCom;
    yComBajo = yComY;
    const tope = hCom ? yComY - sep : (hPres ? yPres - sep : base);
    yGraf = yFinTexto + S(6);
    hGraf = tope - yGraf;
  }
  const minGraf = S(horiz ? 260 : 250);
  const holgura = Math.min(hGraf - minGraf, horiz && aCom ? yPie - sep - (yComBajo + hCom) : Infinity);
  if (!pintar) return { holgura };

  grafico(ctx, { x: xGraf, y: yGraf, w: wGraf, h: hGraf }, d, pal, esc);
  if (aCom) dibujarComentario(horiz ? xCol : m, yComBajo);
  if (pres?.length) {
    const gap = St(8), tw = (wGraf - gap * (pres.length - 1)) / pres.length, xp = horiz ? xGraf : m;
    pres.forEach((p, k) => {
      const tx = xp + k * (tw + gap), pw = tw - St(16), color = pal.pres[p.id] ?? pal.eje;
      ctx.fillStyle = pal.superficie; ctx.fillRect(tx, yPres, tw, hPres);
      ctx.fillStyle = color; ctx.fillRect(tx, yPres, tw, St(8));
      let yy = yPres + St(18);
      const aN = ajustar(ctx, pal, p.nombre, { peso: 800, max: St(24), min: St(13), ancho: pw, lineas: 1 });
      texto(ctx, pal, aN, 800, tx + St(8), yy, pal.tinta, 1.2); yy += alto(aN, 1.2) + St(6);
      if (p.ini == null || p.fin == null) {
        const aS = ajustar(ctx, pal, "sin datos", { peso: 600, max: St(22), min: St(13), ancho: pw, lineas: 1 });
        texto(ctx, pal, aS, 600, tx + St(8), yy, pal.tintaTenue, 1.2);
        return;
      }
      const aI = ajustar(ctx, pal, p.ini, { peso: 600, max: St(22), min: St(12), ancho: pw, lineas: 1 });
      texto(ctx, pal, aI, 600, tx + St(8), yy, pal.tintaSec, 1.2); yy += alto(aI, 1.2) + St(2);
      const aF = ajustar(ctx, pal, "→ " + p.fin, { peso: 600, max: St(22), min: St(12), ancho: pw, lineas: 1 });
      texto(ctx, pal, aF, 600, tx + St(8), yy, pal.tintaSec, 1.2); yy += alto(aF, 1.2) + St(8);
      const aV = ajustar(ctx, pal, p.variacion ?? "–", { peso: 900, max: St(30), min: St(14), ancho: pw, lineas: 1 });
      texto(ctx, pal, aV, 900, tx + St(8), yy, colorCls(pal, p.cls), 1.2);
    });
  }
  return { holgura };
}

/** Dibuja la imagen completa en el canvas, con el tamaño del formato. Baja el tamaño de los textos si hace falta para que todo entre. */
export function dibujarImagen(canvas: HTMLCanvasElement, d: DatosImagen, pal: Paleta): void {
  const { w, h } = FORMATOS[d.formato];
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  let esc = 1;
  for (const e of [1, 0.92, 0.84, 0.76, 0.68, 0.6]) {
    esc = e;
    ctx.save();
    const r = componer(ctx, d, pal, e, false);
    ctx.restore();
    if (r.holgura >= 0) break;
  }
  ctx.save();
  componer(ctx, d, pal, esc, true);
  ctx.restore();
}
