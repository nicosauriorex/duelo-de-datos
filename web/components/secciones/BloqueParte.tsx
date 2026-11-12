"use client";
// Bloque de la portada con las cifras principales del parte diario del Banco Central (docs/specs/parte-diario-bcra.md).
// Baja diario_bcra.json (~550 KB) recién cuando el bloque está por entrar en pantalla, para no demorar la portada.
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Entrada } from "../Movimiento";
import { useDiario } from "../useDiario";
import { variableDe, type ClaveDiario, type Parte } from "@/lib/diario";

const CIFRAS: ClaveDiario[] = ["minorista", "reservas", "compras"];

export function BloqueParte() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") { setVisible(true); return; }
    const io = new IntersectionObserver((es) => { if (es.some((x) => x.isIntersecting)) { setVisible(true); io.disconnect(); } }, { rootMargin: "300px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const { parte, error } = useDiario(visible);
  if (error) return null;   // sin el archivo, la portada no muestra un bloque vacío; la página /bcra/ explica el problema
  return (
    <Entrada className="bloque ancho">
      <h2 id="parte-banco-central">Parte del Banco Central</h2>
      <p className="bajada-bloque">Los datos del día del Banco Central, cada uno con su fecha.</p>
      <div ref={ref} className="parte-bloque-caja">{parte ? <Cifras parte={parte} /> : <p className="note" role="status">Cargando…</p>}</div>
    </Entrada>
  );
}

function Cifras({ parte }: { parte: Parte }) {
  return (
    <Link prefetch={false} href="/bcra/" className="parte-bloque" aria-label={`Abrir el parte del Banco Central del ${parte.fechaTxt}`}>
      <span className="parte-bloque-fecha">Datos del {parte.fechaTxt}</span>
      <ul className="parte-bloque-cifras">
        {CIFRAS.map((c) => variableDe(parte, c)).filter((v) => !!v).map((v) => (
          <li key={v!.clave}>
            <span className="parte-bloque-n">{v!.corto}</span>
            <b>{v!.valor}</b>
            <small>{v!.atrasada ? `al ${v!.fechaTxt}` : v!.difAnterior ? `${v!.difAnterior} contra el día anterior` : ""}</small>
          </li>
        ))}
      </ul>
      <span className="parte-bloque-ir">Ver el parte completo</span>
    </Link>
  );
}
