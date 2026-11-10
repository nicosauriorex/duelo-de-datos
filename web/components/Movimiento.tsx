"use client";
// Movimiento medido (bloque 5e): entrada de secciones, números que cuentan y filas que se deslizan.
// Todo es una mejora: sin JavaScript, sin IntersectionObserver o con "reducir movimiento" el contenido se ve completo y quieto.
import { useEffect, useRef, type ReactNode, type RefObject } from "react";
import { nfDec, partirNumero } from "@/lib/formato";

const quieto = () => typeof window === "undefined" || typeof IntersectionObserver === "undefined" || window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Sección que sube unos px y aparece la primera vez que entra en pantalla. Lo que ya está a la vista (o más arriba) no se toca. */
export function Entrada({ children, className = "", id, etiqueta }: { children: ReactNode; className?: string; id?: string; etiqueta?: string }) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || quieto() || el.getBoundingClientRect().top < window.innerHeight) return;
    el.dataset.entra = "espera";
    // El margen de arriba es enorme a propósito: si el navegador salta más abajo (al volver atrás), lo que quedó arriba también se muestra.
    const io = new IntersectionObserver((es) => { if (es.some((x) => x.isIntersecting)) { el.dataset.entra = "vista"; io.disconnect(); } },
      { rootMargin: "100000px 0px -8% 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return <section ref={ref} id={id} className={className} aria-label={etiqueta}>{children}</section>;
}

/** Número que cuenta hasta su valor, una sola vez, cuando entra en pantalla. El texto final es exactamente `texto`. */
export function Contador({ texto }: { texto: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current, p = partirNumero(texto);
    if (!el || !p || quieto()) return;
    let raf = 0, hecho = false;
    const nf = nfDec(p.decimales);
    const io = new IntersectionObserver((es) => {
      if (hecho || !es.some((x) => x.isIntersecting)) return;
      hecho = true; io.disconnect();
      const t0 = performance.now(), dur = 900;
      const paso = (t: number) => {
        const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 4);
        el.textContent = k < 1 ? p.antes + nf.format(p.valor * e) + p.despues : texto;
        if (k < 1) raf = requestAnimationFrame(paso);
      };
      raf = requestAnimationFrame(paso);
    }, { threshold: 0.4 });
    io.observe(el);
    return () => { io.disconnect(); cancelAnimationFrame(raf); el.textContent = texto; };
  }, [texto]);
  return <span ref={ref}>{texto}</span>;
}

/** Fila que se desliza de costado: marca en `data-mas` de qué lado hay más contenido (para la sombra del borde)
 *  y, si `paseo` es true y no entra, hace un solo paseo lento de ida y vuelta al entrar en pantalla. Se frena al tocarla o pasar el mouse. */
export function useDeslizable(ref: RefObject<HTMLElement | null>, paseo = false, dep: unknown = null) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const marcar = () => {
      const max = el.scrollWidth - el.clientWidth;
      el.dataset.mas = max <= 1 ? "" : `${el.scrollLeft > 1 ? "izq " : ""}${el.scrollLeft < max - 1 ? "der" : ""}`.trim();
    };
    marcar();
    el.addEventListener("scroll", marcar, { passive: true });
    // Cambia el tamaño de la fila o de lo que tiene adentro (por ejemplo, al agregar una variable): se vuelve a marcar.
    const ro = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(marcar);
    const mirar = () => { ro?.disconnect(); ro?.observe(el); Array.from(el.children).forEach((h) => ro?.observe(h)); marcar(); };
    const mo = typeof MutationObserver === "undefined" ? null : new MutationObserver(mirar);
    mo?.observe(el, { childList: true });
    mirar();
    let raf = 0, io: IntersectionObserver | null = null;
    const frenar = () => { cancelAnimationFrame(raf); raf = 0; el.style.scrollSnapType = ""; };
    const eventos = ["pointerdown", "pointerenter", "wheel", "touchstart", "focusin"] as const;
    if (paseo && !quieto()) {
      eventos.forEach((e) => el.addEventListener(e, frenar, { passive: true }));
      io = new IntersectionObserver((es) => {
        const max = el.scrollWidth - el.clientWidth;
        if (!es.some((x) => x.isIntersecting) || max <= 8 || el.matches(":hover")) return;
        io?.disconnect();
        const dur = Math.max(2400, (max / 40) * 1000), t0 = performance.now();   // ~40 px por segundo
        el.style.scrollSnapType = "none";
        const paso = (t: number) => {
          const k = (t - t0) / (dur * 2);
          if (k >= 1) { el.scrollLeft = 0; frenar(); return; }
          el.scrollLeft = max * (0.5 - 0.5 * Math.cos(k * 2 * Math.PI));
          raf = requestAnimationFrame(paso);
        };
        raf = requestAnimationFrame(paso);
      }, { threshold: 0.9 });
      io.observe(el);
    }
    return () => {
      el.removeEventListener("scroll", marcar); ro?.disconnect(); mo?.disconnect(); io?.disconnect(); frenar();
      eventos.forEach((e) => el.removeEventListener(e, frenar));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref, paseo, dep]);
}
