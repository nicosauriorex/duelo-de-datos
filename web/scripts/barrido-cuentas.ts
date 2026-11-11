// Barrido B1 (tanda 4): las cuentas cierran. Se corre con `npx tsx scripts/barrido-cuentas.ts` desde `web/`.
// Prueba, con valores elegidos para caer en los bordes del redondeo, que cada función que muestra una diferencia
// la calcula con los valores tal como se ven, que nunca sale "-0,0" y que el color acompaña al texto.
import { crearMotor } from "../lib/motor";
import { claseVariacion } from "../lib/estadisticas";
import { fraseUltimoVs } from "../lib/historico";
import { nf1, redondeadoComo, restaLimpia } from "../lib/formato";

const fallas: string[] = [];
const espero = (que: string, salio: unknown, bien: boolean) => { if (!bien) fallas.push(`${que} → ${JSON.stringify(salio)}`); };

// El motor solo hace falta por sus funciones de texto: alcanza con una lista de meses vacía.
const m = crearMotor([]) as any;
const PCT = { pct: true, unidad: "%", serie: { tipo: "pct" } }, NIVEL = { pct: false, unidad: "$", serie: { tipo: "nivel" } };

// Pares en el borde del redondeo: se ven 1,9 y 2,1 (diferencia 0,2) aunque en crudo la diferencia sea 0,12.
const pares: [number, number][] = [[1.94, 2.06], [2.06, 1.94], [1.949, 1.951], [2.04, 2.0], [0.04, -0.04], [10.25, 10.34], [-3.06, -2.94], [99.96, 100.04]];
for (const [a, b] of pares) {
  const ra = redondeadoComo(nf1.format, a), rb = redondeadoComo(nf1.format, b), dif = restaLimpia(rb, ra) || 0;
  const t: string = m.variacionTxt(PCT, a, b);
  espero(`variacionTxt en puntos (${a} → ${b}), esperado ${nf1.format(dif)}`, t, t === `${dif > 0 ? "+" : ""}${nf1.format(dif)} p.p.`);
  espero(`variacionTxt sin "-0,0" (${a} → ${b})`, t, !/^[-−]0,0\b/.test(t));
  espero(`valor sin "-0,0" (${b})`, m.fmtC(PCT, b), !/^[-−]0,0/.test(m.fmtC(PCT, b)));
  const cls = claseVariacion(1, true, a, b);
  espero(`color de la variación en puntos (${a} → ${b})`, cls, cls === (dif > 0 ? "bueno" : dif < 0 ? "malo" : "neutro"));
  const fr: string = fraseUltimoVs(true, a, b, nf1.format);
  espero(`frase del resumen (${a} → ${b})`, fr, dif === 0 ? /igual/i.test(fr) : fr.includes(nf1.format(Math.abs(dif))) && /arriba/.test(fr) === dif > 0);
}
// Variaciones porcentuales mínimas: ni "-0,0 %" ni color con el texto en cero.
for (const [a, b] of [[1000, 999.8], [1000, 1000.2], [250, 250], [-50, -50.01]] as [number, number][]) {
  const t: string = m.variacionTxt(NIVEL, a, b);
  espero(`variacionTxt en % sin "-0,0" (${a} → ${b})`, t, !/^[-−]0,0\b/.test(t));
  if (/^\+?0,0 %$/.test(t)) espero(`color neutro con variación 0,0 % (${a} → ${b})`, claseVariacion(1, false, a, b), claseVariacion(1, false, a, b) === "neutro");
}

if (fallas.length) { console.error(`Cuentas que no cierran: ${fallas.length}`); for (const f of fallas) console.error(" - " + f); process.exit(1); }
console.log("Barrido de cuentas: sin hallazgos.");
