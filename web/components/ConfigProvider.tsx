"use client";
// Contexto de la configuración global + panel (botón ⚙ y ventana). Ver docs/specs/configuracion-global.md.
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Modal } from "./ui";
import { IconoAjustes } from "./Iconos";
import { PRES_DEF } from "@/lib/estadisticas";
import {
  CLAVE, DEFECTO, DESDES, aplicarColPres, DOLARES, MEDIDAS, TEMAS, T_MAX, T_MIN, aplicarTema, guardar, leer, txtTLargo,
  type Config,
} from "@/lib/config";

interface Ctx {
  config: Config;
  /** Cambia una o más opciones, las aplica y las guarda. Sube `rev` (las secciones sacan de la URL el inicio del link). */
  cambiar: (c: Partial<Config>) => void;
  reiniciar: () => void;
  /** Cuenta los cambios hechos desde el panel en esta pestaña. */
  rev: number;
  abrirPanel: () => void;
}
const ConfigCtx = createContext<Ctx | null>(null);
export const useConfig = (): Ctx => {
  const c = useContext(ConfigCtx);
  if (!c) throw new Error("useConfig fuera de ConfigProvider");
  return c;
};

export function ConfigProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<Config>(DEFECTO);
  const [guardado, setGuardado] = useState(true);
  const [rev, setRev] = useState(0);
  const [abierto, setAbierto] = useState(false);

  // Primera lectura (después de hidratar, para que servidor y cliente coincidan) y cambios desde otras pestañas.
  useEffect(() => {
    const r = leer();
    setConfig(r.config); setGuardado(r.ok); aplicarTema(r.config.tema);
    const alCambiar = (ev: StorageEvent) => {
      if (ev.key !== null && ev.key !== CLAVE) return;
      const n = leer().config;
      setConfig(n); aplicarTema(n.tema); setRev((x) => x + 1); // las secciones sacan de la URL el inicio viejo
    };
    window.addEventListener("storage", alCambiar);
    return () => window.removeEventListener("storage", alCambiar);
  }, []);

  useEffect(() => { aplicarColPres(config.colPres); }, [config.colPres]);

  const aplicar = useCallback((n: Config) => {
    setConfig(n); aplicarTema(n.tema); setGuardado(guardar(n)); setRev((x) => x + 1);
  }, []);
  const cambiar = useCallback((c: Partial<Config>) => aplicar({ ...config, ...c }), [aplicar, config]);
  const reiniciar = useCallback(() => aplicar(DEFECTO), [aplicar]);
  const abrirPanel = useCallback(() => setAbierto(true), []);

  const valor = useMemo<Ctx>(() => ({ config, cambiar, reiniciar, rev, abrirPanel }), [config, cambiar, reiniciar, rev, abrirPanel]);
  return (
    <ConfigCtx.Provider value={valor}>
      {children}
      {abierto && <Panel onCerrar={() => setAbierto(false)} guardado={guardado} />}
    </ConfigCtx.Provider>
  );
}

/** Botón de configuración del encabezado: con texto en computadora y solo el ícono (con `aria-label`) en celular. */
export function BotonConfig() {
  const { abrirPanel } = useConfig();
  return <button type="button" className="config-btn" aria-label="Configuración" onClick={abrirPanel}><IconoAjustes /><span className="solo-grande">Configurar</span></button>;
}

