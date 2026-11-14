// Única fuente de las secciones del sitio: carpeta, nombre público y para qué sirve, agrupadas para el menú "Más".
// Los textos salen de la portada (SECCIONES_INICIO) más "Parte del Banco Central" y "Fuentes".

export type GrupoSeccion = "presidentes" | "mundo" | "estado" | "herramientas";

export interface Seccion { carpeta: string; nombre: string; para: string; grupo: GrupoSeccion }

export const GRUPOS_SECCIONES: { id: GrupoSeccion; titulo: string }[] = [
  { id: "presidentes", titulo: "Comparar presidentes" },
  { id: "mundo", titulo: "Argentina y el mundo" },
  { id: "estado", titulo: "El Estado por dentro" },
  { id: "herramientas", titulo: "Herramientas" },
];

const S = (carpeta: string, nombre: string, para: string, grupo: GrupoSeccion): Seccion => ({ carpeta, nombre, para, grupo });

/** En el orden en que se muestran dentro de cada grupo. */
export const SECCIONES: Seccion[] = [
  S("presidentes", "Por presidente", "Fijate qué pasó con un dato en el mandato de cada presidente.", "presidentes"),
  S("mandato", "Meses de mandato", "Poné a todos los presidentes en la misma largada y compará mes a mes.", "presidentes"),
  S("herencia", "Herencia", "Cómo estaba cada dato cuando asumió cada presidente y cómo lo dejó.", "presidentes"),
  S("ranking", "Ranking", "Ordená a los presidentes según cómo cambió cada dato en su mandato.", "presidentes"),
  S("elecciones", "Elecciones", "Mirá qué datos de la economía se movieron junto con el voto en cada elección.", "presidentes"),
  S("congreso", "Gobierno y Congreso", "Bancas, leyes, decretos y vetos de cada gobierno.", "presidentes"),
  S("contexto", "Contexto internacional", "Compará a la Argentina con otros países y con los precios del mundo.", "mundo"),
  S("gasto", "En qué gasta la Nación", "Cuánto gastó el Estado nacional cada año: para qué, quién, en qué y dónde, presupuestado y ejecutado.", "estado"),
  S("provincias", "Las provincias", "El gasto que la Nación declara en cada provincia, por habitante y en pesos de hoy.", "estado"),
  S("universidades", "Universidades", "Lo que la Nación transfiere a cada universidad nacional, año por año, y cómo se controla.", "estado"),
  S("historico", "Histórico", "Elegí cualquier dato y mirá cómo cambió en el tiempo, solo o comparado con otros.", "herramientas"),
  S("semaforo", "Semáforo de actividad", "Los indicadores de actividad en una tabla: cuáles subieron y cuáles bajaron cada mes.", "herramientas"),
  S("bcra", "Parte del Banco Central", "Los datos del día del Banco Central, cada uno con su fecha.", "herramientas"),
  S("plantillas", "Gráficos listos", "Gráficos ya armados para abrir, cambiar y compartir.", "herramientas"),
  S("fuentes", "Fuentes", "De dónde sale cada dato y cómo se calcula.", "herramientas"),
];

export const seccionesDe = (g: GrupoSeccion): Seccion[] => SECCIONES.filter((s) => s.grupo === g);
