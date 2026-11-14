"use client";
import { useEffect, useRef, useState } from "react";

export type EstadoAparecer = "quieto" | "espera" | "vista";

/** `ref` + estado de aparición. Fuera de pantalla (y con movimiento permitido) pasa a "espera" y, al entrar, a "vista" una sola vez.
 *  Sin JavaScript, sin IntersectionObserver, con "reducir movimiento" o si ya está a la vista, queda "quieto": el CSS solo esconde en "espera". */
export function useAparecer<T extends HTMLElement = HTMLElement>(): [React.RefObject<T | null>, EstadoAparecer] {
  const ref = useRef<T | null>(null);
  const [estado, setEstado] = useState<EstadoAparecer>("quieto");
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const r = el.getBoundingClientRect();
    if (r.top < window.innerHeight && r.bottom > 0) return; // ya está a la vista: se ve completo
    setEstado("espera");
    const obs = new IntersectionObserver((es) => {
      if (es.some((e) => e.isIntersecting)) { setEstado("vista"); obs.disconnect(); }
    }, { threshold: 0, rootMargin: "0px 0px -8% 0px" });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return [ref, estado];
}
