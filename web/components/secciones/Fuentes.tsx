"use client";
import { useDatos } from "../DatosProvider";
import { Cargando } from "../ui";
import { ORDEN_RAIZ } from "@/lib/catalogo";
import { fmtMes } from "@/lib/formato";
import { FUENTES_HTML } from "@/lib/fuentes";

export function Fuentes() {
  const { listo, motor, metas, errorGeneral } = useDatos();
  if (errorGeneral) return <p className="error" role="alert">{errorGeneral}</p>;
  if (!listo || !motor) return <Cargando />;
  const porRaiz: Record<string, number> = {};
  metas.forEach((s) => { porRaiz[s.cat[0]] = (porRaiz[s.cat[0]] || 0) + 1; });
  const F = motor.F;
  return (
    <section>
      <p className="sub">
        {metas.length} series en total: {ORDEN_RAIZ.filter((r) => porRaiz[r]).map((r) => `${r.toLowerCase()} (${porRaiz[r]})`).join(", ")}. Datos desde {fmtMes(F[0])} hasta {fmtMes(F[F.length - 1])}, según la serie.
      </p>
      <ul className="method" dangerouslySetInnerHTML={{ __html: FUENTES_HTML }} />
    </section>
  );
}