/** Color de fábrica de un presidente (la variable de serie de la que sale) como #rrggbb, para el selector de color. */
function colorBase(v: string): string {
  const x = getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  if (/^#[0-9a-f]{6}$/i.test(x)) return x;
  return v === "--neutral" ? "" : colorBase("--neutral");   // sin color suelto: cae al gris del tema
}

const RANGO_T = Array.from({ length: T_MAX - T_MIN + 1 }, (_, i) => T_MIN + i);

function SelectT({ valor, onElegir, etiqueta, igual }: { valor: number | undefined; onElegir: (k: number | undefined) => void; etiqueta: string; igual?: string }) {
  return (
    <select aria-label={etiqueta} value={valor === undefined ? "" : String(valor)}
      onChange={(ev) => onElegir(ev.target.value === "" ? undefined : Number(ev.target.value))}>
      {igual && <option value="">{igual}</option>}
      {RANGO_T.map((k) => <option key={k} value={k}>{txtTLargo(k)}</option>)}
    </select>
  );
}
function Opciones<T extends string>({ etiqueta, valor, opciones, onElegir }: { etiqueta: string; valor: T; opciones: [T, string][]; onElegir: (v: T) => void }) {
  return (
    <div className="seg" role="group" aria-label={etiqueta}>
      {opciones.map(([v, t]) => <button key={v} type="button" aria-pressed={valor === v} onClick={() => onElegir(v)}>{t}</button>)}
    </div>
  );
}

function Panel({ onCerrar, guardado }: { onCerrar: () => void; guardado: boolean }) {
  const { config: c, cambiar, reiniciar } = useConfig();
  const setPres = (id: string, k: number | undefined) => {
    const t0p = { ...c.t0p };
    if (k === undefined) delete t0p[id]; else t0p[id] = k;
    cambiar({ t0p });
  };
  return (
    <Modal titulo="Configuración" onCerrar={onCerrar}>
      <div className="config-cuerpo">
        <h2>Configuración</h2>
        {!guardado && <p className="error" role="alert">No se pudo guardar en este navegador: se va a perder al cerrar.</p>}
        <section aria-labelledby="cfg-inicio">
          <h3 id="cfg-inicio">Inicio del mandato</h3>
          <p className="note">Desde qué mes se cuenta cada mandato (Por presidente, Meses de mandato, Curiosidades y Elecciones). T es el mes de asunción.</p>
          <div className="controls"><label>Para todos</label>
            <SelectT valor={c.t0} etiqueta="Inicio del mandato para todos" onElegir={(k) => cambiar({ t0: k ?? DEFECTO.t0 })} /></div>
          <div className="cfg-pres">
            {PRES_DEF.map((p) => (
              <div key={p.id} className="controls"><label>{p.n}</label>
                <SelectT valor={c.t0p[p.id]} etiqueta={`Inicio del mandato de ${p.n}`} igual="Igual que todos" onElegir={(k) => setPres(p.id, k)} /></div>
            ))}
          </div>
        </section>
        <section aria-labelledby="cfg-dolar">
          <h3 id="cfg-dolar">Dólar preferido</h3>
          <Opciones etiqueta="Dólar preferido" valor={c.dolar} opciones={DOLARES} onElegir={(dolar) => cambiar({ dolar })} />
        </section>
        <section aria-labelledby="cfg-medida">
          <h3 id="cfg-medida">Medida preferida</h3>
          <p className="note">Para los montos en pesos, al agregar o cambiar una variable. Los dólares usan el dólar preferido.</p>
          <Opciones etiqueta="Medida preferida" valor={c.medida} opciones={MEDIDAS} onElegir={(medida) => cambiar({ medida })} />
        </section>
        <section aria-labelledby="cfg-desde">
          <h3 id="cfg-desde">Período por defecto</h3>
          <p className="note">El &quot;Desde&quot; de Histórico cuando el link no trae uno.</p>
          <Opciones etiqueta="Período por defecto" valor={c.desde} opciones={DESDES} onElegir={(desde) => cambiar({ desde })} />
        </section>
        <section aria-labelledby="cfg-pres">
          <h3 id="cfg-pres">Presidentes en los gráficos</h3>
          <p className="note">Franjas de color detrás de las líneas, una por mandato. Se pueden prender o apagar en cada gráfico; acá se elige si arrancan prendidas. Los colores se usan en todo el sitio.</p>
          <Opciones etiqueta="Mostrar presidentes en los gráficos" valor={c.franjas ? "si" : "no"} opciones={[["no", "No"], ["si", "Sí, en todos los gráficos"]]} onElegir={(v) => cambiar({ franjas: v === "si" })} />
          <div className="cfg-pres">
            {PRES_DEF.map((p) => (
              <div key={p.id} className="controls"><label>{p.n}</label>
                <input type="color" aria-label={`Color de ${p.n}`} value={c.colPres[p.id] ?? colorBase(p.base)} onChange={(ev) => cambiar({ colPres: { ...c.colPres, [p.id]: ev.target.value } })} /></div>
            ))}
          </div>
          <button type="button" className="btn" disabled={!Object.keys(c.colPres).length} onClick={() => cambiar({ colPres: {} })}>Volver a los colores de fábrica</button>
        </section>
        <section aria-labelledby="cfg-tema">
          <h3 id="cfg-tema">Tema</h3>
          <Opciones etiqueta="Tema" valor={c.tema} opciones={TEMAS} onElegir={(tema) => cambiar({ tema })} />
        </section>
      </div>
      <footer>
        <button type="button" className="btn" onClick={reiniciar}>Volver a lo de fábrica</button>
        <button type="button" className="btn" onClick={onCerrar}>Cerrar</button>
      </footer>
    </Modal>
  );
}
