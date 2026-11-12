// Imagen general del sitio para la vista previa de los links (portada y rutas sin imagen propia). La dibuja scripts/generar-previas.ts.
// Usa la misma marca, tipografía y paleta que la imagen compartible (imagen.ts).
import { ALTO_MARCA, MARGEN, SITIO, ajustar, alto, dibujarMarca, fuenteDe, texto, type LienzoCanvas, type Paleta } from "./imagen";

export interface TextosSitio { titulo: string; bajada: string; temas: string[]; pie: string }

export function dibujarImagenSitio(canvas: LienzoCanvas, pal: Paleta, t: TextosSitio, tam: { w: number; h: number }): void {
  const { w: W, h: H } = tam, m = MARGEN;
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  dibujarMarca(ctx, pal, W, H);
  let y = ALTO_MARCA + 44;
  const aTit = ajustar(ctx, pal, t.titulo, { peso: 900, max: 76, min: 44, ancho: W - 2 * m, lineas: 1 });
  texto(ctx, pal, aTit, 900, m, y, pal.tinta, 1.08);
  y += alto(aTit, 1.08) + 18;
  const aBaj = ajustar(ctx, pal, t.bajada, { peso: 600, max: 32, min: 22, ancho: W - 2 * m, lineas: 3 });
  texto(ctx, pal, aBaj, 600, m, y, pal.tintaSec, 1.25);
  y += alto(aBaj, 1.25) + 30;
  // temas: rótulos en renglones, hasta donde entren
  const fs = 24, padX = 16, hChip = fs + 20, gap = 12, yMax = H - 110;
  ctx.font = fuenteDe(pal, 700, fs); ctx.textBaseline = "middle"; ctx.textAlign = "left";
  let x = m;
  for (const nombre of t.temas) {
    const w = ctx.measureText(nombre).width + padX * 2;
    if (x + w > W - m) { x = m; y += hChip + gap; }
    if (y + hChip > yMax) break;
    ctx.fillStyle = pal.superficie; ctx.fillRect(x, y, w, hChip);
    ctx.fillStyle = pal.acento; ctx.fillRect(x, y, 5, hChip);
    ctx.fillStyle = pal.tinta; ctx.fillText(nombre, x + padX + 2, y + hChip / 2 + 1);
    x += w + gap;
  }
  // pie: dirección del sitio y de dónde salen los datos
  const yPie = H - 78;
  ctx.fillStyle = pal.borde; ctx.fillRect(m, yPie, W - 2 * m, 2);
  ctx.textBaseline = "top"; ctx.textAlign = "left"; ctx.font = fuenteDe(pal, 800, 30); ctx.fillStyle = pal.acento;
  ctx.fillText(SITIO, m, yPie + 20);
  const wSitio = ctx.measureText(SITIO).width;
  const aPie = ajustar(ctx, pal, t.pie, { peso: 400, max: 22, min: 16, ancho: W - 2 * m - wSitio - 40, lineas: 1 });
  texto(ctx, pal, aPie, 400, W - m, yPie + 26, pal.tintaTenue, 1.2, "right");
}
