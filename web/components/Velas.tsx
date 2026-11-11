// Gráfico de velas acostadas para "Por presidente": una vela por presidente, todas en la misma escala.
// La línea fina va del mínimo al máximo del mandato; el cuerpo, del valor de inicio al de cierre (verde si mejoró, rojo si empeoró, gris si no hay dirección).
// SVG a mano, sin librerías. Los valores ya vienen formateados: acá solo se dibuja.

export interface VelaDato {
  id: string; nombre: string; periodo: string;
  ini: number; fin: number; min: number; max: number;
  iniTxt: string; finTxt: string; minTxt: string; maxTxt: string;
  variacion: string;                       // con signo: "+120 %", "−3,5 pp"
  cls: "bueno" | "malo" | "neutro";
  nota: string | null;                     // "datos desde ene-95"
}

const CLS_TXT = { bueno: "mejoró", malo: "empeoró", neutro: "" } as const;

export function Velas({ velas, sinDatos, unidad, minEscala, maxEscala }: { velas: VelaDato[]; sinDatos: string[]; unidad: string; minEscala: string; maxEscala: string }) {
  const lo = Math.min(...velas.map((v) => v.min)), hi = Math.max(...velas.map((v) => v.max));
  const rango = hi > lo ? hi - lo : 1;
  const x = (v: number) => ((v - lo) / rango) * 100;
  const cero = lo < 0 && hi > 0 ? x(0) : null;
  return (
    <div className="velas">
      <p className="note velas-leyenda">Cada vela es un mandato. La línea fina va del mínimo al máximo; el cuerpo, del valor de inicio al de cierre: verde si mejoró, rojo si empeoró, gris si para este dato no se califica. Misma escala para todos ({minEscala} a {maxEscala}; {unidad}).</p>
      <ol className="velas-lista">
        {velas.map((v) => {
          const a = Math.min(x(v.ini), x(v.fin)), w = Math.max(Math.abs(x(v.fin) - x(v.ini)), 1);
          const lectura = `${v.nombre}: inicio ${v.iniTxt}, cierre ${v.finTxt}, mínimo ${v.minTxt}, máximo ${v.maxTxt}${CLS_TXT[v.cls] ? `; ${CLS_TXT[v.cls]}` : ""}`;
          return (
            <li key={v.id} className="vela">
              <div className="vela-cab">
                <b>{v.nombre}</b> <small>{v.periodo}</small>
                <span className={`vela-var${v.cls !== "neutro" ? ` var-${v.cls}` : ""}`}>{v.variacion}</span>
                {v.nota && <small className="vela-nota">{v.nota}</small>}
              </div>
              <svg className="vela-svg" viewBox="0 0 100 20" preserveAspectRatio="none" role="img" aria-label={lectura}>
                {cero != null && <line className="vela-cero" x1={cero} x2={cero} y1="0" y2="20" />}
                <line className="vela-mecha" x1={x(v.min)} x2={x(v.max)} y1="10" y2="10" />
                <line className="vela-tope" x1={x(v.min)} x2={x(v.min)} y1="6" y2="14" />
                <line className="vela-tope" x1={x(v.max)} x2={x(v.max)} y1="6" y2="14" />
                <rect className={`vela-cuerpo c-${v.cls}`} x={a} width={w} y="3" height="14" />
              </svg>
              <div className="vela-val"><span>Inicio <b>{v.iniTxt}</b></span><span>Cierre <b>{v.finTxt}</b></span></div>
            </li>
          );
        })}
      </ol>
      {sinDatos.length > 0 && <p className="note">Sin datos de esta variable: {sinDatos.join(", ")}.</p>}
    </div>
  );
}
