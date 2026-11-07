"use strict";
// =====================================================================
// DatosArgentina: datos
// =====================================================================
const D = window.DATOS;
const F = D.fechas, N = F.length;
const MESES = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];
const fmtMes = s => { if (!s) return "–"; const [y, m] = s.split("-"); return MESES[+m - 1] + "-" + y.slice(2); };
const nf0 = new Intl.NumberFormat("es-AR", {maximumFractionDigits: 0});
const nf1 = new Intl.NumberFormat("es-AR", {maximumFractionDigits: 1, minimumFractionDigits: 1});
const nf2 = new Intl.NumberFormat("es-AR", {maximumFractionDigits: 2, minimumFractionDigits: 2});
const nf3 = new Intl.NumberFormat("es-AR", {maximumSignificantDigits: 3});
const fmtNum = v => { const a = Math.abs(v); return a >= 1000 ? nf0.format(v) : a >= 10 ? nf1.format(v) : a >= 0.1 || a === 0 ? nf2.format(v) : nf3.format(v); };
const ok = v => v != null && isFinite(v);
const lastIdx = arr => { for (let i = arr.length - 1; i >= 0; i--) if (ok(arr[i])) return i; return -1; };
const idxDe = f => F.indexOf(f);
const mul = (...xs) => xs.some(v => !ok(v)) ? null : xs.reduce((a, b) => a * b, 1);
const norm = s => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const esc = s => String(s).replace(/[&<>"]/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;"}[c]));

function expandir(i0, v) { const a = new Array(N).fill(null); v.forEach((x, k) => { a[i0 + k] = x; }); return a; }
const SER = {};
D.series.forEach(s => {
  s.vals = expandir(s.i0, s.v);
  if (s.min) { s.mn = expandir(s.min.i0, s.min.v); s.mx = expandir(s.max.i0, s.max.v); }
  if (s.tipo === "none" && /TNA/.test(s.u)) s.tipo = "tasa";
  SER[s.id] = s;
});
// Índice = número sin unidad propia (base = 100); valor = monto, precio, tasa, cantidad
const esIndice = s => s.tipo === "idx" || /índice/i.test(s.u || "");
const POB = SER.poblacion ? SER.poblacion.vals : null;        // habitantes, mensual
const PIB_AN = SER.pib_nom_anual ? SER.pib_nom_anual.vals : null; // millones de $ corrientes, últimos 12 meses
const FACTOR_U = u => /^millones de /.test(u) ? [1e6, u.replace(/^millones de /, "")] : /^miles de /.test(u) ? [1e3, u.replace(/^miles de /, "")] : [1, u];
const IPC = SER.ipc_empalme.vals, CPI = SER.cpi_usa.vals;
const REF_AR = lastIdx(IPC), REF_US = lastIdx(CPI);
const FX = {oficial: SER.fx_oficial.vals, blue: SER.fx_blue.vals, mep: SER.fx_mep.vals, ccl: SER.fx_ccl.vals};
const FX_NOM = {oficial: "oficial", blue: "blue", mep: "MEP", ccl: "CCL"};
const FX_COLOR = {oficial: "--series-1", blue: "--series-2", mep: "--series-3", ccl: "--series-4"};
const realAR = i => ok(IPC[i]) ? IPC[REF_AR] / IPC[i] : null;
const realUS = i => ok(CPI[i]) ? CPI[REF_US] / CPI[i] : null;
const refAR = fmtMes(F[REF_AR]), refUS = fmtMes(F[REF_US]);
const MONETARIA = s => ["ars", "idx", "usd", "fx"].includes(s.tipo);

// =====================================================================
// Medidas
// =====================================================================
const MED = {
  ars: [["real", `Pesos reales (de ${refAR})`], ["corr", "Pesos corrientes"],
        ...Object.keys(FX).map(k => [`usdr_${k}`, `Dólares reales al ${FX_NOM[k]} (de ${refUS})`]),
        ...Object.keys(FX).map(k => [`usd_${k}`, `Dólares corrientes al ${FX_NOM[k]}`])],
  fx: [["corr", "Pesos corrientes"], ["real", `Pesos reales (de ${refAR})`], ["realbi", "Pesos reales, neto de inflación de EEUU"]],
  usd: [["corr", "Dólares corrientes"], ["usdr", `Dólares reales (de ${refUS})`], ["arscorr", "Pesos corrientes (al oficial)"], ["real", `Pesos reales (de ${refAR}, al oficial)`]],
  none: [["asis", "Tal cual"]],
  tasa: [["asis", "Nominal (TNA)"], ["tea", "Efectiva anual (TEA)"], ["real_a", "Real anual: TEA descontada la inflación de 12 meses"],
         ["real_m", "Real mensual: tasa del mes descontada la inflación del mes"]],
};
// Los índices se ven tal cual. Única excepción: índices de salarios, que se pueden ver descontada la inflación (salario real).
// Indicadores de variación: sirven para ver la inflación de cada rubro del IPC (p.ej. bienes vs. servicios) o el crecimiento de un índice.
const VARS = [["vm", "Variación mensual (%)"], ["via", "Variación interanual (%)"], ["vac", "Acumulada en el año (%)"]];
const ES_VAR = m => m === "vm" || m === "via" || m === "vac";
MED.idx = [["corr", "Índice tal cual"], ...VARS];
MED.idxprecio = [["corr", "Índice tal cual"], ["real", "Precio relativo: contra la inflación general"], ...VARS];
MED.idxsal = [["corr", "Índice tal cual (nominal)"], ["real", "Real: descontada la inflación"], ...VARS];
MED.ars = MED.ars.concat(VARS.map(([k, n]) => [k, n.replace(" (%)", " en pesos (%)")]));
MED.fx = MED.fx.concat(VARS);
const medidasDe = s => s.tipo === "idx" ? (s.dir === 1 ? MED.idxsal : s.cat[0] === "Precios" ? MED.idxprecio : MED.idx) : (MED[s.tipo] || MED.none);
function variacion(arr, med) {
  return arr.map((x, i) => {
    if (!ok(x)) return null;
    let j = med === "vm" ? i - 1 : med === "via" ? i - 12 : i - (+F[i].slice(5, 7));   // vac: contra diciembre del año anterior
    if (med === "vm") { while (j >= 0 && i - j < 4 && !ok(arr[j])) j--; }               // series trimestrales: contra el período anterior
    return j >= 0 && ok(arr[j]) && arr[j] !== 0 ? (x / arr[j] - 1) * 100 : null;
  });
}
const medDefault = s => ({ars: "real", idx: s.dir === 1 ? "real" : "corr", fx: "corr", usd: "corr"}[s.tipo] || "asis");

function transformar(s, arr, med) {
  const t = s.tipo;
  if (t === "tasa") {
    if (med === "tea") return arr.map(x => ok(x) ? (Math.pow(1 + x / 1200, 12) - 1) * 100 : null);
    if (med === "real_a") return arr.map((x, i) => ok(x) && i >= 12 && ok(IPC[i]) && ok(IPC[i - 12]) ? (Math.pow(1 + x / 1200, 12) / (IPC[i] / IPC[i - 12]) - 1) * 100 : null);
    if (med === "real_m") return arr.map((x, i) => ok(x) && i >= 1 && ok(IPC[i]) && ok(IPC[i - 1]) ? ((1 + x / 1200) / (IPC[i] / IPC[i - 1]) - 1) * 100 : null);
    return arr.slice();
  }
  if (ES_VAR(med)) return variacion(arr, med);
  if (t === "none" || med === "asis") return arr.slice();
  if (t === "ars" || t === "idx") return arr.map((x, i) => {
    if (!ok(x)) return null;
    if (med === "corr") return x;
    if (med === "real") return mul(x, realAR(i));
    const [tipo, fx] = med.split("_");
    const usd = FX[fx] && FX[fx][i] ? x / FX[fx][i] : null;
    return tipo === "usd" ? usd : mul(usd, realUS(i));
  });
  if (t === "fx") return arr.map((x, i) => !ok(x) ? null : med === "corr" ? x : med === "real" ? mul(x, realAR(i)) : mul(x, realAR(i), 1 / realUS(i)));
  if (t === "usd") return arr.map((x, i) => !ok(x) ? null : med === "corr" ? x : med === "usdr" ? mul(x, realUS(i))
    : med === "arscorr" ? mul(x, FX.oficial[i]) : mul(x, FX.oficial[i], realAR(i)));
  return arr.slice();
}
function unidadDe(s, med) {
  const u = s.u || "";
  if (s.tipo === "tasa") return {tea: "% efectiva anual (TEA)", real_a: "% real anual (TEA vs. inflación de 12 meses)", real_m: "% real mensual (vs. inflación del mes)"}[med] || u;
  if (ES_VAR(med)) return {vm: "% de variación mensual", via: "% de variación interanual", vac: "% acumulado en el año"}[med];
  if (s.tipo === "none" || med === "asis") return u;
  if (s.tipo === "idx") {
    if (med === "corr") return u;
    if (med === "real") return s.cat[0] === "Precios" ? `${u}, relativo al IPC general` : `${u}, descontada la inflación`;
    const [tipo, fx] = med.split("_");
    return `${u}, en dólares${tipo === "usdr" ? " reales" : ""} al ${FX_NOM[fx]}`;
  }
  if (s.tipo === "ars") {
    if (med === "corr") return u;
    if (med === "real") return u.replace("$", `$ de ${refAR}`);
    const [tipo, fx] = med.split("_");
    return u.replace("$", tipo === "usdr" ? `US$ de ${refUS}` : "US$") + ` (${FX_NOM[fx]})`;
  }
  if (s.tipo === "fx") return med === "corr" ? u : med === "real" ? `$ de ${refAR} por US$` : `$ de ${refAR} por US$, neto infl. EEUU`;
  if (s.tipo === "usd") return {corr: u, usdr: u.replace("US$", `US$ de ${refUS}`), arscorr: u.replace("US$", "$"), real: u.replace("US$", `$ de ${refAR}`)}[med] || u;
  return u;
}
const nominalPesos = s => s.tipo === "usd" ? s.vals.map((x, i) => mul(x, FX.oficial[i])) : s.vals;

// "En términos de": solo precios en pesos (productos, canastas) y el dólar, contra salarios, canastas, dólar u otros precios.
const relPermitido = s => !s.agg && ((s.tipo === "ars" && (s.cat[0] === "Precios" || s.id.startsWith("can_"))) || s.tipo === "fx");
const relDestino = s => !s.agg && (s.tipo === "ars" || s.tipo === "fx");
// Por habitante y % del PIB: solo montos agregados de toda la economía (reservas, recaudación, PIB, depósitos, deuda…)
const escPermitidas = s => s.agg ? [["", "Total"], ...(POB ? [["pc", "Por habitante"]] : []), ...(PIB_AN && s.tipo !== "none" ? [["pib", "% del PIB"]] : [])] : [];
function suma12(arr) {
  return arr.map((_, i) => { if (i < 11) return null; let t = 0; for (let k = i - 11; k <= i; k++) { if (!ok(arr[k])) return null; t += arr[k]; } return t; });
}

// Expresión = {id, med, rel, modo, esc}. calc() devuelve la serie lista para graficar.
const cacheCalc = new Map();
function calc(e) {
  const k = JSON.stringify(e); if (cacheCalc.has(k)) return cacheCalc.get(k);
  const A = SER[e.id];
  let r;
  const esc = escPermitidas(A).some(o => o[0] === e.esc) ? e.esc : "";
  if (esc === "pib") {
    const [fa] = FACTOR_U(A.u || "");
    let nom = nominalPesos(A).map(x => ok(x) ? x * fa / 1e6 : null); // a millones de $
    if (A.flujo) nom = suma12(nom);
    const v = nom.map((x, i) => ok(x) && ok(PIB_AN[i]) && PIB_AN[i] ? x / PIB_AN[i] * 100 : null);
    r = {v, nombre: `${A.n} (% del PIB)`, corto: `${A.n}, % PIB`, unidad: A.flujo ? "% del PIB (suma de 12 meses / PIB de 12 meses)" : "% del PIB anual", dir: A.dir || 0, ultimo: !!A.flujo};
  } else if (e.rel && SER[e.rel] && relPermitido(A)) {
    const B = SER[e.rel];
    const a = nominalPesos(A), b = nominalPesos(B);
    let v = a.map((x, i) => ok(x) && ok(b[i]) && x !== 0 && b[i] !== 0 ? (e.modo === "medido" ? x / b[i] : b[i] / x) : null);
    const esIdx = A.tipo === "idx" || B.tipo === "idx";
    if (esIdx) { const p = v.find(ok); v = v.map(x => ok(x) ? x / p * 100 : null); }
    const cant = (A.u || "").startsWith("$ por ") ? A.u.slice(6) : "unidades";
    const dirAB = Math.sign((B.dir || 0) - (A.dir || 0));
    r = e.modo === "medido"
      ? {v, nombre: `${A.n} medido en ${B.n}`, unidad: esIdx ? "índice (primer dato = 100)" : `veces "${B.n}"`, dir: -dirAB}
      : {v, nombre: `${A.n}: cuánto se compra con 1 ${B.n}`, unidad: esIdx ? "índice (primer dato = 100)" : `${cant} por cada ${B.n}`, dir: dirAB};
    r.corto = e.modo === "medido" ? `${A.n} / ${B.n}` : `${A.n} por ${B.n}`;
  } else {
    const med = e.forzar || medidasDe(A).some(m => m[0] === e.med) ? e.med : medDefault(A);
    r = {v: transformar(A, A.vals, med), nombre: A.n, corto: A.n, unidad: unidadDe(A, med), dir: A.dir || 0, flujo: !!A.flujo};
    if (A.mn) { r.lo = transformar(A, A.mn, med); r.hi = transformar(A, A.mx, med); }
    if (esc === "pc") {
      const [fa, uu] = FACTOR_U(r.unidad);
      const pc = arr => arr.map((x, i) => ok(x) && ok(POB[i]) ? x * fa / POB[i] : null);
      r.v = pc(r.v); if (r.lo) { r.lo = pc(r.lo); r.hi = pc(r.hi); }
      r.unidad = `${uu.replace(/^personas$/, "")} por habitante`.trim(); r.nombre += " por habitante"; r.corto += " p/hab.";
    }
  }
  r.pct = /%/.test(r.unidad) && !/\$/.test(r.unidad);
  r.serie = A;
  cacheCalc.set(k, r);
  return r;
}
const fmtC = (c, x) => !ok(x) ? "–" : c.pct ? nf1.format(x) + " %" : fmtNum(x);
const variacionTxt = (c, desde, hasta) => {
  if (!ok(desde) || !ok(hasta)) return "–";
  if (c.pct) { const d = hasta - desde; return `${d > 0 ? "+" : ""}${nf1.format(d)} p.p.`; }
  if (desde === 0) return "–";
  const d = (hasta / desde - 1) * 100;
  return `${d > 0 ? "+" : ""}${Math.abs(d) >= 1000 ? nf0.format(d) : nf1.format(d)} %`;
};

// =====================================================================
// Pestañas, popovers y controles
// =====================================================================
const renders = {};
const secciones = [...document.querySelectorAll("main > section")];
const nav = document.getElementById("tabs");
let tabActual = "historico";
try { tabActual = localStorage.getItem("da_tab") || "historico"; } catch (e) { /* sin almacenamiento */ }
secciones.forEach(s => {
  const id = s.id.replace("tab-", ""), b = document.createElement("button");
  b.textContent = s.dataset.titulo; b.setAttribute("role", "tab"); b.dataset.id = id;
  b.onclick = () => mostrarTab(id); nav.appendChild(b);
});
function mostrarTab(id) {
  if (!document.getElementById("tab-" + id)) id = "historico";
  tabActual = id;
  try { localStorage.setItem("da_tab", id); } catch (e) { /* nada */ }
  secciones.forEach(s => s.hidden = s.id !== "tab-" + id);
  [...nav.children].forEach(b => b.setAttribute("aria-selected", b.dataset.id === id));
  document.getElementById("periodo_wrap").style.display = id === "historico" ? "" : "none";
  if (renders[id]) renders[id]();
}
function popover(btnId, popId) {
  const b = document.getElementById(btnId), p = document.getElementById(popId);
  b.onclick = ev => { ev.stopPropagation(); p.hidden = !p.hidden; };
  p.onclick = ev => ev.stopPropagation();
  document.addEventListener("click", () => { p.hidden = true; });
}
function botones(el, opciones, st, key, multi, onChange, vacio = false) {
  if (typeof el === "string") el = document.getElementById(el);
  el.innerHTML = "";
  const pintar = () => [...el.children].forEach((x, i) => x.setAttribute("aria-pressed", multi ? st[key].has(opciones[i][0]) : st[key] === opciones[i][0]));
  opciones.forEach(([val, txt]) => {
    const b = document.createElement("button"); b.textContent = txt;
    b.onclick = () => {
      if (multi) { if (st[key].has(val)) { if (st[key].size > 1 || vacio) st[key].delete(val); } else st[key].add(val); } else st[key] = val;
      pintar(); onChange();
    };
    el.appendChild(b);
  });
  pintar();
  return pintar;
}
function opcionesSelect(sel, opciones, valor) {
  sel.innerHTML = opciones.map(o => `<option value="${esc(o[0])}">${esc(o[1])}</option>`).join("");
  if (valor != null && opciones.some(o => o[0] === valor)) sel.value = valor;
}

// =====================================================================
// Selector de variables (árbol + búsqueda)
// =====================================================================
const ORDEN_RAIZ = ["Salarios", "Precios", "Dólar y tipo de cambio", "Mercados", "Tasas de interés", "Dinero y bancos (BCRA)",
  "Actividad", "Empleo, pobreza e ingresos", "Sector externo", "Fiscal", "Opinión pública (UTDT)"];
const picker = {el: document.getElementById("picker"), lista: document.getElementById("pk_lista"), buscar: document.getElementById("pk_buscar"),
  migas: document.getElementById("pk_migas"), pie: document.getElementById("pk_pie"), cb: null, raiz: null, camino: []};
function armarArbol(filtro) {
  const raiz = {nombre: "Todas las variables", hijos: new Map(), items: [], total: 0};
  ORDEN_RAIZ.forEach(n => raiz.hijos.set(n, {nombre: n, hijos: new Map(), items: [], total: 0}));
  D.series.forEach(s => {
    if (filtro && !filtro(s)) return;
    let nodo = raiz; raiz.total++;
    s.cat.forEach(c => {
      if (!nodo.hijos.has(c)) nodo.hijos.set(c, {nombre: c, hijos: new Map(), items: [], total: 0});
      nodo = nodo.hijos.get(c); nodo.total++;
    });
    nodo.items.push(s);
  });
  for (const [k, v] of raiz.hijos) if (!v.total) raiz.hijos.delete(k);
  // "Nacional" primero, después GBA y el resto de las regiones
  const primero = n => { if (n.hijos.has("Nacional")) n.hijos = new Map([...n.hijos].sort((a, b) => (a[0] === "Nacional" ? -1 : 0) - (b[0] === "Nacional" ? -1 : 0))); n.hijos.forEach(primero); };
  primero(raiz);
  return raiz;
}
function abrirPicker(cb, filtro, titulo) {
  picker.cb = cb; picker.raiz = armarArbol(filtro); picker.camino = []; picker.filtro = filtro; picker.todo = false;
  picker.buscar.value = ""; picker.buscar.placeholder = titulo || "Buscar: ropa, alquiler, salario, reservas, asado…";
  picker.el.hidden = false; pintarPicker(); setTimeout(() => picker.buscar.focus(), 0);
}
function cerrarPicker() { picker.el.hidden = true; }
function elegir(id) { cerrarPicker(); if (picker.cb) picker.cb(id); }
// Sinónimos coloquiales para la búsqueda
const ALIAS = [
  [/prendas|calzado|vestir/, "ropa vestimenta zapatillas zapatos indumentaria"], [/electricidad/, "luz energia tarifas"], [/gas/, "tarifas garrafa"],
  [/combustible/, "nafta gasoil"], [/transporte publico/, "colectivo tren subte boleto"], [/medicinal|salud/, "remedios medicamentos farmacia"],
  [/prepaga/, "obra social medicina"], [/telefonia|comunicacion/, "celular internet"], [/alimentos/, "comida supermercado"],
  [/alquiler/, "renta vivienda inquilino"], [/restaurantes/, "comer afuera delivery"], [/educacion/, "colegio escuela universidad cuotas"],
  [/sipa|ripte|salario|jubilacion/, "sueldo ingreso"], [/fx_|dolar/, "dolar divisa cambio"], [/riesgo/, "embi bonos"],
  [/reservas/, "bcra dolares"], [/pobreza|indigencia/, "pobres"], [/emae|pib/, "crecimiento actividad economia"],
  [/desocupacion/, "desempleo paro"], [/recaudacion/, "impuestos afip arca"], [/resultado/, "deficit superavit fiscal"],
  [/carnes|asado|nalga|cuadril|paleta|picada/, "carne vaca vacio"], [/bebidas alcoholicas/, "vino cerveza alcohol"], [/tabaco/, "cigarrillos"],
];
const textoBusqueda = s => {
  const base = norm(s.n + " " + s.cat.join(" ") + " " + (s.desc || "") + " " + s.id);
  return base + " " + ALIAS.filter(([re]) => re.test(base)).map(a => a[1]).join(" ");
};
const insignia = s => esIndice(s) ? `<span class="tag idx" title="Índice: un número sin unidad (base = 100). Se ve tal cual.">Índice</span>`
  : s.tipo === "tasa" || /%/.test(s.u) ? `<span class="tag" title="Porcentaje o tasa">%</span>` : `<span class="tag val" title="Valor: monto, precio o cantidad con unidad">Valor</span>`;
const infoBtn = id => `<span class="info-btn" role="button" tabindex="0" data-info="${esc(id)}" title="Qué es y cómo se calcula">i</span>`;
function pintarPicker() {
  const q = norm(picker.buscar.value.trim());
  let html = "";
  if (q) {
    const toks = q.split(/\s+/);
    const res = [];
    const enCamino = s => picker.camino.every((c, k) => s.cat[k] === c);
    D.series.forEach(s => {
      if (picker.filtro && !picker.filtro(s)) return;
      if (picker.camino.length && !picker.todo && !enCamino(s)) return;
      const nombre = norm(s.n), todo = s._busca || (s._busca = textoBusqueda(s));
      if (!toks.every(t => todo.includes(t))) return;
      const score = toks.reduce((a, t) => a + (nombre.includes(t) ? 2 : 0) + (nombre.startsWith(t) ? 1 : 0), 0);
      res.push([score, s]);
    });
    res.sort((a, b) => b[0] - a[0] || a[1].n.length - b[1].n.length);
    html = res.slice(0, 150).map(([, s]) => `<li><button data-id="${s.id}" title="${esc(s.desc || "")}"><span>${esc(s.n)}<span class="ruta">${esc(s.cat.join(" › "))} · ${esc(s.u)}</span></span>${insignia(s)}</button>${infoBtn(s.id)}</li>`).join("");
    picker.migas.innerHTML = picker.camino.length
      ? (picker.todo ? `Buscando en todas las variables · <button data-scope="sec">buscar solo en ${esc(picker.camino[picker.camino.length - 1])}</button>`
        : `Buscando en <b>${esc(picker.camino.join(" › "))}</b> · <button data-scope="todo">buscar en todo</button>`) : "";
    picker.pie.textContent = res.length ? `${res.length} resultados${res.length > 150 ? " (se muestran 150)" : ""}. Enter elige el primero.` : "Sin resultados. Probá con otra palabra" + (picker.camino.length && !picker.todo ? " o buscá en todo." : ".");
  } else {
    let nodo = picker.raiz;
    picker.camino.forEach(c => { nodo = nodo.hijos.get(c); });
    picker.migas.innerHTML = [`<button data-nivel="0">Todas</button>`, ...picker.camino.map((c, k) => `› <button data-nivel="${k + 1}">${esc(c)}</button>`)].join(" ");
    const infoCat = picker.camino.length && INFO_CAT[picker.camino[picker.camino.length - 1]];
    html = (infoCat ? `<li class="info-cat">${infoCat}</li>` : "") +
      [...nodo.hijos.values()].map(h => `<li class="carpeta"><button data-carpeta="${esc(h.nombre)}"><span>${esc(h.nombre)}${INFO_CAT[h.nombre] ? ' <span class="tiene-info" title="Tiene explicación">ⓘ</span>' : ""}</span><span class="cuenta">${h.total}</span></button></li>`).join("") +
      nodo.items.map(s => `<li><button data-id="${s.id}" title="${esc(s.desc || "")}"><span>${esc(s.n)}<span class="ruta">${esc(s.u)}</span></span>${insignia(s)}</button>${infoBtn(s.id)}</li>`).join("");
    picker.pie.textContent = picker.camino.length ? `Escribí para buscar dentro de ${picker.camino[picker.camino.length - 1]}. Esc para cerrar.` : "Elegí una categoría o escribí para buscar. Esc para cerrar.";
  }
  picker.lista.innerHTML = html;
  picker.lista.scrollTop = 0;
}
picker.buscar.oninput = pintarPicker;
picker.buscar.onkeydown = ev => {
  if (ev.key === "Enter") { const b = picker.lista.querySelector("button[data-id]"); if (b) elegir(b.dataset.id); }
  if (ev.key === "Escape") cerrarPicker();
};
picker.lista.onclick = ev => {
  const inf = ev.target.closest("[data-info]"); if (inf) { abrirInfo(inf.dataset.info); return; }
  const b = ev.target.closest("button"); if (!b) return;
  if (b.dataset.id) elegir(b.dataset.id);
  else if (b.dataset.carpeta) { picker.camino.push(b.dataset.carpeta); picker.todo = false; picker.buscar.value = ""; pintarPicker(); picker.buscar.focus(); }
};
picker.migas.onclick = ev => {
  const b = ev.target.closest("button"); if (!b) return;
  if (b.dataset.scope) { picker.todo = b.dataset.scope === "todo"; pintarPicker(); picker.buscar.focus(); return; }
  picker.camino = picker.camino.slice(0, +b.dataset.nivel); picker.todo = false; pintarPicker();
};

// ---------------------------------------------------------------- Ventana de información
const INFO_CAT = {
  "Salarios": `<b>¿Qué salario mirar?</b><ul>
    <li><b>SIPA mediana</b>: el sueldo bruto del asalariado registrado del sector privado que está justo en el medio (la mitad gana menos). <b>Es el más representativo del trabajador formal típico</b>, porque los sueldos muy altos no lo inflan.</li>
    <li><b>SIPA promedio</b>: el mismo universo, pero promedio; los sueldos altos lo tiran para arriba (suele ser ~30% más que la mediana). Incluye horas extra, premios y aguinaldo (acá repartido en el semestre).</li>
    <li><b>RIPTE</b>: promedio de la remuneración imponible de trabajadores estables. Se usa para actualizar cosas por ley (riesgos del trabajo, antes jubilaciones). Tiene tope imponible, así que recorta los sueldos más altos. Sin aguinaldo en la fuente (acá × 13/12).</li>
    <li><b>Índice de salarios (INDEC)</b>: no es un monto sino un índice. Es el único que cubre también al <b>sector público</b> y a los <b>no registrados (informales)</b>; el informal sale con 5 meses de rezago. Sirve para comparar evolución, no niveles.</li>
    <li><b>Salario mínimo, vital y móvil</b>: es un piso legal, no lo que cobra la gente (casi ningún convenio formal está tan abajo). Sirve como referencia legal: seguro de desempleo, planes sociales, embargos, montos de multas. No sirve para saber cuánto se gana.</li>
    <li><b>Jubilación mínima</b>: haber mínimo de ANSES (lo cobra cerca de la mitad de los jubilados). "Con bono" suma el refuerzo que paga el Gobierno aparte, que desde mar-2024 está fijo en $70.000 y no se actualiza.</li></ul>
    Todos son brutos (antes de descuentos), salvo jubilaciones.`,
  "Precios": `<b>IPC INDEC</b>: índices por región y rubro (base dic-2016 = 100). Además del índice tal cual, cada rubro se puede ver como <b>inflación</b> (variación mensual, interanual o acumulada en el año) o como <b>precio relativo</b> (cuánto subió contra la inflación general). Para saber si se encarecieron más los bienes o los servicios: elegí "IPC Bienes (Nacional)" y "IPC Servicios (Nacional)" con "Variación interanual", o comparalos en base 100. <b>Precios promedio</b>: el precio en pesos de productos concretos (kg de asado, litro de leche), que sí se pueden poner "en términos de" un salario o del dólar. <b>Inflación de largo plazo</b>: IPC empalmado con fuentes alternativas para 2007-2016, cuando el INDEC estuvo intervenido.`,
  "IPC INDEC (índices, dic-2016 = 100)": `Índices de precios al consumidor del INDEC. Nacional: nivel general y 12 divisiones; las regiones agregan grupos y clases (carnes, alquiler, combustibles, etc.). Un índice no tiene unidad: 250 quiere decir que los precios son 2,5 veces los de dic-2016. Cada rubro se puede ver como variación mensual, interanual o acumulada (su propia inflación) o como precio relativo: por encima de 100 de su base, subió más que el IPC general.`,
  "Opinión pública (UTDT)": `Encuestas mensuales de la Universidad Di Tella. <b>Confianza del consumidor (ICC)</b>: de 0 a 100, cómo ve la gente su situación, la del país y si es momento de comprar durables o inmuebles. <b>Confianza en el gobierno (ICG)</b>: de 0 a 5, evalúa al gobierno nacional en evaluación general, interés general, eficiencia, honestidad y capacidad. Suele caer fuerte en las crisis y subir en el primer año de cada gobierno.`,
  "Precios promedio por producto (INDEC)": `Precio promedio en pesos que releva el INDEC para el IPC (desde 2016). GBA tiene la lista más larga (~60 productos); las otras regiones, unos 14. Se puede ver en pesos reales, en dólares o "en términos de" un salario: cuántos kg compra un sueldo.`,
  "Dólar y tipo de cambio": `<b>Oficial (A3500)</b>: mayorista de referencia del BCRA. <b>Minorista</b>: el de las ventanillas de bancos. <b>Blue</b>: mercado informal. <b>MEP</b> y <b>CCL</b>: dólar comprado con bonos o acciones, legal; el CCL deja el dinero afuera. <b>Brecha</b>: cuánto más caro está un dólar que el oficial. <b>Tipo de cambio real multilateral</b>: compara el peso con las monedas de los socios comerciales ajustando por inflación de cada país; más alto = Argentina más barata (dólar "alto").`,
  "Tasas de interés": `Tasas nominales anuales (TNA). Con inflación alta la TNA engaña: se puede ver la <b>tasa real</b> (descontada la inflación). Real anual: la TEA contra la inflación de los 12 meses previos. Real mensual: la tasa del mes contra la inflación de ese mes. Positiva = el plazo fijo le ganó a la inflación.`,
  "Dinero y bancos (BCRA)": `<b>Base monetaria</b>: billetes en circulación más encajes de los bancos en el BCRA. <b>Depósitos y préstamos</b>: totales del sistema. <b>Reservas</b>: brutas (incluyen encajes en dólares, swap con China y préstamos; las netas son bastante menos). Los montos agregados se pueden ver por habitante o como % del PIB.`,
  "Actividad": `<b>EMAE</b>: estimador mensual de la actividad (anticipa el PIB). <b>PIB</b>: trimestral, a precios de 2004 (ya es real). <b>ISAC</b>: construcción. Son índices o cantidades: no se pasan a dólares ni a pesos reales.`,
  "Empleo, pobreza e ingresos": `<b>Desocupación, empleo e informalidad</b>: EPH, trimestral, 31 aglomerados urbanos. <b>Trabajadores registrados</b>: SIPA, mensual (personas con aportes). <b>Pobreza e indigencia</b>: EPH, semestral (se ubica en enero y julio). <b>Canastas</b>: lo que una familia necesita para no ser pobre (CBT) o indigente (CBA).`,
  "Sector externo": `Exportaciones e importaciones de bienes (INDEC, en dólares), saldo comercial, términos del intercambio (precio de lo que vendemos vs. lo que compramos) y soja.`,
  "Fiscal": `Sector público nacional, base caja. <b>Resultado primario</b>: ingresos menos gastos sin contar intereses de la deuda. <b>Resultado financiero</b>: después de pagar intereses. Las cifras mensuales son muy estacionales: conviene verlas como % del PIB (suma de 12 meses) o por año.`,
  "Mercados": `<b>Riesgo país</b>: cuánta tasa extra paga Argentina sobre los bonos de EEUU (en puntos básicos: 100 = 1%). Más bajo = el mundo confía más.`,
};
const infoEl = document.getElementById("info");
function abrirInfo(id) {
  const s = SER[id]; if (!s) return;
  const li = lastIdx(s.vals), f0 = F[s.i0];
  const cats = s.cat.map(c => INFO_CAT[c] ? `<details><summary>Sobre "${esc(c)}"</summary><div class="info-cat">${INFO_CAT[c]}</div></details>` : "").join("");
  const med = medidasDe(s).map(m => m[1]).join(" · ");
  document.getElementById("info_cuerpo").innerHTML = `<h2>${esc(s.n)}</h2><p class="note">${esc(s.cat.join(" › "))}</p>
    <p>${esc(s.desc || "")}</p>
    <table class="ficha"><tr><td>Tipo</td><td>${esIndice(s) ? "Índice (sin unidad, se ve tal cual)" : "Valor"}</td></tr>
    <tr><td>Unidad</td><td>${esc(s.u)}</td></tr><tr><td>Datos</td><td>${fmtMes(f0)} a ${fmtMes(F[li])}</td></tr>
    <tr><td>Fuente</td><td>${esc(s.fuente)}</td></tr><tr><td>Se puede ver</td><td>${esc(med)}${s.agg ? " · por habitante · % del PIB" : ""}${relPermitido(s) ? " · en términos de otra variable" : ""}</td></tr>
    <tr><td>Bueno o malo</td><td>${s.dir > 0 ? "Que suba es bueno" : s.dir < 0 ? "Que suba es malo" : "Neutro"}</td></tr></table>${cats}`;
  infoEl.hidden = false;
}
infoEl.onclick = ev => { if (ev.target === infoEl || ev.target.closest("[data-cerrar]")) infoEl.hidden = true; };
document.addEventListener("keydown", ev => { if (ev.key === "Escape" && !infoEl.hidden) { infoEl.hidden = true; ev.stopImmediatePropagation(); } }, true);
document.addEventListener("click", ev => { const b = ev.target.closest("[data-info]"); if (b && !picker.lista.contains(b)) abrirInfo(b.dataset.info); });
picker.el.onclick = ev => { if (ev.target === picker.el) cerrarPicker(); };
document.addEventListener("keydown", ev => { if (ev.key === "Escape" && !picker.el.hidden) cerrarPicker(); });

// Fila de controles de una variable: [variable] [medida] [en términos de] [modo] [quitar]
function filaVariable(cont, getE, setE, opts = {}) {
  cont = typeof cont === "string" ? document.getElementById(cont) : cont;
  function pintar() {
    const e = getE();
    if (!e) {
      cont.style.display = opts.agregable ? "" : "none";
      cont.innerHTML = `<button class="btn" data-acc="agregar">${opts.textoAgregar || "+ Agregar una segunda variable (eje derecho)"}</button>`;
      cont.querySelector("button").onclick = () => abrirPicker(id => { setE({id, med: medDefault(SER[id]), rel: null, modo: "compra", esc: ""}); }, null, "Buscá o navegá");
      return;
    }
    cont.style.display = "";
    const A = SER[e.id];
    const escs = escPermitidas(A), escV = escs.some(o => o[0] === e.esc) ? e.esc : "";
    const meds = medidasDe(A);
    const relOk = relPermitido(A) && !escV && !opts.sinRel;
    const conRel = relOk && e.rel;
    cont.innerHTML =
      (opts.color ? `<span class="punto" style="--c:var(${opts.color})"></span>` : "") +
      `<button class="btn var" data-acc="var" title="${esc(A.n)}">${esc(A.n)}</button>${infoBtn(A.id)}` +
      (conRel || escV === "pib" ? "" : meds.length < 2 ? `<span class="lbl">${esIndice(A) ? "Índice: se ve tal cual" : esc(A.u)}</span>`
        : `<select data-acc="med">${meds.map(m => `<option value="${m[0]}"${m[0] === e.med ? " selected" : ""}>${esc(m[1])}</option>`).join("")}</select>`) +
      (escs.length && !conRel ? `<select data-acc="esc" title="Total, por habitante o como % del PIB">${escs.map(o => `<option value="${o[0]}"${o[0] === escV ? " selected" : ""}>${o[1]}</option>`).join("")}</select>` : "") +
      (relOk ? `<span class="lbl">en términos de</span><button class="btn var" data-acc="rel">${e.rel ? esc(SER[e.rel].n) : "ninguna (elegir…)"}</button>` +
        (e.rel ? `<select data-acc="modo"><option value="compra"${e.modo !== "medido" ? " selected" : ""}>¿Cuántos ${esc(A.n)} compra 1 ${esc(SER[e.rel].n)}?</option><option value="medido"${e.modo === "medido" ? " selected" : ""}>${esc(A.n)} medido en ${esc(SER[e.rel].n)}</option></select><button class="btn quitar" data-acc="sinrel" title="Quitar">✕ quitar</button>` : "")
        : "") +
      (opts.quitable ? `<button class="btn quitar" data-acc="quitar" title="Quitar esta variable">✕</button>` : "");
    cont.querySelector('[data-acc="var"]').onclick = () => abrirPicker(id => {
      const nuevo = {...getE(), id, med: medDefault(SER[id]), esc: ""}; if (!relPermitido(SER[id])) nuevo.rel = null; setE(nuevo);
    });
    const med = cont.querySelector('[data-acc="med"]'); if (med) med.onchange = () => setE({...getE(), med: med.value});
    const escSel = cont.querySelector('[data-acc="esc"]'); if (escSel) escSel.onchange = () => setE({...getE(), esc: escSel.value, rel: escSel.value ? null : getE().rel});
    const rel = cont.querySelector('[data-acc="rel"]');
    if (rel) rel.onclick = () => abrirPicker(id => setE({...getE(), rel: id, modo: getE().modo || "compra"}), relDestino, "En términos de: salario, dólar, canasta, otro precio…");
    const modo = cont.querySelector('[data-acc="modo"]'); if (modo) modo.onchange = () => setE({...getE(), modo: modo.value});
    const sinrel = cont.querySelector('[data-acc="sinrel"]'); if (sinrel) sinrel.onclick = () => setE({...getE(), rel: null});
    const quitar = cont.querySelector('[data-acc="quitar"]'); if (quitar) quitar.onclick = () => setE(null);
  }
  pintar();
  return pintar;
}

// =====================================================================
// Gráfico de líneas (uno o dos ejes, bandas, escala log)
// =====================================================================
function niceTicks(min, max, n) {
  const span = max - min || Math.abs(max) || 1, step0 = span / n, mag = Math.pow(10, Math.floor(Math.log10(step0)));
  const step = [1, 2, 2.5, 5, 10].map(f => f * mag).find(s => span / s <= n) || mag * 10;
  const t = []; let v = Math.floor(min / step) * step;
  t.push(v); while (v < max - 1e-9) { v += step; t.push(+v.toPrecision(12)); }
  return t;
}
function logTicks(min, max) {
  const t = [];
  for (let e = Math.floor(Math.log10(min)); e <= Math.ceil(Math.log10(max)); e++)
    [1, 2, 5].forEach(f => { const v = f * Math.pow(10, e); if (v >= min * 0.999 && v <= max * 1.001) t.push(v); });
  return t.length > 9 ? t.filter(v => Math.abs(Math.log10(v) % 1) < 1e-9) : t;
}
const mesNum = f => +f.slice(0, 4) * 12 + (+f.slice(5, 7) - 1);
function escala(vals, opts, ih, top) {
  if (!vals.length) return null;
  let lo = Math.min(...vals), hi = Math.max(...vals);
  if (opts.log && lo > 0) {
    const ticks = logTicks(lo, hi), l0 = Math.log10(lo), l1 = Math.log10(hi);
    return {ticks, y: v => top + ih - ((Math.log10(v) - l0) / ((l1 - l0) || 1)) * ih, log: true};
  }
  if (opts.zero && lo > 0) lo = 0;
  if (opts.zero && hi < 0) hi = 0;
  const pad = (hi - lo) * 0.04 || Math.abs(hi) * 0.05 || 1;
  const ticks = niceTicks(opts.zero && lo === 0 ? 0 : lo - pad, hi + pad * 0.75, 5);
  const a = ticks[0], b = ticks[ticks.length - 1];
  return {ticks, y: v => top + ih - ((v - a) / ((b - a) || 1)) * ih, log: false, lo: a, hi: b};
}
function lineChart(el, tipEl, rows, series, opts) {
  const W = 960, H = opts.height || 340;
  const dual = series.some(s => s.axis === 1);
  const m = {t: 14, r: dual ? 74 : (opts.endLabels ? 110 : 16), b: 28, l: 74};
  const iw = W - m.l - m.r, ih = H - m.t - m.b;
  const okv = (v, ax) => ok(v) && (!(ax ? opts.log2 : opts.log) || v > 0);
  const valsDe = ax => rows.flatMap(r => series.filter(s => opts.mismaEscala || (s.axis || 0) === ax).flatMap(s => s.band ? [r[s.key], r[s.key + "_lo"], r[s.key + "_hi"]] : [r[s.key]])).filter(v => okv(v, ax));
  const sc = [escala(valsDe(0), {log: opts.log, zero: opts.zero}, ih, m.t), dual ? escala(valsDe(1), {log: opts.log2, zero: opts.zero2}, ih, m.t) : null];
  if (dual && opts.mismaEscala) sc[1] = sc[0];
  if (!sc[0] && !sc[1]) { el.innerHTML = `<p class="note">Sin datos para esta selección.</p>`; return; }
  if (!sc[0]) sc[0] = sc[1];
  const yDe = s => sc[s.axis || 0].y;
  const xs = opts.xVals || rows.map((r, i) => r.fecha ? mesNum(r.fecha) : i);
  const x0 = xs[0], x1 = xs[xs.length - 1];
  const x = i => m.l + ((xs[i] - x0) / ((x1 - x0) || 1)) * iw;
  const pocos = rows.length <= 60 || (!opts.xVals && rows.length < (x1 - x0 + 1) * 0.6);
  let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(opts.label || "")}">`;
  sc[0].ticks.forEach(t => {
    s += `<line x1="${m.l}" x2="${W - m.r}" y1="${sc[0].y(t)}" y2="${sc[0].y(t)}" stroke="var(--grid)"/>`;
    s += `<text x="${m.l - 8}" y="${sc[0].y(t) + 4}" text-anchor="end">${opts.fmtAxis(t)}</text>`;
  });
  if (dual && sc[1]) sc[1].ticks.forEach(t => s += `<text x="${W - m.r + 8}" y="${sc[1].y(t) + 4}">${(opts.fmtAxis2 || opts.fmtAxis)(t)}</text>`);
  if (dual) {
    s += `<text x="${m.l - 8}" y="${m.t - 2}" text-anchor="end" style="fill:var(--text-secondary)">● izq.</text>`;
    s += `<text x="${W - m.r + 8}" y="${m.t - 2}" style="fill:var(--text-secondary)">● der.</text>`;
  }
  if (opts.refLine != null && !sc[0].log && opts.refLine >= sc[0].lo && opts.refLine <= sc[0].hi)
    s += `<line x1="${m.l}" x2="${W - m.r}" y1="${sc[0].y(opts.refLine)}" y2="${sc[0].y(opts.refLine)}" stroke="var(--axis)" stroke-dasharray="4 3"/>`;
  s += `<line x1="${m.l}" x2="${W - m.r}" y1="${m.t + ih}" y2="${m.t + ih}" stroke="var(--axis)"/>`;
  if (opts.xLabel) {
    rows.forEach((r, i) => { const t = opts.xLabel(r, i); if (t !== "" && t != null) s += `<text x="${x(i)}" y="${H - 8}" text-anchor="middle">${t}</text>`; });
  } else {
    const nYears = (x1 - x0) / 12, yStep = nYears > 24 ? 5 : nYears > 12 ? 2 : 1;
    if (nYears < 1.5) rows.forEach((r, i) => { if (i % Math.max(1, Math.ceil(rows.length / 8)) === 0) s += `<text x="${x(i)}" y="${H - 8}" text-anchor="middle">${fmtMes(r.fecha)}</text>`; });
    else {
      const vistos = new Set();
      rows.forEach(r => {
        const yr = +r.fecha.slice(0, 4), xx = m.l + ((yr * 12 - x0) / ((x1 - x0) || 1)) * iw;
        if (!vistos.has(yr) && yr % yStep === 0 && xx >= m.l - 1) { vistos.add(yr); s += `<text x="${xx}" y="${H - 8}" text-anchor="middle">${yr}</text>`; }
      });
    }
  }
  series.forEach(se => {
    if (!se.band) return;
    const y = yDe(se), ax = se.axis || 0;
    let seg = [];
    const flush = () => {
      if (seg.length > 1) {
        const up = seg.map(i => `${x(i).toFixed(1)},${y(rows[i][se.key + "_hi"]).toFixed(1)}`);
        const dn = seg.slice().reverse().map(i => `${x(i).toFixed(1)},${y(rows[i][se.key + "_lo"]).toFixed(1)}`);
        s += `<path d="M${up.join("L")}L${dn.join("L")}Z" fill="var(${se.color})" fill-opacity="0.18"/>`;
      }
      seg = [];
    };
    rows.forEach((r, i) => { if (okv(r[se.key + "_lo"], ax) && okv(r[se.key + "_hi"], ax)) seg.push(i); else flush(); });
    flush();
  });
  // Líneas de referencia: finas y punteadas, con solo una letra (U, P, M…) en el borde; los valores van en la leyenda de arriba
  const halo = 'paint-order:stroke;stroke:var(--surface-1);stroke-width:3px;stroke-linejoin:round';
  if (opts.refs && opts.refs.length) {
    const labs = [];
    opts.refs.forEach(rf => {
      const scr = sc[rf.axis || 0]; if (!scr || !okv(rf.v, rf.axis || 0)) return;
      const yy = scr.y(rf.v); if (yy < m.t - 1 || yy > m.t + ih + 1) return;
      s += `<line x1="${m.l}" x2="${W - m.r}" y1="${yy.toFixed(1)}" y2="${yy.toFixed(1)}" stroke="var(${rf.color})" stroke-opacity="0.55" stroke-width="1" stroke-dasharray="${rf.dash || "2 4"}"/>`;
      labs.push({y: yy, t: rf.letra, color: rf.color, axis: rf.axis || 0});
    });
    [0, 1].forEach(ax => {
      const l = labs.filter(o => o.axis === ax).sort((a, b) => a.y - b.y);
      for (let k = 1; k < l.length; k++) if (l[k].y - l[k - 1].y < 10) l[k].y = l[k - 1].y + 10;
      l.forEach(o => s += `<text x="${ax ? W - m.r - 3 : m.l + 3}" y="${(o.y + 3.5).toFixed(1)}" text-anchor="${ax ? "end" : "start"}" style="font-size:10px;font-weight:600;fill:var(${o.color});${halo}">${esc(o.t)}</text>`);
    });
  }
  const maxGap = opts.maxGap || 13;
  series.forEach(se => {
    const y = yDe(se), ax = se.axis || 0;
    let d = "", prev = -1, nOk = 0, first = -1, last = -1;
    rows.forEach((r, i) => {
      const v = r[se.key]; if (!okv(v, ax)) return;
      const une = prev >= 0 && (xs[i] - xs[prev]) <= maxGap;   // une puntos de series trimestrales, semestrales o anuales
      d += (une ? "L" : "M") + x(i).toFixed(1) + "," + y(v).toFixed(1); prev = i; nOk++; if (first < 0) first = i; last = i;
    });
    s += `<path d="${d}" fill="none" stroke="var(${se.color})" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"${se.dash ? ' stroke-dasharray="5 4"' : ""}/>`;
    const ralo = nOk > 0 && (nOk <= 60 || nOk < (last - first + 1) * 0.6);
    if (pocos || ralo) rows.forEach((r, i) => { if (okv(r[se.key], ax)) s += `<circle cx="${x(i)}" cy="${y(r[se.key])}" r="2.5" fill="var(${se.color})"/>`; });
    for (let i = rows.length - 1; i >= 0; i--) if (okv(rows[i][se.key], ax)) {
      s += `<circle cx="${x(i)}" cy="${y(rows[i][se.key])}" r="4" fill="var(${se.color})" stroke="var(--surface-1)" stroke-width="2"/>`; break;
    }
  });
  // Marcadores con etiqueta: último dato, máximo y mínimo (con fecha)
  if (opts.marcas && opts.marcas.length) {
    const tit = opts.tipTitle || (r => fmtMes(r.fecha));
    const etqs = [];
    opts.marcas.forEach(mk => {
      const ax = mk.axis || 0, y = sc[ax].y;
      let iu = -1, imx = -1, imn = -1;
      rows.forEach((r, i) => { const v = r[mk.key]; if (!okv(v, ax)) return; iu = i; if (imx < 0 || v > rows[imx][mk.key]) imx = i; if (imn < 0 || v < rows[imn][mk.key]) imn = i; });
      if (iu < 0) return;
      const pts = new Map();
      if (mk.tipos.has("max")) pts.set(imx, ["Máx."]);
      if (mk.tipos.has("min")) (pts.get(imn) || pts.set(imn, []).get(imn)).push("Mín.");
      if (mk.tipos.has("ult")) (pts.get(iu) || pts.set(iu, []).get(iu)).unshift("Último");
      pts.forEach((nom, i) => {
        const v = rows[i][mk.key], cx = x(i), cy = y(v);
        s += `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="4" fill="var(--surface-1)" stroke="var(${mk.color})" stroke-width="2"/>`;
        const arriba = i === imx && i !== imn ? true : i === imn && i !== imx ? false : cy > m.t + ih / 2;
        etqs.push({cx, cy, ty: arriba ? cy - 9 : cy + 15, t: `${mk.fmt(v)} · ${tit(rows[i], i)}`, color: mk.color});
      });
    });
    etqs.sort((a, b) => a.ty - b.ty);
    for (let k = 1; k < etqs.length; k++) if (Math.abs(etqs[k].ty - etqs[k - 1].ty) < 12 && Math.abs(etqs[k].cx - etqs[k - 1].cx) < 150) etqs[k].ty = etqs[k - 1].ty + 12;
    etqs.forEach(o => {
      const ty = Math.max(m.t + 9, Math.min(m.t + ih - 3, o.ty));
      const anc = o.cx > W - m.r - 90 ? "end" : o.cx < m.l + 90 ? "start" : "middle";
      s += `<text x="${o.cx.toFixed(1)}" y="${ty.toFixed(1)}" text-anchor="${anc}" style="font-size:11px;fill:var(--text-primary);${halo}">${esc(o.t)}</text>`;
    });
  }
  if (opts.endLabels && !dual) {
    const lab = series.map(se => { for (let i = rows.length - 1; i >= 0; i--) if (okv(rows[i][se.key], 0)) return {se, i, y: yDe(se)(rows[i][se.key])}; return null; })
      .filter(Boolean).sort((a, b) => a.y - b.y);
    for (let k = 1; k < lab.length; k++) if (lab[k].y - lab[k - 1].y < 14) lab[k].y = lab[k - 1].y + 14;
    lab.forEach(l => s += `<text x="${x(l.i) + 8}" y="${l.y + 4}" style="fill:var(--text-secondary)">${esc(l.se.short || l.se.name)}</text>`);
  }
  s += `<line class="xh" x1="0" x2="0" y1="${m.t}" y2="${m.t + ih}" stroke="var(--axis)" stroke-dasharray="3 3" visibility="hidden"/>`;
  series.forEach((se, k) => s += `<circle class="dot dot${k}" r="5" fill="var(${se.color})" stroke="var(--surface-1)" stroke-width="2" visibility="hidden"/>`);
  s += `<rect x="${m.l}" y="${m.t}" width="${iw}" height="${ih}" fill="transparent" class="hit"/></svg>`;
  el.innerHTML = s;
  const svg = el.querySelector("svg"), xh = svg.querySelector(".xh");
  const move = ev => {
    const pt = svg.createSVGPoint(); pt.x = ev.clientX; pt.y = ev.clientY;
    const p = pt.matrixTransform(svg.getScreenCTM().inverse());
    const xv = x0 + (p.x - m.l) / iw * (x1 - x0);
    let i = 0, best = Infinity; xs.forEach((v, k) => { const d = Math.abs(v - xv); if (d < best) { best = d; i = k; } });
    const r = rows[i];
    xh.setAttribute("x1", x(i)); xh.setAttribute("x2", x(i)); xh.setAttribute("visibility", "visible");
    let html = `<b>${opts.tipTitle ? opts.tipTitle(r, i) : fmtMes(r.fecha)}</b>`;
    series.forEach((se, k) => {
      const dot = svg.querySelector(".dot" + k), v = r[se.key], ax = se.axis || 0;
      if (!okv(v, ax)) { dot.setAttribute("visibility", "hidden"); return; }
      dot.setAttribute("cx", x(i)); dot.setAttribute("cy", yDe(se)(v)); dot.setAttribute("visibility", "visible");
      const f = se.fmt || opts.fmtTip;
      const sub = opts.tipSub ? opts.tipSub(r, se) : "";
      const rango = se.band && okv(r[se.key + "_lo"], ax) ? ` <small style="color:var(--text-muted)">(${f(r[se.key + "_lo"])} – ${f(r[se.key + "_hi"])})</small>` : "";
      html += `<div class="row"><span><i style="--c:var(${se.color})"></i>${esc(se.name)}${sub}</span><span>${f(v)}${rango}</span></div>`;
    });
    tipEl.innerHTML = html; tipEl.style.display = "block";
    const card = el.parentElement.getBoundingClientRect();
    let left = ev.clientX - card.left + 14; if (left + tipEl.offsetWidth > card.width - 8) left = ev.clientX - card.left - tipEl.offsetWidth - 14;
    tipEl.style.left = Math.max(4, left) + "px"; tipEl.style.top = (ev.clientY - card.top - 20) + "px";
  };
  const hide = () => { tipEl.style.display = "none"; xh.setAttribute("visibility", "hidden"); svg.querySelectorAll(".dot").forEach(d => d.setAttribute("visibility", "hidden")); };
  const hit = svg.querySelector(".hit");
  hit.addEventListener("pointermove", move); hit.addEventListener("pointerleave", hide);
}
const ejeFmt = c => v => c.pct ? nf0.format(v) + " %" : (Math.abs(v) >= 1e6 ? nf1.format(v / 1e6) + " M" : Math.abs(v) >= 1e4 ? nf0.format(v / 1e3) + " mil" : fmtNum(v));

// =====================================================================
// Filtro de período (solo Histórico)
// =====================================================================
const stF = {desde: "2003-01", hasta: F[N - 1], meses: new Set([1,2,3,4,5,6,7,8,9,10,11,12])};
const enFiltro = f => f >= stF.desde && f <= stF.hasta && stF.meses.has(+f.slice(5, 7));
(function initFiltro() {
  const d = document.getElementById("f_desde"), h = document.getElementById("f_hasta"), btn = document.getElementById("periodo_btn");
  [d, h].forEach(e => { e.min = F[0]; e.max = F[N - 1]; });
  d.value = stF.desde; h.value = stF.hasta;
  const texto = () => {
    const ms = stF.meses.size === 12 ? "todos los meses" : [...stF.meses].sort((a, b) => a - b).map(k => MESES[k - 1]).join(", ");
    btn.textContent = `Período: ${fmtMes(stF.desde)} – ${fmtMes(stF.hasta)} · ${ms}`;
  };
  const cambio = () => { texto(); if (renders[tabActual]) renders[tabActual](); };
  const ult = F[N - 1], hace12 = F[Math.max(0, N - 12)];
  const PRESETS = [[F[0], "Todo"], ["1995-01", "1995"], ["2003-01", "2003"], ["2011-01", "2011"], ["2017-01", "2017"], ["2023-01", "2023"], [hace12, "Último año"]];
  const ps = document.getElementById("f_preset");
  const pintarPreset = () => [...ps.children].forEach((b, i) => b.setAttribute("aria-pressed", stF.desde === PRESETS[i][0] && stF.hasta === ult));
  d.onchange = () => { if (d.value) { stF.desde = d.value; pintarPreset(); cambio(); } };
  h.onchange = () => { if (h.value) { stF.hasta = h.value; pintarPreset(); cambio(); } };
  PRESETS.forEach(([v, txt]) => {
    const b = document.createElement("button"); b.textContent = txt;
    b.onclick = () => { stF.desde = v; stF.hasta = ult; d.value = v; h.value = ult; pintarPreset(); cambio(); };
    ps.appendChild(b);
  });
  pintarPreset();
  const ms = document.getElementById("f_meses");
  const todos = document.createElement("button"); todos.textContent = "Todos"; ms.appendChild(todos);
  MESES.forEach((n, k) => { const b = document.createElement("button"); b.textContent = n; b.dataset.m = k + 1; ms.appendChild(b); });
  const pintarMeses = () => [...ms.children].forEach(b => b.setAttribute("aria-pressed", b === todos ? stF.meses.size === 12 : stF.meses.size < 12 && stF.meses.has(+b.dataset.m)));
  ms.onclick = ev => {
    const b = ev.target.closest("button"); if (!b) return;
    if (b === todos) stF.meses = new Set([1,2,3,4,5,6,7,8,9,10,11,12]);
    else {
      const k = +b.dataset.m;
      if (stF.meses.size === 12) stF.meses = new Set([k]);
      else if (stF.meses.has(k)) { stF.meses.delete(k); if (!stF.meses.size) stF.meses = new Set([1,2,3,4,5,6,7,8,9,10,11,12]); }
      else stF.meses.add(k);
    }
    pintarMeses(); cambio();
  };
  pintarMeses(); texto();
  popover("periodo_btn", "periodo_pop");
})();

// =====================================================================
// HISTÓRICO
// =====================================================================
const REFS_H = [
  {k: "ult", letra: "U", nom: "Último", btn: "U · Último", dash: "1 3", val: s => s.ult},
  {k: "prom", letra: "P", nom: "Promedio", btn: "P · Promedio", dash: "6 4", val: s => [s.prom]},
  {k: "med", letra: "M", nom: "Mediana", btn: "M · Mediana", dash: "2 3 8 3", val: s => [s.med]},
  {k: "max", letra: "↑", nom: "Máximo", btn: "↑ Máximo", dash: "4 2", val: s => s.max},
  {k: "min", letra: "↓", nom: "Mínimo", btn: "↓ Mínimo", dash: "4 2", val: s => s.min},
];
const PALETA = ["--series-1", "--series-2", "--series-3", "--series-4", "--series-5", "--series-6", "--series-7", "--series-8", "--neutral", "--text-secondary"];
const stH = {
  modo: "valor",
  a: {id: "pp_gba_asado", med: "real", rel: "sipa_prom", modo: "compra", esc: ""},
  b: null, extra: [], lista: [], escala: "lin", banda: "no", freq: "M", eje: "propia",
  refs: new Set(["ult", "prom", "med", "mk_ult", "mk_max", "mk_min"]),
};
if (!SER[stH.a.id]) stH.a = {id: "sipa_prom", med: "real", rel: null, modo: "compra", esc: ""};

// ---- Agrupar por trimestre o año
const MESES_PER = {T: q => [q * 3 - 2, q * 3 - 1, q * 3], A: () => [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]};
function agrupar(rows, freq, sumar = new Set(), ultimo = new Set()) {
  if (!freq || freq === "M" || !rows.length) return rows;
  const grupos = new Map();
  rows.forEach(r => {
    const y = r.fecha.slice(0, 4), q = Math.ceil(+r.fecha.slice(5, 7) / 3);
    const p = freq === "A" ? y : `${y}-${q}`;
    if (!grupos.has(p)) grupos.set(p, {y, q, rs: []});
    grupos.get(p).rs.push(r);
  });
  const keys = [...new Set(rows.flatMap(r => Object.keys(r)))].filter(k => k !== "fecha" && !k.startsWith("_"));
  return [...grupos.values()].map(({y, q, rs}) => {
    const esperado = MESES_PER[freq](q).filter(m => stF.meses.has(m)).length;
    const ini = freq === "A" ? `${y}-01` : `${y}-${String(q * 3 - 2).padStart(2, "0")}`;
    const o = {fecha: ini, per: (freq === "A" ? y : `T${q} ${y}`) + (rs.length < esperado ? ` (${rs.length} de ${esperado} meses)` : "")};
    keys.forEach(k => {
      const vals = rs.map(r => r[k]).filter(ok);
      if (!vals.length) { o[k] = null; return; }
      if (k.endsWith("_lo")) o[k] = Math.min(...vals);
      else if (k.endsWith("_hi")) o[k] = Math.max(...vals);
      else if (sumar.has(k)) o[k] = vals.length === esperado ? vals.reduce((a, b) => a + b, 0) : null;
      else if (ultimo.has(k)) o[k] = vals[vals.length - 1];
      else o[k] = vals.reduce((a, b) => a + b, 0) / vals.length;
    });
    return o;
  });
}
const etiqueta = r => r.per || fmtMes(r.fecha);
function estadisticasRows(rows, key) {
  const vals = rows.map(r => [r[key], etiqueta(r)]).filter(c => ok(c[0]));
  if (!vals.length) return null;
  const ord = vals.map(v => v[0]).sort((a, b) => a - b), h = Math.floor(ord.length / 2);
  return {ult: vals[vals.length - 1], pri: vals[0], prom: ord.reduce((a, b) => a + b, 0) / ord.length,
    med: ord.length % 2 ? ord[h] : (ord[h - 1] + ord[h]) / 2,
    min: vals.reduce((a, c) => c[0] < a[0] ? c : a), max: vals.reduce((a, c) => c[0] > a[0] ? c : a), n: vals.length};
}

// ---- Filas de variables
function pintarVars() {
  const cont = document.getElementById("h_vars"); cont.innerHTML = "";
  const mk = () => { const d = document.createElement("div"); d.className = "fila-var"; cont.appendChild(d); return d; };
  const re = () => { pintarVars(); renderHistorico(); };
  if (stH.modo === "valor") {
    filaVariable(mk(), () => stH.a, e => { if (e) stH.a = e; re(); }, {color: PALETA[0]});
    filaVariable(mk(), () => stH.b, e => { stH.b = e; re(); }, {color: PALETA[1], quitable: true, agregable: true});
  } else {
    stH.lista.forEach((_, k) => filaVariable(mk(), () => stH.lista[k], e => {
      if (e) stH.lista[k] = e; else stH.lista.splice(k, 1);
      re();
    }, {color: PALETA[k], quitable: stH.lista.length > 1}));
    if (stH.lista.length < 10) filaVariable(mk(), () => null, e => { if (e) stH.lista.push(e); re(); },
      {agregable: true, textoAgregar: `+ Agregar variable (${stH.lista.length} de 10)`});
  }
}
const pintarModoH = botones("h_modo", [["valor", "Valor de la serie (hasta 2 variables)"], ["b100", "Comparar en base 100 (hasta 10)"]], stH, "modo", false, () => {
  if (stH.modo === "b100") stH.lista = [stH.a, stH.b, ...stH.extra].filter(Boolean).slice(0, 10);
  else { stH.a = stH.lista[0] || stH.a; stH.b = stH.lista[1] || null; stH.extra = stH.lista.slice(2); }
  pintarVars(); renderHistorico();
});

function renderHistorico() {
  const b100 = stH.modo === "b100";
  const exprs = b100 ? stH.lista : [stH.a, stH.b].filter(Boolean);
  const lista = exprs.map((e, k) => {
    const c = calc(e);
    return {c, key: "s" + k, color: PALETA[k], axis: !b100 && k === 1 ? 1 : 0, flujo: !!c.flujo, ultimo: !!c.ultimo};
  });
  const dos = !b100 && lista.length === 2;
  const hayBanda = !b100 && lista.some(o => o.c.lo);
  const bd = hayBanda && stH.banda === "si";

  // filas: filtro de fechas -> agrupar -> recortar
  let rows = F.map((f, i) => {
    if (!enFiltro(f)) return null;
    const r = {fecha: f};
    lista.forEach(o => { r[o.key] = o.c.v[i]; if (bd && o.c.lo) { r[o.key + "_lo"] = o.c.lo[i]; r[o.key + "_hi"] = o.c.hi[i]; } });
    return r;
  }).filter(Boolean);
  rows = recortar(agrupar(rows, stH.freq, new Set(lista.filter(o => o.flujo).map(o => o.key)), new Set(lista.filter(o => o.ultimo).map(o => o.key))), lista.map(o => o.key));
  // base 100: cada serie = 100 en su primer dato del período
  if (b100) lista.forEach(o => {
    const r0 = rows.find(r => ok(r[o.key]) && r[o.key] !== 0);
    o.base = r0 ? etiqueta(r0) : "–";
    const f = r0 ? 100 / r0[o.key] : null;
    rows.forEach(r => { r[o.key] = f && ok(r[o.key]) ? r[o.key] * f : null; });
  });
  const puedeLog = rows.every(r => lista.every(o => !ok(r[o.key]) || r[o.key] > 0));

  // opciones
  const ops = document.getElementById("h_opciones"); ops.innerHTML = "";
  const grupo = (lbl, id) => { const l = document.createElement("label"); l.textContent = lbl; const d = document.createElement("div"); d.className = "seg"; d.id = id; ops.append(l, d); return d; };
  botones(grupo("Ver por", "h_freq"), [["M", "Mes"], ["T", "Trimestre"], ["A", "Año"]], stH, "freq", false, renderHistorico);
  if (puedeLog) botones(grupo("Escala", "h_esc"), [["lin", "Lineal"], ["log", "Logarítmica"]], stH, "escala", false, renderHistorico);
  if (dos) botones(grupo("Eje derecho", "h_eje"), [["propia", "Escala propia (adaptada a la serie)"], ["misma", "Misma escala que el izquierdo"]], stH, "eje", false, renderHistorico);
  if (!b100) botones(grupo("Líneas", "h_refs"), REFS_H.map(r => [r.k, r.btn]), stH, "refs", true, renderHistorico, true);
  if (!b100) botones(grupo("Marcadores", "h_mk"), [["mk_ult", "Último"], ["mk_max", "Máximo"], ["mk_min", "Mínimo"]], stH, "refs", true, renderHistorico, true);
  if (hayBanda) botones(grupo("Rango", "h_banda"), [["no", "Solo promedio"], ["si", "Con mín/máx"]], stH, "banda", false, renderHistorico);

  const st = lista.map(o => estadisticasRows(rows, o.key));
  const fmtDe = o => b100 ? (v => nf1.format(v)) : (v => fmtC(o.c, v));
  const porFreq = {M: "", T: " Valores trimestrales" , A: " Valores anuales"}[stH.freq];
  const sumaTxt = stH.freq !== "M" && lista.some(o => o.flujo || o.ultimo) ? " (los flujos se suman y los % del PIB toman el último mes del período; períodos incompletos de flujos quedan vacíos; el resto es promedio)." : stH.freq !== "M" ? " (promedio de los meses)." : "";
  document.getElementById("h_t").textContent = b100 ? `Comparación en base 100: ${lista.map(o => o.c.corto).join(", ")}` : dos ? `${lista[0].c.corto} y ${lista[1].c.corto}` : lista[0].c.nombre;
  document.getElementById("h_n").textContent = (b100 ? "Cada serie vale 100 en su primer dato del período: la línea muestra cuánto subió o bajó desde ahí."
    : lista.map((o, k) => `${dos ? (k ? "Derecha: " : "Izquierda: ") : ""}${o.c.unidad}`).join(" · ") + ".") + porFreq + sumaTxt +
    (bd ? " La sombra va del mínimo al máximo." : "") + ` Fuente: ${[...new Set(lista.map(o => o.c.serie.fuente))].join("; ")}.`;
  document.getElementById("h_leg").innerHTML = lista.length > 1 ? lista.map(o => `<span style="--c:var(${o.color})">${esc(o.c.corto)}${o.axis ? " (eje der.)" : ""}</span>`).join("") : "";

  // Referencias: en el gráfico solo la letra; en la leyenda de arriba, letra + tipo de línea + valor
  const refs = [], misma = dos && stH.eje === "misma";
  const refLeg = [];
  if (!b100) lista.forEach((o, k) => {
    const s = st[k]; if (!s) return;
    const items = REFS_H.filter(r => stH.refs.has(r.k)).map(r => {
      const [v, cuando] = r.val(s);
      refs.push({v, axis: misma ? 0 : o.axis, color: o.color, letra: r.letra, dash: r.dash});
      return `<span class="ri"><b style="color:var(${o.color})">${r.letra}</b><svg width="24" height="6" aria-hidden="true"><line x1="0" x2="24" y1="3" y2="3" stroke="var(${o.color})" stroke-width="1.5" stroke-dasharray="${r.dash}"/></svg>${r.nom} <b>${fmtC(o.c, v)}</b>${cuando ? ` <small>${esc(cuando)}</small>` : ""}</span>`;
    });
    if (items.length) refLeg.push(`<div>${dos ? `<span class="punto" style="--c:var(${o.color})"></span>` : ""}${items.join("")}</div>`);
  });
  document.getElementById("h_refleg").innerHTML = refLeg.join("");
  const tiposMk = new Set(["ult", "max", "min"].filter(k => stH.refs.has("mk_" + k)));
  const marcas = b100 || !tiposMk.size ? [] : lista.map(o => ({key: o.key, axis: misma ? 0 : o.axis, color: o.color, fmt: fmtDe(o), tipos: tiposMk}));
  lineChart(document.getElementById("h_ch"), document.getElementById("h_tip"), rows,
    lista.map(o => ({key: o.key, name: o.c.corto, short: o.c.corto.length > 18 ? o.c.corto.slice(0, 17) + "…" : o.c.corto, color: o.color, axis: o.axis, band: bd && !!o.c.lo, fmt: fmtDe(o)})),
    {log: stH.escala === "log" && puedeLog, log2: stH.escala === "log" && puedeLog, refs, marcas, mismaEscala: misma, refLine: b100 ? 100 : null, endLabels: b100 && lista.length > 1,
     fmtAxis: b100 ? (v => nf0.format(v)) : ejeFmt(lista[0].c), fmtAxis2: dos ? ejeFmt(lista[1].c) : null, fmtTip: fmtDe(lista[0]), tipTitle: etiqueta});

  // Tarjetas (valor) o tabla resumen (base 100)
  const tiles = document.getElementById("h_tiles");
  if (b100) {
    const filasR = lista.map((o, k) => ({o, s: st[k]})).filter(x => x.s).sort((a, b) => b.s.ult[0] - a.s.ult[0]);
    tiles.innerHTML = `<div class="card" style="grid-column:1/-1;margin:0"><h2>Resumen (de mayor a menor)</h2><div class="tablewrap"><table><thead><tr><th>Variable</th><th>Base 100 en</th><th>Último</th><th>Variación</th><th>Máximo</th><th>Mínimo</th><th>Promedio</th></tr></thead><tbody>` +
      filasR.map(({o, s}) => {
        const d = s.ult[0] - 100, sc = o.c.dir ? Math.sign(d) * o.c.dir * Math.min(1, Math.abs(d) / 50 + 0.25) : 0;
        return `<tr><td class="nombre"><span class="punto" style="--c:var(${o.color})"></span> ${esc(o.c.corto)}<small>${esc(o.c.unidad)}</small></td><td>${esc(o.base)}</td><td>${nf1.format(s.ult[0])}<small>${esc(s.ult[1])}</small></td>` +
          `<td${tinte(sc)}>${d > 0 ? "+" : ""}${nf1.format(d)} %</td><td>${nf1.format(s.max[0])}<small>${esc(s.max[1])}</small></td><td>${nf1.format(s.min[0])}<small>${esc(s.min[1])}</small></td><td>${nf1.format(s.prom)}</td></tr>`;
      }).join("") + `</tbody></table></div></div>`;
  } else {
    const tarjeta = (titulo, f) => `<div class="tile"><div class="k">${titulo}</div><div class="mitades${dos ? " dos" : ""}">${lista.map((o, k) => {
      const s = st[k]; if (!s) return `<div class="mitad"><div class="v">–</div></div>`;
      const [v, d] = f(s, o.c);
      return `<div class="mitad">${dos ? `<span class="punto" style="--c:var(${o.color})"></span> ` : ""}<span class="v">${v}</span><div class="d">${d}</div></div>`;
    }).join("")}</div></div>`;
    const vsUlt = (c, s, x) => `último vs. este: <b>${variacionTxt(c, x, s.ult[0])}</b>`;
    tiles.innerHTML = [
      tarjeta("Último dato", (s, c) => [fmtC(c, s.ult[0]), `${esc(s.ult[1])} · vs. ${esc(s.pri[1])}: <b>${variacionTxt(c, s.pri[0], s.ult[0])}</b>`]),
      tarjeta("Promedio", (s, c) => [fmtC(c, s.prom), vsUlt(c, s, s.prom)]),
      tarjeta("Mediana", (s, c) => [fmtC(c, s.med), vsUlt(c, s, s.med)]),
      tarjeta("Máximo", (s, c) => [fmtC(c, s.max[0]), `${esc(s.max[1])} · ${vsUlt(c, s, s.max[0])}`]),
      tarjeta("Mínimo", (s, c) => [fmtC(c, s.min[0]), `${esc(s.min[1])} · ${vsUlt(c, s, s.min[0])}`]),
    ].join("");
  }

  document.getElementById("h_tabla").innerHTML = `<thead><tr><th>Período</th>${lista.map(o => `<th>${esc(o.c.corto)}<small>${esc(b100 ? "base 100" : o.c.unidad)}</small></th>`).join("")}</tr></thead><tbody>` +
    rows.slice().reverse().map(r => `<tr><td>${esc(etiqueta(r))}</td>${lista.map(o => `<td>${ok(r[o.key]) ? fmtDe(o)(r[o.key]) : "–"}</td>`).join("")}</tr>`).join("") + "</tbody>";
  renderFijos();
}
pintarVars();
renders.historico = renderHistorico;

// --- Gráficos fijos de dólar y soja
const stM = {br: new Set(["blue", "mep", "ccl"]), fx: new Set(["oficial", "blue", "ccl"]), fxmed: "real", banda: "no", sojamed: "corr", sojafx: "oficial", ratio: new Set(["oficial", "ccl"])};
const filas = (cols, bandas = {}) => F.map((f, i) => {
  const r = {fecha: f};
  for (const k in cols) r[k] = cols[k][i];
  for (const k in bandas) if (bandas[k]) { r[k + "_lo"] = bandas[k][0][i]; r[k + "_hi"] = bandas[k][1][i]; }
  return r;
}).filter(r => enFiltro(r.fecha));
const filasF = (cols, bandas) => agrupar(filas(cols, bandas), stH.freq);
const recortar = (rows, keys) => {
  const a = rows.findIndex(r => keys.some(k => ok(r[k])));
  let b = rows.length - 1; while (b >= 0 && keys.every(k => !ok(rows[b][k]))) b--;
  return a < 0 ? [] : rows.slice(a, b + 1);
};
function renderFijos() {
  const bd = stM.banda === "si";
  const sel = Object.keys(FX).filter(k => stM.fx.has(k));
  const medNom = Object.fromEntries(MED.fx)[stM.fxmed];
  document.getElementById("n_fx").textContent = `${medNom}. Promedio mensual.` + (stM.fxmed === "corr" ? " Escala logarítmica: la misma distancia vertical es la misma variación %." : "");
  document.getElementById("leg_fx").innerHTML = sel.map(k => `<span style="--c:var(${FX_COLOR[k]})">${FX_NOM[k]}</span>`).join("");
  const sfx = SER.fx_oficial;
  let rows = recortar(filasF(Object.fromEntries(sel.map(k => [k, transformar(SER["fx_" + k], SER["fx_" + k].vals, stM.fxmed)])),
    bd ? Object.fromEntries(sel.map(k => [k, [transformar(sfx, SER["fx_" + k].mn, stM.fxmed), transformar(sfx, SER["fx_" + k].mx, stM.fxmed)]])) : {}), sel);
  lineChart(document.getElementById("ch_fx"), document.getElementById("tip_fx"), rows,
    sel.map(k => ({key: k, name: "Dólar " + FX_NOM[k], short: FX_NOM[k], color: FX_COLOR[k], band: bd})),
    {log: stM.fxmed === "corr", endLabels: true, tipTitle: etiqueta, fmtAxis: v => "$ " + fmtNum(v), fmtTip: v => "$ " + fmtNum(v)});

  const br = ["blue", "mep", "ccl"].filter(k => stM.br.has(k));
  document.getElementById("leg_br").innerHTML = br.map(k => `<span style="--c:var(${FX_COLOR[k]})">${FX_NOM[k]}</span>`).join("");
  rows = recortar(filasF(Object.fromEntries(br.map(k => [k, SER["brecha_" + k].vals]))), br);
  lineChart(document.getElementById("ch_br"), document.getElementById("tip_br"), rows, br.map(k => ({key: k, name: FX_NOM[k], color: FX_COLOR[k]})),
    {zero: true, refLine: 0, endLabels: true, tipTitle: etiqueta, fmtAxis: v => nf0.format(v) + " %", fmtTip: v => nf1.format(v) + " %"});

  const real = stM.sojamed === "usdr", fx = stM.sojafx, medRos = (real ? "usdr_" : "usd_") + fx;
  const chi = SER.soja_chi, ros = SER.soja_ros;
  document.getElementById("n_soja").textContent = `US$ por tonelada${real ? ` de ${refUS} (ajustado por inflación de EEUU)` : " corrientes"}. Rosario pasado al dólar ${FX_NOM[fx]} de cada mes.`;
  document.getElementById("leg_soja_ros").textContent = `Rosario (pizarra, al ${FX_NOM[fx]})`;
  rows = recortar(filasF({chi: transformar(chi, chi.vals, real ? "usdr" : "corr"), ros: transformar(ros, ros.vals, medRos)},
    bd ? {chi: [transformar(chi, chi.mn, real ? "usdr" : "corr"), transformar(chi, chi.mx, real ? "usdr" : "corr")], ros: [transformar(ros, ros.mn, medRos), transformar(ros, ros.mx, medRos)]} : {}), ["chi", "ros"]);
  lineChart(document.getElementById("ch_soja"), document.getElementById("tip_soja"), rows,
    [{key: "chi", name: "Chicago", color: "--series-1", band: bd}, {key: "ros", name: "Rosario", color: "--series-2", band: bd}],
    {zero: true, endLabels: true, tipTitle: etiqueta, fmtAxis: v => "US$ " + nf0.format(v), fmtTip: v => "US$ " + nf0.format(v)});

  const rk = Object.keys(FX).filter(k => stM.ratio.has(k));
  document.getElementById("leg_ratio").innerHTML = rk.map(k => `<span style="--c:var(${FX_COLOR[k]})">al ${FX_NOM[k]}</span>`).join("");
  rows = recortar(filasF(Object.fromEntries(rk.map(k => [k, SER["soja_ratio_" + k].vals]))), rk);
  lineChart(document.getElementById("ch_ratio"), document.getElementById("tip_ratio"), rows, rk.map(k => ({key: k, name: "Al " + FX_NOM[k], short: FX_NOM[k], color: FX_COLOR[k]})),
    {refLine: 100, endLabels: true, tipTitle: etiqueta, fmtAxis: v => nf0.format(v) + " %", fmtTip: v => nf1.format(v) + " %"});
}
botones("m_br", [["blue", "Blue"], ["mep", "MEP"], ["ccl", "CCL"]], stM, "br", true, renderFijos);
botones("m_fx", Object.keys(FX).map(k => [k, FX_NOM[k]]), stM, "fx", true, renderFijos);
botones("m_fxmed", [["corr", "Corrientes"], ["real", "Pesos de hoy"], ["realbi", "Pesos de hoy neto infl. EEUU"]], stM, "fxmed", false, renderFijos);
botones("m_fxbanda", [["no", "Promedio"], ["si", "Con mín/máx"]], stM, "banda", false, renderFijos);
botones("m_sojamed", [["corr", "US$ corrientes"], ["usdr", "US$ reales"]], stM, "sojamed", false, renderFijos);
botones("m_sojafx", Object.keys(FX).map(k => [k, FX_NOM[k]]), stM, "sojafx", false, renderFijos);
botones("m_ratiofx", Object.keys(FX).map(k => [k, FX_NOM[k]]), stM, "ratio", true, renderFijos);

// =====================================================================
// PRESIDENTES
// =====================================================================
const PRES = [
  {id: "menem1", n: "Menem 1", ini: "1989-07", color: "--neutral", dash: true},
  {id: "menem2", n: "Menem 2", ini: "1995-07", color: "--neutral", dash: true},
  {id: "delarua", n: "De la Rúa", ini: "1999-12", color: "--series-8"},
  {id: "duhalde", n: "Duhalde", ini: "2002-01", color: "--series-7"},
  {id: "nk", n: "Néstor Kirchner", ini: "2003-05", color: "--series-6"},
  {id: "cfk1", n: "CFK 1", ini: "2007-12", color: "--series-5"},
  {id: "cfk2", n: "CFK 2", ini: "2011-12", color: "--series-4"},
  {id: "macri", n: "Macri", ini: "2015-12", color: "--series-3"},
  {id: "af", n: "Alberto Fernández", ini: "2019-12", color: "--series-2"},
  {id: "milei", n: "Milei", ini: "2023-12", color: "--series-1"},
];
PRES.forEach((p, k) => {
  p.i0 = Math.max(0, idxDe(p.ini));
  const sig = PRES[k + 1];
  p.i1 = sig ? idxDe(sig.ini) - 1 : N - 1;
});

function statsMandato(arr, p) {
  const res = {n: 0};
  const vals = [];
  for (let i = p.i0; i <= p.i1; i++) if (ok(arr[i])) vals.push([arr[i], i]);
  if (!vals.length) return res;
  const b = baseIdx(p);
  res.n = vals.length; res.total = p.i1 - p.i0 + 1;
  if (b >= 0 && ok(arr[b])) { res.ini = arr[b]; res.iniI = b; } else { res.ini = vals[0][0]; res.iniI = vals[0][1]; }
  const u = vals[vals.length - 1]; res.fin = u[0]; res.finI = u[1];
  const mn = vals.reduce((a, c) => c[0] < a[0] ? c : a), mx = vals.reduce((a, c) => c[0] > a[0] ? c : a);
  res.min = mn[0]; res.minI = mn[1]; res.max = mx[0]; res.maxI = mx[1];
  res.prom = vals.reduce((a, c) => a + c[0], 0) / vals.length;
  const ord = vals.map(c => c[0]).sort((a, b) => a - b), h = Math.floor(ord.length / 2);
  res.med = ord.length % 2 ? ord[h] : (ord[h - 1] + ord[h]) / 2;
  return res;
}
const tinte = sc => (!ok(sc) || sc === 0) ? "" :
  ` style="background:color-mix(in srgb, var(${sc > 0 ? "--pos" : "--neg"}) ${Math.round(8 + Math.min(1, Math.abs(sc)) * 30)}%, transparent)"`;
const mesCorto = i => i >= 0 ? `<small>${fmtMes(F[i])}</small>` : "";
const varNum = (c, st) => (!ok(st.ini) || !ok(st.fin)) ? null : c.pct ? st.fin - st.ini : st.ini === 0 ? null : (st.fin / st.ini - 1) * 100;
const COLS = [["ini", "Inicio"], ["fin", "Cierre"], ["var", "Variación"], ["min", "Mínimo"], ["max", "Máximo"], ["prom", "Promedio"], ["med", "Mediana"], ["n", "Meses"]];
const stP = {base: "prev", n: 1, pres: new Set(PRES.map(p => p.id)), cols: new Set(COLS.map(c => c[0])), ordB: {k: null, d: -1}, ordA: {k: null, d: -1}};
const baseIdx = p => stP.base === "prev" ? idxDe(p.ini) - 1 : stP.base === "mas" ? Math.min(idxDe(p.ini) + stP.n, p.i1) : idxDe(p.ini);
const baseTxt = () => stP.base === "prev" ? "último mes del antecesor (T-1)" : stP.base === "mas" ? `${stP.n} ${stP.n === 1 ? "mes" : "meses"} después de asumir (T+${stP.n})` : "mes de asunción (T)";
const colsSel = () => COLS.filter(c => stP.cols.has(c[0]));
const valorCol = (c, st, k) => !st.n ? null : k === "var" ? varNum(c, st) : st[k];
function cabecera(ord) {
  return colsSel().map(([k, t]) => `<th data-orden="${k}" class="${ord.k === k ? (ord.d > 0 ? "ord-asc" : "ord-desc") : ""}" title="Ordenar">${t}</th>`).join("");
}
function clicOrden(tabla, ord, render) {
  tabla.querySelectorAll("th[data-orden]").forEach(th => th.onclick = () => {
    const k = th.dataset.orden;
    if (ord.k !== k) { ord.k = k; ord.d = -1; } else if (ord.d === -1) ord.d = 1; else ord.k = null;
    render();
  });
}
function ordenar(items, ord, valor) {
  if (!ord.k) return items;
  return items.slice().sort((a, b) => {
    const va = valor(a), vb = valor(b);
    if (!ok(va) && !ok(vb)) return 0; if (!ok(va)) return 1; if (!ok(vb)) return -1;
    return (va - vb) * ord.d;
  });
}
function filaStats(c, st, sc) {
  const cols = colsSel();
  if (!st.n) return `<td colspan="${cols.length}" style="text-align:center;color:var(--text-muted)">sin datos en este período</td>`;
  const d = varNum(c, st);
  if (!sc) sc = {var: ok(d) && c.dir ? Math.sign(d) * c.dir * Math.min(1, Math.abs(d) / (c.pct ? 10 : 50) + 0.25) : 0};
  const cel = {
    ini: () => `<td>${fmtC(c, st.ini)}${mesCorto(st.iniI)}</td>`,
    fin: () => `<td${tinte(sc.fin)}>${fmtC(c, st.fin)}${mesCorto(st.finI)}</td>`,
    var: () => `<td${tinte(sc.var)}>${variacionTxt(c, st.ini, st.fin)}</td>`,
    min: () => `<td${tinte(sc.min)}>${fmtC(c, st.min)}${mesCorto(st.minI)}</td>`,
    max: () => `<td${tinte(sc.max)}>${fmtC(c, st.max)}${mesCorto(st.maxI)}</td>`,
    prom: () => `<td${tinte(sc.prom)}>${fmtC(c, st.prom)}</td>`,
    med: () => `<td${tinte(sc.med)}>${fmtC(c, st.med)}</td>`,
    n: () => `<td>${st.n}${st.n < st.total ? ` <small>de ${st.total}</small>` : ""}</td>`,
  };
  return cols.map(([k]) => cel[k]()).join("");
}
function rankScores(valores, dir) {
  const idx = valores.map((x, i) => [x, i]).filter(c => ok(c[0]));
  const out = valores.map(() => 0);
  if (!dir || idx.length < 2) return out;
  idx.sort((a, b) => (a[0] - b[0]) * dir);
  idx.forEach(([, i], k) => { out[i] = -1 + 2 * k / (idx.length - 1); });
  return out;
}
// Comparar niveles entre presidentes solo tiene sentido en medidas reales, índices o ratios
const nivelComparable = e => !!e.rel || ES_VAR(e.med) || ["none", "tasa"].includes(SER[e.id].tipo) || e.esc === "pib" || ["real", "realbi", "usdr"].includes(e.med) || String(e.med).startsWith("usdr_") || String(e.med).startsWith("real_");

const stPB = {e: {id: "sipa_med", med: "real", rel: null, modo: "compra", esc: ""}};
if (!SER[stPB.e.id]) stPB.e.id = "sipa_prom";
const pintarPB = filaVariable("pb_var", () => stPB.e, e => { stPB.e = e || stPB.e; pintarPB(); renderPresB(); }, {});
function renderPresB() {
  const e = stPB.e, c = calc(e);
  const sts = PRES.map(p => statsMandato(c.v, p));
  const niv = nivelComparable(e), dir = c.dir || 0;
  const col = f => rankScores(sts.map(f), dir);
  const sc = {var: col(st => varNum(c, st)), fin: niv ? col(st => st.fin) : null, min: niv ? col(st => st.min) : null,
    max: niv ? col(st => st.max) : null, prom: niv ? col(st => st.prom) : null, med: niv ? col(st => st.med) : null};
  const t = document.getElementById("pb_tabla");
  let filasP = PRES.map((p, k) => ({p, k})).filter(x => stP.pres.has(x.p.id));
  filasP = ordenar(filasP, stP.ordB, x => valorCol(c, sts[x.k], stP.ordB.k));
  let html = `<thead><tr><th>Presidente</th><th style="text-align:left">Mandato</th>${cabecera(stP.ordB)}</tr></thead><tbody>`;
  filasP.forEach(({p, k}) => {
    const s = Object.fromEntries(Object.entries(sc).map(([kk, a]) => [kk, a ? a[k] : 0]));
    html += `<tr><td>${p.n}</td><td class="unidad">${fmtMes(p.ini)} a ${fmtMes(F[p.i1])}</td>${filaStats(c, sts[k], s)}</tr>`;
  });
  const nota = !dir ? "Sin colores: para esta variable subir o bajar no es ni bueno ni malo en sí mismo."
    : `Colores del mejor (verde) al peor (rojo) entre todos los presidentes${niv ? "" : "; en montos corrientes solo se colorea la variación (los niveles no se pueden comparar con inflación de por medio)"}.`;
  t.innerHTML = html + `</tbody><caption style="caption-side:bottom;text-align:left;font-size:12px;color:var(--text-muted);padding-top:8px">Unidad: ${esc(c.unidad)}. ${nota}</caption>`;
  clicOrden(t, stP.ordB, renderPresB);
}

const paPres = document.getElementById("pa_pres"), paMed = document.getElementById("pa_med"), paBuscar = document.getElementById("pa_buscar");
opcionesSelect(paPres, PRES.map(p => [p.id, p.n]).reverse(), "milei");
opcionesSelect(paMed, MED.ars, "real");
const grupoDe = s => s.cat[1] && s.cat[0] !== "Salarios" ? `${s.cat[0]} › ${s.cat[1]}` : s.cat[0];
const GRUPOS = [];
D.series.forEach(s => { const g = grupoDe(s); if (!GRUPOS.includes(g)) GRUPOS.push(g); });
GRUPOS.sort((a, b) => ORDEN_RAIZ.indexOf(a.split(" › ")[0]) - ORDEN_RAIZ.indexOf(b.split(" › ")[0]) || (a.includes("›") ? 1 : 0) - (b.includes("›") ? 1 : 0));
const abiertos = new Set(["Salarios", "Dólar y tipo de cambio", "Precios › Indicadores de inflación", "Actividad", "Empleo, pobreza e ingresos", "Mercados", "Fiscal", "Dinero y bancos (BCRA)"]);
function medidaPara(s, med) {
  if (s.tipo === "none" || s.tipo === "tasa") return "asis";
  if (s.tipo === "idx") return s.dir === 1 && med === "real" ? "real" : "corr";
  if (s.tipo === "ars") return med;
  if (s.tipo === "fx") return med.startsWith("usdr") ? "real" : med.startsWith("usd") ? "corr" : med;
  if (s.tipo === "usd") return med === "real" ? "real" : med === "corr" ? "arscorr" : med.startsWith("usdr") ? "usdr" : "corr";
  return "asis";
}
function renderPresA() {
  const p = PRES.find(x => x.id === paPres.value);
  const q = norm(paBuscar.value.trim()), toks = q ? q.split(/\s+/) : [];
  const t = document.getElementById("pa_tabla");
  const nc = colsSel().length + 2;
  let html = `<thead><tr><th>Variable</th><th style="text-align:left">Unidad</th>${cabecera(stP.ordA)}</tr></thead><tbody>`;
  let total = 0;
  GRUPOS.forEach(g => {
    let ss = D.series.filter(s => grupoDe(s) === g);
    if (toks.length) ss = ss.filter(s => { const txt = s._busca || (s._busca = textoBusqueda(s)); return toks.every(k => txt.includes(k)); });
    if (!ss.length) return;
    total += ss.length;
    const ab = toks.length ? true : abiertos.has(g);
    html += `<tr class="grupo${ab ? " abierto" : ""}" data-g="${esc(g)}"><td colspan="${nc}">${esc(g)} <span style="font-weight:400;color:var(--text-muted)">(${ss.length})</span></td></tr>`;
    if (!ab) return;
    let items = ss.map(s => { const c = calc({id: s.id, med: medidaPara(s, paMed.value), rel: null}); return {s, c, st: statsMandato(c.v, p)}; });
    items = ordenar(items, stP.ordA, x => valorCol(x.c, x.st, stP.ordA.k));
    items.forEach(({s, c, st}) => {
      html += `<tr><td class="nombre">${esc(s.n)} ${infoBtn(s.id)}</td><td class="unidad">${esc(c.unidad)}</td>${filaStats(c, st)}</tr>`;
    });
  });
  if (!total) html += `<tr><td colspan="${nc}" style="text-align:center;color:var(--text-muted)">Ninguna variable coincide con "${esc(paBuscar.value)}".</td></tr>`;
  t.innerHTML = html + "</tbody>";
  t.querySelectorAll("tr.grupo").forEach(tr => tr.onclick = () => { if (toks.length) return; const g = tr.dataset.g; abiertos.has(g) ? abiertos.delete(g) : abiertos.add(g); renderPresA(); });
  clicOrden(t, stP.ordA, renderPresA);
}
function renderPres() {
  document.getElementById("p_nota").innerHTML = (stP.base === "prev"
    ? "<b>Inicio</b> = último mes del presidente anterior (T-1), para que la variación incluya todo lo que pasó en el mandato (p.ej. la devaluación de dic-2023 cuenta para Milei)."
    : stP.base === "mas" ? `<b>Inicio</b> = ${baseTxt()}: p.ej. para Milei, ${fmtMes(F[baseIdx(PRES.find(p => p.id === "milei"))])}.`
    : "<b>Inicio</b> = mes de asunción (T; promedio del mes, incluye días del antecesor).") +
    " Mínimo, máximo, promedio y mediana usan solo los meses del mandato. Verde y rojo indican si el cambio fue bueno o malo (un salario que sube es verde; precios, dólar o riesgo país que suben son rojos).";
  renderPresB(); renderPresA();
}
const OPC_BASE = [["prev", "Último mes del antecesor (T-1)"], ["asume", "Mes de asunción (T)"], ["mas", "T + n meses"]];
const pintarBases = [];
const alCambiarBase = () => { cacheDes.clear(); pintarBases.forEach(f => f()); if (renders[tabActual]) renders[tabActual](); };
function selectorBase(id) {
  const el = document.getElementById(id);
  const pb = botones(el, OPC_BASE, stP, "base", false, alCambiarBase);
  const inp = document.createElement("input"); inp.type = "number"; inp.min = 1; inp.max = 47; inp.value = stP.n; inp.className = "num-n"; inp.title = "n: meses después de asumir";
  el.after(inp);
  inp.oninput = () => { const v = Math.max(1, Math.min(47, Math.round(+inp.value || 1))); stP.n = v; stP.base = "mas"; alCambiarBase(); };
  pintarBases.push(() => { pb(); inp.value = stP.n; inp.style.display = stP.base === "mas" ? "" : "none"; });
  inp.style.display = stP.base === "mas" ? "" : "none";
}
selectorBase("p_base");
botones("p_pres", PRES.map(p => [p.id, p.n]), stP, "pres", true, renderPres);
botones("p_cols", COLS, stP, "cols", true, renderPres);
popover("p_mas_btn", "p_mas");
paPres.onchange = renderPresA; paMed.onchange = renderPresA;
document.getElementById("pa_abrir").onclick = () => { GRUPOS.forEach(g => abiertos.add(g)); renderPresA(); };
document.getElementById("pa_cerrar").onclick = () => { abiertos.clear(); renderPresA(); };
let paT = null; paBuscar.oninput = () => { clearTimeout(paT); paT = setTimeout(renderPresA, 150); };
renders.presidentes = renderPres;

// =====================================================================
// MESES DE MANDATO
// =====================================================================
const PRES_T0 = PRES.filter(p => idxDe(p.ini) > 0);
const stMM = {e: {id: "fx_oficial", med: "corr", rel: null, modo: "compra"}, modo: "teorico", pres: new Set(["nk", "cfk1", "cfk2", "macri", "af", "milei"]),
  banda: "no", desde: 0, hasta: null};
const pintarMM = filaVariable("mm_var", () => stMM.e, e => { stMM.e = e || stMM.e; pintarMM(); renderMandato(); }, {});
const mmModo = document.getElementById("mm_modo"), mmAnc = document.getElementById("mm_anc");
const mmDesde = document.getElementById("mm_desde"), mmHasta = document.getElementById("mm_hasta");
opcionesSelect(mmModo, [["teorico", "Precio teórico"], ["var", "Variación % desde el mes 0"], ["indice", "Índice (mes 0 = 100)"], ["valor", "Valor del período"]], "teorico");
function renderMandato() {
  stMM.modo = mmModo.value;
  const c = calc(stMM.e), arr = c.v;
  const bnd = stMM.banda === "si" && c.lo ? [c.lo, c.hi] : null;
  const pres = PRES_T0.filter(p => stMM.pres.has(p.id));
  const teo = stMM.modo === "teorico";
  document.getElementById("mm_anc_wrap").style.display = teo ? "contents" : "none";
  const li = lastIdx(arr);
  opcionesSelect(mmAnc, [["ultimo", `Último dato (${fmtMes(F[li])})`], ...PRES_T0.slice().reverse().map(p => [p.id, `Mes 0 de ${p.n}`])], mmAnc.value || "milei");
  let ancla = null, ancTxt = "";
  if (mmAnc.value === "ultimo") { ancla = arr[li]; ancTxt = `el último dato (${fmtMes(F[li])})`; }
  else { const p = PRES.find(x => x.id === mmAnc.value), b = baseIdx(p); ancla = b >= 0 ? arr[b] : null; ancTxt = `el mes 0 de ${p.n} (${b >= 0 ? fmtMes(F[b]) : "–"})`; }
  const conv = (xv, x0) => {
    if (!ok(x0) || !ok(xv) || x0 === 0) return null;
    if (c.pct && stMM.modo !== "valor") return xv - x0 + (teo && ok(ancla) ? ancla : 0);
    if (stMM.modo === "indice") return xv / x0 * 100;
    if (stMM.modo === "var") return (xv / x0 - 1) * 100;
    if (teo) return ok(ancla) ? ancla * xv / x0 : null;
    return xv;
  };
  const maxMes = Math.max(1, ...pres.map(p => p.i1 - baseIdx(p)));
  const todas = Array.from({length: maxMes + 1}, (_, t) => ({t}));
  pres.forEach(p => {
    const b = baseIdx(p), x0 = arr[b];
    for (let t = 0; t <= p.i1 - b; t++) {
      todas[t][p.id] = conv(arr[b + t], x0);
      if (bnd) { todas[t][p.id + "_lo"] = conv(bnd[0][b + t], x0); todas[t][p.id + "_hi"] = conv(bnd[1][b + t], x0); }
      todas[t]["_f_" + p.id] = F[b + t];
    }
  });
  // Rango de meses (desde / hasta)
  mmDesde.max = maxMes - 1; mmHasta.max = maxMes;
  let h = stMM.hasta == null || stMM.hasta > maxMes ? maxMes : stMM.hasta;
  let d = Math.min(stMM.desde, h - 1);
  mmDesde.value = d; mmHasta.value = h;
  document.getElementById("mm_meses_txt").textContent = `mes ${d} a ${h}${h === maxMes && d === 0 ? " (todo)" : ""}`;
  const rows = todas.slice(d, h + 1);

  let fmtAxis, fmtTip, ref = null;
  if (c.pct && stMM.modo !== "valor") { fmtAxis = v => nf0.format(v); fmtTip = v => nf1.format(v) + " %"; ref = teo ? ancla : 0; }
  else if (stMM.modo === "indice") { fmtAxis = v => nf0.format(v); fmtTip = v => nf1.format(v); ref = 100; }
  else if (stMM.modo === "var") { fmtAxis = v => nf0.format(v) + " %"; fmtTip = v => (v > 0 ? "+" : "") + nf1.format(v) + " %"; ref = 0; }
  else { fmtAxis = ejeFmt(c); fmtTip = v => fmtC(c, v); ref = teo ? ancla : null; }
  const titulos = {teorico: "precio teórico", indice: "índice, mes 0 = 100", var: "variación % desde el mes 0", valor: "valor"};
  document.getElementById("mm_t").textContent = `${c.corto}: ${titulos[stMM.modo]} por mes de mandato`;
  document.getElementById("mm_n").textContent = (teo ? `Partiendo de ${ancTxt}: ${fmtC(c, ancla)} (${c.unidad}), y aplicando ${c.pct ? "los cambios en puntos" : "las variaciones"} de cada mandato. ` : `Unidad: ${stMM.modo === "indice" ? "índice" : stMM.modo === "var" && !c.pct ? "%" : c.unidad}. `) +
    `Mes 0 = ${baseTxt()}.` +
    (c.pct ? " En porcentajes se suman los cambios en puntos, no se multiplican." : "") + (bnd ? " La sombra va del mínimo al máximo diario de cada mes." : "") +
    (stMM.banda === "si" && !c.lo ? " (Esta variable no tiene datos diarios: no hay rango.)" : "");
  document.getElementById("mm_leg").innerHTML = pres.map(p => `<span style="--c:var(${p.color})">${p.n}</span>`).join("");
  const vals = rows.flatMap(r => pres.map(p => r[p.id])).filter(v => ok(v) && v > 0);
  const usarLog = !c.pct && stMM.modo !== "var" && vals.length > 1 && Math.max(...vals) / Math.min(...vals) > 30 && rows.every(r => pres.every(p => !ok(r[p.id]) || r[p.id] > 0));
  const paso = (h - d) > 36 ? 6 : (h - d) > 12 ? 3 : 1;
  lineChart(document.getElementById("mm_ch"), document.getElementById("mm_tip"), rows,
    pres.map(p => ({key: p.id, name: p.n, short: p.n.replace("Néstor ", "").replace("Alberto Fernández", "A. Fernández"), color: p.color, dash: p.dash, band: !!bnd})),
    {xVals: rows.map(r => r.t), endLabels: true, log: usarLog, refLine: ref, fmtAxis, fmtTip,
     xLabel: r => r.t % paso === 0 ? (r.t === 0 ? "Mes 0" : r.t) : "",
     tipTitle: r => `Mes ${r.t}`, tipSub: (r, se) => r["_f_" + se.key] ? ` <small style="color:var(--text-muted)">${fmtMes(r["_f_" + se.key])}</small>` : ""});
  const hitos = [6, 12, 24, 36, 48];
  const cel = (p, t) => { const r = todas[t]; return r && ok(r[p.id]) ? fmtTip(r[p.id]) : "–"; };
  document.getElementById("mm_tn").textContent = `Mismo cálculo que el gráfico (${titulos[stMM.modo]}) en meses clave y al final de cada mandato.`;
  document.getElementById("mm_tabla").innerHTML = `<thead><tr><th>Presidente</th><th>Mes 0</th>${hitos.map(x => `<th>Mes ${x}</th>`).join("")}<th>Final</th></tr></thead><tbody>` +
    pres.map(p => { const fin = p.i1 - baseIdx(p); return `<tr><td>${p.n}</td><td>${cel(p, 0)}</td>${hitos.map(x => `<td>${x <= fin ? cel(p, x) : ""}</td>`).join("")}<td>${cel(p, fin)}<small>mes ${fin}</small></td></tr>`; }).join("") + "</tbody>";
}
mmModo.onchange = renderMandato; mmAnc.onchange = renderMandato;
mmDesde.oninput = () => { stMM.desde = +mmDesde.value; if (stMM.hasta != null && stMM.desde >= stMM.hasta) stMM.hasta = stMM.desde + 1; renderMandato(); };
mmHasta.oninput = () => { stMM.hasta = +mmHasta.value; if (stMM.desde >= stMM.hasta) stMM.desde = stMM.hasta - 1; renderMandato(); };
botones("mm_pres", PRES_T0.map(p => [p.id, p.n]), stMM, "pres", true, renderMandato);
selectorBase("mm_base");
botones("mm_banda", [["no", "Solo promedio"], ["si", "Promedio + mín/máx"]], stMM, "banda", false, renderMandato);
popover("mm_mas_btn", "mm_mas");
renders.mandato = renderMandato;

// =====================================================================
// CURIOSIDADES
// =====================================================================
function abrirEnHistorico(e) {
  stH.modo = "valor"; stH.a = {med: "", rel: null, modo: "compra", esc: "", ...e}; stH.b = null; stH.extra = [];
  if (!e.med) stH.a.med = medDefault(SER[e.id]);
  pintarModoH(); pintarVars(); mostrarTab("historico"); window.scrollTo(0, 0);
}
const X = (id, grupo, nombre, extra = {}) => SER[id] ? {id, grupo, nombre: nombre || SER[id].n, med: extra.med || medDefault(SER[id]), rel: null, modo: "compra", esc: "", ...extra} : null;
const INDIC = [
  X("sipa_med", "Salarios", "Salario SIPA mediana (real)"), X("sipa_prom", "Salarios", "Salario SIPA promedio (real)"), X("ripte", "Salarios", "RIPTE (real)"),
  X("dg_149_1_tl_indiios_octu_0_21", "Salarios", "Índice de salarios INDEC, total (real)", {med: "real"}),
  X("dg_149_1_sor_priado_octu_0_28", "Salarios", "Salarios informales (real)", {med: "real"}),
  X("jub_min_bono", "Salarios", "Jubilación mínima con bono (real)"), X("smvm", "Salarios", "Salario mínimo (real)"),
  X("sipa_med", "Salarios", "Salario SIPA mediana en dólares blue", {med: "usdr_blue"}),
  X("pp_gba_asado", "Poder de compra", "Kg de asado por salario mediano", {rel: "sipa_med", med: "corr"}),
  X("can_cbt_h2", "Poder de compra", "Canastas de pobreza (hogar de 4) por salario mediano", {rel: "sipa_med", med: "corr"}),
  X("fx_blue", "Poder de compra", "Dólares blue por salario mediano", {rel: "sipa_med", med: "corr"}),
  X("inflacion", "Precios y dólar", "Inflación mensual"), X("fx_oficial", "Precios y dólar", "Dólar oficial (en pesos de hoy)", {med: "real"}),
  X("fx_blue", "Precios y dólar", "Dólar blue (en pesos de hoy)", {med: "real"}), X("brecha_blue", "Precios y dólar", "Brecha blue"),
  X("dg_143_3_no_pr_2004_a_31", "Actividad", "Actividad económica (EMAE)"), X("dg_3_2_ogp_d_2004_t_17", "Actividad", "PIB real"),
  X("dg_3_2_ogp_d_2004_t_17", "Actividad", "PIB real por habitante", {esc: "pc"}),
  X("dg_453_1_serie_deseada_0_0_24_58", "Actividad", "Producción industrial"), X("dg_33_2_isac_sin_edad_0_m_23_56", "Actividad", "Construcción (ISAC)"),
  X("dg_4_4_dgi_2004_t_19_pib", "Actividad", "Inversión (% del PIB)"),
  X("dg_42_3_eph_puntuatal_0_m_30", "Empleo y pobreza", "Desocupación"), X("dg_44_2_ectet_0_t_30", "Empleo y pobreza", "Tasa de empleo"),
  X("dg_52_2_asdj_0_0_37", "Empleo y pobreza", "Informalidad"), X("dg_151_1_aariadotac_2012_m_26", "Empleo y pobreza", "Empleo privado registrado"),
  X("pob_tasa_pobreza_personas", "Empleo y pobreza", "Pobreza"), X("pob_tasa_indigencia_personas", "Empleo y pobreza", "Indigencia"),
  X("bcra_1", "Externo y finanzas", "Reservas del BCRA (dólares de hoy)", {med: "usdr"}), X("riesgo", "Externo y finanzas", "Riesgo país"),
  X("dg_saldo_comercial", "Externo y finanzas", "Saldo comercial (% del PIB)", {esc: "pib"}),
  X("dg_160_2_tl_cuennte_0_t_22", "Externo y finanzas", "Cuenta corriente (% del PIB)", {esc: "pib"}),
  X("mk_merv", "Externo y finanzas", "Merval en dólares CCL", {med: "usdr_ccl"}),
  X("bcra_26", "Externo y finanzas", "Crédito al sector privado (% del PIB)", {esc: "pib"}),
  X("dg_379_9_superavit_017_23_94", "Fiscal", "Resultado primario (% del PIB)", {esc: "pib"}),
  X("dg_379_9_resultado_017_18_38", "Fiscal", "Resultado financiero (% del PIB)", {esc: "pib"}),
  X("bcra_cuasifiscal", "Fiscal", "Déficit cuasifiscal (% del PIB)", {esc: "pib"}),
].filter(Boolean);
const GRUPOS_IND = [...new Set(INDIC.map(i => i.grupo))];
const INDIC_IPC = D.series.filter(s => s.cat[1] && s.cat[1].startsWith("IPC INDEC") && s.cat[2] === "Nacional" && s.cat.length === 4 && s.id !== "ipc_nacional")
  .map(s => ({id: s.id, grupo: "Precios del IPC (contra la inflación)", nombre: s.n.replace(/^IPC /, "").replace(" (Nacional)", "") + " (precio real)", med: "real", forzar: true, rel: null, esc: ""}));
const INDIC_PP = D.series.filter(s => s.id.startsWith("pp_gba_"))
  .map(s => ({id: s.id, grupo: "Productos (precio real, GBA)", nombre: s.n.replace(" (GBA)", "") + " (precio real)", med: "real", rel: null, esc: ""}));

// Desempeño de un indicador en un mandato. Dos criterios:
//  - "mejora": cuánto cambió desde el inicio (T-1, T o T+n) hasta el cierre. En porcentajes, la diferencia en puntos
//    (inflación de 25,5 % a 1,9 % = -23,6 p.p.); en el resto, la variación anualizada (para comparar mandatos de distinto largo).
//  - "nivel": el promedio del mandato (solo si el nivel se puede comparar entre épocas: tasas, %, valores reales).
function desempeno(ind, p, c) {
  const st = statsMandato(c.v, p);
  if (!st.n || st.n < Math.min(6, Math.ceil(st.total / 2)) || !ok(st.ini) || !ok(st.fin) || !c.dir) return null;
  let cruza = false; for (let i = p.i0; i <= p.i1; i++) if (ok(c.v[i]) && c.v[i] <= 0) { cruza = true; break; }
  const enPuntos = c.pct || cruza || st.ini <= 0;
  const meses = Math.max(1, st.finI - st.iniI);
  const cambio = enPuntos ? st.fin - st.ini : st.fin / st.ini - 1;
  const mejora = enPuntos ? cambio : Math.pow(st.fin / st.ini, 12 / meses) - 1;
  const nivel = c.pct || nivelComparable(ind) ? st.prom : null;
  return {st, cambio, mejora, nivel, enPuntos, bueno: Math.sign(cambio) * c.dir > 0, malo: Math.sign(cambio) * c.dir < 0};
}
const cacheDes = new Map();
function puestos(des, campo, dir, pre) {
  const orden = des.map((d, i) => [d && ok(d[campo]) ? d[campo] * dir : null, i]).filter(x => ok(x[0])).sort((a, b) => b[0] - a[0]);
  orden.forEach(([, i], pos) => { des[i][pre + "puesto"] = pos + 1; des[i][pre + "de"] = orden.length; des[i][pre + "pct"] = orden.length > 1 ? 100 * (1 - pos / (orden.length - 1)) : 50; });
}
function tablaDesempeno(ind) {
  const k = JSON.stringify([ind.id, ind.med, ind.rel, ind.esc, ind.forzar, stP.base, stP.n]);
  if (cacheDes.has(k)) return cacheDes.get(k);
  const c = calc(ind);
  const des = PRES.map(p => desempeno(ind, p, c));
  puestos(des, "mejora", c.dir, "m_"); puestos(des, "nivel", c.dir, "n_");
  // criterio "nivel": si el nivel no es comparable, se usa la mejora
  des.forEach(d => { if (!d) return; const m = [d.m_puesto, d.m_de, d.m_pct]; d.puesto = {mejora: m, nivel: ok(d.n_pct) ? [d.n_puesto, d.n_de, d.n_pct] : m}; });
  const r = {c, des};
  cacheDes.set(k, r);
  return r;
}
const stC = {pres: "milei", lado: "mejor", set: "principales", crit: "mejora", grupos: new Set(GRUPOS_IND)};
const CRIT_TXT = {mejora: "cuánto mejoró o empeoró desde el inicio hasta el cierre (en porcentajes, la diferencia en puntos; en el resto, la variación anualizada)",
  nivel: "el nivel promedio del mandato (en montos en pesos corrientes, donde el nivel no se puede comparar entre épocas, se usa la mejora)"};
function renderLado() {
  const p = PRES.find(x => x.id === stC.pres);
  const base = INDIC.concat(stC.set === "todo" ? INDIC_IPC.concat(INDIC_PP) : []);
  let filas = base.map(ind => { const {c, des} = tablaDesempeno(ind); const d = des[PRES.indexOf(p)]; return d ? {ind, c, d, r: d.puesto[stC.crit]} : null; }).filter(Boolean);
  filas = filas.filter(f => stC.lado === "mejor" ? f.d.bueno : f.d.malo);
  filas.sort((a, b) => stC.lado === "mejor" ? (b.r[2] - a.r[2]) : (a.r[2] - b.r[2]));
  document.getElementById("c_nota").innerHTML = `${stC.lado === "mejor" ? "Indicadores que <b>mejoraron</b>" : "Indicadores que <b>empeoraron</b>"} durante ${esc(p.n)} (desde ${fmtMes(F[baseIdx(p)])} hasta el cierre). ` +
    `Ordenados por el puesto frente a los demás presidentes según <b>${CRIT_TXT[stC.crit]}</b>. Se muestran los dos puestos. Tocá una fila para verla en Histórico.`;
  const t = document.getElementById("c_tabla");
  const pu = (x, de, pct) => ok(x) ? `<td${tinte((pct - 50) / 50)}>${x}º de ${de}</td>` : `<td style="color:var(--text-muted)" title="El nivel no se puede comparar entre épocas">–</td>`;
  const sub = d => d.enPuntos ? (d.st.ini > 0 && d.st.fin >= 0 ? `<small>${nf0.format((d.st.fin / d.st.ini - 1) * 100)} % relativo</small>` : "") : `<small>${nf1.format(d.mejora * 100)} % anual</small>`;
  t.innerHTML = `<thead><tr><th>Indicador</th><th>Inicio</th><th>Cierre</th><th>Cambio</th><th>Promedio</th><th>Puesto por mejora</th><th>Puesto por nivel</th></tr></thead><tbody>` +
    (filas.length ? filas.map((f, k) => `<tr class="clic" data-k="${k}"><td class="nombre">${esc(f.ind.nombre)}<small>${esc(f.ind.grupo)} · ${esc(f.c.unidad)}</small></td>` +
      `<td>${fmtC(f.c, f.d.st.ini)}${mesCorto(f.d.st.iniI)}</td><td>${fmtC(f.c, f.d.st.fin)}${mesCorto(f.d.st.finI)}</td>` +
      `<td${tinte(stC.lado === "mejor" ? 0.6 : -0.6)}>${variacionTxt(f.c, f.d.st.ini, f.d.st.fin)}${sub(f.d)}</td>` +
      `<td>${fmtC(f.c, f.d.st.prom)}</td>${pu(f.d.m_puesto, f.d.m_de, f.d.m_pct)}${pu(f.d.n_puesto, f.d.n_de, f.d.n_pct)}</tr>`).join("")
      : `<tr><td colspan="7" style="text-align:center;color:var(--text-muted)">Nada para mostrar.</td></tr>`) + "</tbody>";
  t.querySelectorAll("tr.clic").forEach(tr => tr.onclick = () => abrirEnHistorico(filas[+tr.dataset.k].ind));
}
function renderRanking() {
  const inds = INDIC.filter(i => stC.grupos.has(i.grupo));
  const porPres = PRES.map(() => ({grupos: {}, items: []}));
  inds.forEach(ind => {
    const {des} = tablaDesempeno(ind);
    des.forEach((d, k) => {
      if (!d) return; const [, de, pct] = d.puesto[stC.crit]; if (!ok(de) || de < 3) return;
      (porPres[k].grupos[ind.grupo] = porPres[k].grupos[ind.grupo] || []).push(pct); porPres[k].items.push({n: ind.nombre, pct});
    });
  });
  const filas = PRES.map((p, k) => {
    const g = Object.values(porPres[k].grupos).map(a => a.reduce((x, y) => x + y, 0) / a.length);
    return {p, score: g.length ? g.reduce((x, y) => x + y, 0) / g.length : null, n: porPres[k].items.length, items: porPres[k].items.sort((a, b) => b.pct - a.pct)};
  }).filter(f => ok(f.score)).sort((a, b) => b.score - a.score);
  document.getElementById("c_rk_nota").innerHTML = `Para cada indicador se ordena a los presidentes según <b>${CRIT_TXT[stC.crit]}</b> y se pasa a un puntaje de 0 (el peor) a 100 (el mejor). ` +
    "Se promedia dentro de cada grupo y después entre grupos, para que ningún grupo pese más por tener más series. " +
    "<b>Ojo:</b> muchos datos empiezan en 2003, 2012 o 2016, así que Menem, De la Rúa y Duhalde se evalúan con pocos indicadores; Milei, con un mandato en curso; y el contexto internacional y la herencia de cada uno no entran en el número.";
  const t = document.getElementById("c_rk");
  t.innerHTML = `<thead><tr><th>#</th><th>Presidente</th><th>Puntaje</th><th>Indicadores</th><th style="text-align:left">Mejor en</th><th style="text-align:left">Peor en</th></tr></thead><tbody>` +
    filas.map((f, k) => `<tr><td>${k + 1}</td><td>${f.p.n}</td><td${tinte((f.score - 50) / 40)}>${nf0.format(f.score)}</td><td>${f.n}</td>` +
      `<td class="unidad">${f.items.slice(0, 3).map(i => esc(i.n)).join(" · ")}</td><td class="unidad">${f.items.slice(-3).reverse().map(i => esc(i.n)).join(" · ")}</td></tr>`).join("") + "</tbody>";
}

// ---- Datos curiosos
function sparkline(arr, color) {
  const pts = []; for (let i = Math.max(0, idxDe("2003-01")); i < N; i++) if (ok(arr[i])) pts.push([i, arr[i]]);
  if (pts.length < 2) return "";
  const lo = Math.min(...pts.map(p => p[1])), hi = Math.max(...pts.map(p => p[1])), x0 = pts[0][0], x1 = pts[pts.length - 1][0];
  const d = pts.map(([i, v], k) => `${k ? "L" : "M"}${((i - x0) / ((x1 - x0) || 1) * 240).toFixed(1)},${(34 - (v - lo) / ((hi - lo) || 1) * 32).toFixed(1)}`).join("");
  return `<svg viewBox="0 0 240 36" preserveAspectRatio="none"><path d="${d}" fill="none" stroke="var(${color})" stroke-width="1.5" vector-effect="non-scaling-stroke"/></svg>`;
}
function extremos(arr, desde = 0) {
  let mn = null, mx = null, u = null;
  for (let i = desde; i < N; i++) if (ok(arr[i])) { if (mn == null || arr[i] < arr[mn]) mn = i; if (mx == null || arr[i] > arr[mx]) mx = i; u = i; }
  return {mn, mx, u};
}
const pctTxt = (a, b) => { const d = (a / b - 1) * 100; return `${d > 0 ? "+" : ""}${nf0.format(d)} %`; };
const CURIOS = [
  () => { const e = X("pp_gba_asado", "", "", {rel: "sipa_med", med: "corr"}); if (!e) return null; const c = calc(e), x = extremos(c.v);
    return {e, c, k: "Kilos de asado que paga un salario mediano", v: `${nf0.format(c.v[x.u])} kg`, d: `Récord: ${nf0.format(c.v[x.mx])} kg en ${fmtMes(F[x.mx])}. Mínimo: ${nf0.format(c.v[x.mn])} kg en ${fmtMes(F[x.mn])}.`}; },
  () => { const e = X("fx_blue", "", "", {rel: "sipa_med", med: "corr"}); if (!e) return null; const c = calc(e), x = extremos(c.v);
    return {e, c, k: "Dólares blue que compra un salario mediano", v: `US$ ${nf0.format(c.v[x.u])}`, d: `Máximo: US$ ${nf0.format(c.v[x.mx])} (${fmtMes(F[x.mx])}). Mínimo: US$ ${nf0.format(c.v[x.mn])} (${fmtMes(F[x.mn])}).`}; },
  () => { const e = X("sipa_med", "", "", {med: "real"}); if (!e) return null; const c = calc(e), x = extremos(c.v);
    return {e, c, k: "Salario mediano real: dónde está hoy", v: pctTxt(c.v[x.u], c.v[x.mx]), d: `contra su récord de ${fmtMes(F[x.mx])} (${fmtC(c, c.v[x.mx])} de hoy). Hoy: ${fmtC(c, c.v[x.u])}. Piso: ${fmtMes(F[x.mn])}.`}; },
  () => { const e = X("jub_min_bono", "", "", {med: "real"}); if (!e) return null; const c = calc(e), x = extremos(c.v, idxDe("2003-01"));
    return {e, c, k: "Jubilación mínima con bono, en pesos de hoy", v: fmtC(c, c.v[x.u]), d: `Máximo desde 2003: ${fmtC(c, c.v[x.mx])} en ${fmtMes(F[x.mx])} (hoy ${pctTxt(c.v[x.u], c.v[x.mx])}). Mínimo: ${fmtMes(F[x.mn])}.`}; },
  () => { const e = X("inflacion", ""); if (!e) return null; const c = calc(e), x = extremos(c.v); let def = 0; c.v.forEach(v => { if (ok(v) && v < 0) def++; });
    return {e, c, k: "La inflación mensual más alta", v: `${nf1.format(c.v[x.mx])} %`, d: `en ${fmtMes(F[x.mx])}. Hubo ${def} meses con deflación desde ${fmtMes(F[SER.inflacion.i0])}. Último: ${nf1.format(c.v[x.u])} % (${fmtMes(F[x.u])}).`}; },
  () => { const pp = D.series.filter(s => s.id.startsWith("pp_gba_")).map(s => { const c = calc({id: s.id, med: "real"}); const i0 = c.v.findIndex(ok), u = lastIdx(c.v); return i0 >= 0 ? {s, c, d: c.v[u] / c.v[i0] - 1, i0} : null; }).filter(Boolean).sort((a, b) => b.d - a.d);
    if (!pp.length) return null; const a = pp[0], z = pp[pp.length - 1];
    return {e: {id: a.s.id, med: "real"}, c: a.c, k: "El producto que más subió contra la inflación (GBA)", v: a.s.n.replace(" (GBA)", ""), d: `${pctTxt(1 + a.d, 1)} real desde ${fmtMes(F[a.i0])}. El que más bajó: ${esc(z.s.n.replace(" (GBA)", ""))} (${pctTxt(1 + z.d, 1)}).`}; },
  () => { const r = INDIC_IPC.map(i => { const c = calc(i); const i0 = c.v.findIndex(ok), u = lastIdx(c.v); return i0 >= 0 ? {i, c, d: c.v[u] / c.v[i0] - 1, i0} : null; }).filter(Boolean).sort((a, b) => b.d - a.d);
    if (!r.length) return null; const a = r[0], z = r[r.length - 1];
    return {e: a.i, c: a.c, k: "El rubro del IPC que más se encareció", v: a.i.nombre.replace(" (precio real)", ""), d: `${pctTxt(1 + a.d, 1)} contra la inflación general desde ${fmtMes(F[a.i0])}. El que más se abarató: ${esc(z.i.nombre.replace(" (precio real)", ""))} (${pctTxt(1 + z.d, 1)}).`}; },
  () => { const e = X("brecha_blue", ""); if (!e) return null; const c = calc(e), x = extremos(c.v); let n50 = 0; c.v.forEach(v => { if (ok(v) && v > 50) n50++; });
    return {e, c, k: "Brecha blue récord", v: `${nf0.format(c.v[x.mx])} %`, d: `en ${fmtMes(F[x.mx])}. ${n50} meses con brecha de más de 50 %. Hoy: ${nf1.format(c.v[x.u])} %.`}; },
  () => { const e = X("fx_oficial", "", "", {med: "real"}); if (!e) return null; const c = calc(e), x = extremos(c.v, idxDe("2002-01"));
    return {e, c, k: "Dólar oficial en pesos de hoy", v: fmtC(c, c.v[x.u]), d: `Más caro desde 2002: ${fmtC(c, c.v[x.mx])} (${fmtMes(F[x.mx])}). Más barato: ${fmtC(c, c.v[x.mn])} (${fmtMes(F[x.mn])}).`}; },
  () => { const e = X("bcra_12", "", "", {med: "real_m"}); if (!e) return null; const c = calc(e); let pos = 0, tot = 0; c.v.forEach(v => { if (ok(v)) { tot++; if (v > 0) pos++; } });
    return {e, c, k: "¿El plazo fijo le gana a la inflación?", v: `${nf0.format(pos / tot * 100)} % de los meses`, d: `Desde ${fmtMes(F[c.v.findIndex(ok)])}, ${pos} de ${tot} meses rindió más que la inflación del mes.`}; },
  () => { const e = X("riesgo", ""); if (!e) return null; const c = calc(e), x = extremos(c.v);
    return {e, c, k: "Riesgo país: récords", v: `${nf0.format(c.v[x.u])} pb`, d: `Máximo: ${nf0.format(c.v[x.mx])} pb (${fmtMes(F[x.mx])}). Mínimo: ${nf0.format(c.v[x.mn])} pb (${fmtMes(F[x.mn])}).`}; },
  () => { const e = X("bcra_1", "", "", {med: "usdr"}); if (!e) return null; const c = calc(e), x = extremos(c.v);
    return {e, c, k: "Reservas brutas del BCRA (en dólares de hoy)", v: `US$ ${nf0.format(c.v[x.u] / 1000)} mil M`, d: `Récord: US$ ${nf0.format(c.v[x.mx] / 1000)} mil millones en ${fmtMes(F[x.mx])}. Piso: ${fmtMes(F[x.mn])}.`}; },
  () => { if (!SER.pib_nom || !POB) return null; const v = SER.pib_nom.vals.map((x, i) => ok(x) && ok(FX.oficial[i]) && ok(POB[i]) ? x * 1e6 / FX.oficial[i] / POB[i] : null);
    const x = extremos(v); if (x.u == null) return null; const vb = SER.pib_nom.vals[x.u] * 1e6 / FX.blue[x.u] / POB[x.u];
    return {e: {id: "pib_nom", med: "usd_oficial", esc: "pc"}, c: {v}, k: "PIB por habitante en dólares", v: `US$ ${nf0.format(v[x.u])}`, d: `al oficial (${fmtMes(F[x.u])}); al blue, US$ ${nf0.format(vb)}. Máximo al oficial: US$ ${nf0.format(v[x.mx])} (${fmtMes(F[x.mx])}).`}; },
  () => { const e = X("dg_42_3_eph_puntuatal_0_m_30", ""); if (!e) return null; const c = calc(e), x = extremos(c.v);
    return {e, c, k: "Desocupación: el peor y el mejor momento", v: `${nf1.format(c.v[x.u])} %`, d: `hoy (${fmtMes(F[x.u])}). Máximo: ${nf1.format(c.v[x.mx])} % (${fmtMes(F[x.mx])}). Mínimo: ${nf1.format(c.v[x.mn])} % (${fmtMes(F[x.mn])}).`}; },
  () => { const e = X("pob_tasa_pobreza_personas", ""); if (!e) return null; const c = calc(e), x = extremos(c.v);
    return {e, c, k: "Pobreza (personas)", v: `${nf1.format(c.v[x.u])} %`, d: `último semestre. Máximo de la serie: ${nf1.format(c.v[x.mx])} % (${fmtMes(F[x.mx])}); mínimo: ${nf1.format(c.v[x.mn])} % (${fmtMes(F[x.mn])}).`}; },
  () => { const e = X("dg_379_9_superavit_017_23_94", "", "", {esc: "pib"}); if (!e) return null; const c = calc(e); const anios = {};
    F.forEach((f, i) => { if (f.endsWith("-12") && ok(c.v[i])) anios[f.slice(0, 4)] = c.v[i]; });
    const sup = Object.entries(anios).filter(([, v]) => v > 0).map(([a]) => a);
    return {e, c, k: "Años con superávit primario", v: `${sup.length} de ${Object.keys(anios).length}`, d: `Desde ${Object.keys(anios)[0] || "–"}: ${sup.join(", ") || "ninguno"}. Último (12 meses): ${nf1.format(c.v[lastIdx(c.v)])} % del PIB.`}; },
  () => { const e = X("bcra_78", ""); if (!e) return null; const c = calc(e), u = lastIdx(c.v); let s12 = 0; for (let i = u - 11; i <= u; i++) if (ok(c.v[i])) s12 += c.v[i];
    return {e, c, k: "Dólares que compró el BCRA en 12 meses", v: `US$ ${nf0.format(s12)} M`, d: `hasta ${fmtMes(F[u])}. Negativo = vendió.`}; },
  () => { const e = X("mk_merv", "", "", {med: "usd_ccl"}); if (!e) return null; const c = calc(e), x = extremos(c.v, idxDe("2003-01"));
    return {e, c, k: "Merval en dólares CCL", v: `US$ ${nf0.format(c.v[x.u])}`, d: `Máximo: US$ ${nf0.format(c.v[x.mx])} (${fmtMes(F[x.mx])}). Mínimo: US$ ${nf0.format(c.v[x.mn])} (${fmtMes(F[x.mn])}).`}; },
  () => { const e = X("can_cbt_h2", "", "", {rel: "sipa_med", med: "corr"}); if (!e) return null; const c = calc(e), x = extremos(c.v);
    return {e, c, k: "¿Un salario mediano saca de la pobreza a una familia de 4?", v: `${nf2.format(c.v[x.u])} canastas`, d: `${c.v[x.u] >= 1 ? "Sí" : "No"}: hoy cubre ${nf0.format(c.v[x.u] * 100)} % de la canasta total. Máximo: ${nf2.format(c.v[x.mx])} (${fmtMes(F[x.mx])}).`}; },
  () => { const a = X("dg_151_1_aariadotac_2012_m_26", ""), b = X("dg_151_1_aariadodad_2012_m_30", ""); if (!a || !b) return null; const ca = calc(a), cb = calc(b);
    const ua = lastIdx(ca.v), i0 = ca.v.findIndex(ok), ub = lastIdx(cb.v), j0 = cb.v.findIndex(ok);
    return {e: a, c: ca, k: "Empleo formal privado vs. público desde 2012", v: `${pctTxt(ca.v[ua], ca.v[i0])} privado`, d: `Asalariados privados registrados: ${pctTxt(ca.v[ua], ca.v[i0])}; públicos: ${pctTxt(cb.v[ub], cb.v[j0])} (${fmtMes(F[i0])} a ${fmtMes(F[ua])}).`}; },
];
function renderCurios() {
  const cards = CURIOS.map(f => { try { return f(); } catch (err) { return null; } }).filter(Boolean);
  const cont = document.getElementById("c_cards");
  cont.innerHTML = cards.map((x, k) => `<button class="curio" data-k="${k}"><div class="k">${esc(x.k)}</div><div class="v">${x.v}</div><div class="d">${x.d}</div>${sparkline(x.c.v, PALETA[k % 8])}</button>`).join("");
  cont.querySelectorAll(".curio").forEach(b => b.onclick = () => abrirEnHistorico(cards[+b.dataset.k].e));
}
const cPres = document.getElementById("c_pres");
opcionesSelect(cPres, PRES.map(p => [p.id, p.n]).reverse(), "milei");
cPres.onchange = () => { stC.pres = cPres.value; renderLado(); };
botones("c_lado", [["mejor", "Lo mejor"], ["peor", "Lo peor"]], stC, "lado", false, renderLado);
botones("c_set", [["principales", "Indicadores principales"], ["todo", "Incluir precios del IPC y productos"]], stC, "set", false, renderLado);
botones("c_crit", [["mejora", "Medir cuánto mejoró (inicio → cierre)"], ["nivel", "Medir el nivel promedio"]], stC, "crit", false, () => { renderLado(); renderRanking(); });
botones("c_rk_grupos", GRUPOS_IND.map(g => [g, g]), stC, "grupos", true, renderRanking);
renders.curiosidades = () => { renderLado(); renderRanking(); renderCurios(); };

// =====================================================================
// ELECCIONES: qué dato económico se mueve junto con el voto al oficialismo
// =====================================================================
// % del candidato o la lista del oficialismo nacional (presidenciales: primera vuelta; legislativas: diputados, total país, aproximado).
const ELEC = [
  {f: "1995-05", tipo: "pres", of: "PJ (Menem)", v: 49.9, gano: true},
  {f: "1997-10", tipo: "leg", of: "PJ", v: 36.3, gano: false},
  {f: "1999-10", tipo: "pres", of: "PJ (Duhalde)", v: 38.3, gano: false},
  {f: "2001-10", tipo: "leg", of: "Alianza", v: 23.5, gano: false},
  {f: "2003-04", tipo: "pres", of: "Kirchner (apoyado por Duhalde)", v: 22.2, gano: true},
  {f: "2005-10", tipo: "leg", of: "Frente para la Victoria", v: 40.0, gano: true},
  {f: "2007-10", tipo: "pres", of: "FpV (CFK)", v: 45.3, gano: true},
  {f: "2009-06", tipo: "leg", of: "Frente para la Victoria", v: 30.8, gano: false},
  {f: "2011-10", tipo: "pres", of: "FpV (CFK)", v: 54.1, gano: true},
  {f: "2013-10", tipo: "leg", of: "Frente para la Victoria", v: 33.0, gano: true},
  {f: "2015-10", tipo: "pres", of: "FpV (Scioli)", v: 37.1, gano: false},
  {f: "2017-10", tipo: "leg", of: "Cambiemos", v: 41.8, gano: true},
  {f: "2019-10", tipo: "pres", of: "Juntos por el Cambio (Macri)", v: 40.3, gano: false},
  {f: "2021-11", tipo: "leg", of: "Frente de Todos", v: 34.0, gano: false},
  {f: "2023-10", tipo: "pres", of: "Unión por la Patria (Massa)", v: 36.8, gano: false},
  {f: "2025-10", tipo: "leg", of: "La Libertad Avanza", v: 40.7, gano: true},
].map(e => ({...e, i: idxDe(e.f), anio: e.f.slice(0, 4)}));
const stE = {tipos: new Set(["pres", "leg"]), metrica: "var12", minN: 6, buscar: "", ipc: "no", sel: [], ord: {k: "abs", d: -1}};
const METRICA_E = {
  var12: ["Cambio en los 12 meses previos", "cambio entre 13 y 1 mes antes de la elección (en % o, si la variable es un porcentaje, en puntos)"],
  nivel: ["Nivel promedio de los 12 meses previos", "promedio de los 12 meses anteriores a la elección (solo variables que se pueden comparar entre épocas: %, tasas, valores reales)"],
  mandato: ["Cambio desde el inicio del mandato", "cambio desde el inicio del mandato del presidente en ejercicio hasta el mes anterior a la elección"],
};
function valorElec(c, e, ind) {
  const u = e.i - 1; if (u < 13) return null;
  let iu = -1; for (let k = u; k >= u - 3; k--) if (ok(c.v[k])) { iu = k; break; }       // último dato disponible (series trimestrales)
  if (iu < 0) return null;
  if (stE.metrica === "nivel") {
    if (!(c.pct || nivelComparable(ind))) return null;
    const xs = []; for (let k = u - 11; k <= u; k++) if (ok(c.v[k])) xs.push(c.v[k]);
    return xs.length >= 2 ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
  }
  let i0;
  if (stE.metrica === "var12") i0 = iu - 12;
  else { const p = PRES.filter(p => p.i0 <= u).pop(); if (!p) return null; i0 = baseIdx(p); }
  let j = i0; while (j >= 0 && i0 - j < 3 && !ok(c.v[j])) j--;
  if (j < 0 || !ok(c.v[j])) return null;
  const a = c.v[j], b = c.v[iu];
  if (c.pct || a <= 0) return b - a;
  return (b / a - 1) * 100;
}
function pearson(xs, ys) {
  const n = xs.length; if (n < 3) return null;
  const mx = xs.reduce((a, b) => a + b, 0) / n, my = ys.reduce((a, b) => a + b, 0) / n;
  let sxy = 0, sxx = 0, syy = 0;
  for (let k = 0; k < n; k++) { const dx = xs[k] - mx, dy = ys[k] - my; sxy += dx * dy; sxx += dx * dx; syy += dy * dy; }
  return sxx && syy ? {r: sxy / Math.sqrt(sxx * syy), b: sxy / sxx, a: my - sxy / sxx * mx} : null;
}
const esDetalle = s => (s.cat[1] || "").startsWith("IPC INDEC") && s.cat[2] !== "Nacional" || (s.cat[1] || "").startsWith("Precios promedio") && s.cat[2] !== "GBA";
const cacheE = new Map();
function correlaciones() {
  const k = JSON.stringify([[...stE.tipos], stE.metrica, stP.base, stP.n]);
  if (cacheE.has(k)) return cacheE.get(k);
  const elec = ELEC.filter(e => stE.tipos.has(e.tipo) && e.i > 0);
  const res = [];
  D.series.forEach(s => {
    if (s.id === "poblacion" || s.id === "pib_nom_anual") return;
    const ind = {id: s.id, med: medDefault(s), rel: null, modo: "compra", esc: s.agg && PIB_AN && s.tipo !== "none" ? "pib" : ""};
    const c = calc(ind);
    const pts = elec.map(e => ({e, x: valorElec(c, e, ind)})).filter(p => ok(p.x));
    if (pts.length < 4) return;
    const pr = pearson(pts.map(p => p.x), pts.map(p => p.e.v));
    if (!pr) return;
    res.push({s, ind, c, pts, ...pr, n: pts.length});
  });
  cacheE.set(k, res);
  return res;
}
const fmtR = r => (r > 0 ? "+" : "") + nf2.format(r);
function textoRel(o) {
  const sube = stE.metrica === "nivel" ? "más alto" : "más subió";
  return `Cuanto ${sube} → ${o.r > 0 ? "más" : "menos"} votos al oficialismo`;
}
function dispersion(o, color) {
  const W = 260, H = 170, m = {l: 34, r: 8, t: 8, b: 22};
  const xs = o.pts.map(p => p.x), ys = o.pts.map(p => p.e.v);
  let x0 = Math.min(...xs), x1 = Math.max(...xs); const px = (x1 - x0) * 0.08 || 1; x0 -= px; x1 += px;
  const y0 = Math.max(0, Math.min(...ys) - 4), y1 = Math.max(...ys) + 4;
  const X = v => m.l + (v - x0) / (x1 - x0) * (W - m.l - m.r), Y = v => H - m.b - (v - y0) / (y1 - y0) * (H - m.t - m.b);
  let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(o.s.n)}">`;
  niceTicks(y0, y1, 3).filter(v => v >= y0 && v <= y1).forEach(v => s += `<line x1="${m.l}" x2="${W - m.r}" y1="${Y(v)}" y2="${Y(v)}" stroke="var(--grid)"/><text x="${m.l - 4}" y="${Y(v) + 3}" text-anchor="end" style="font-size:9px">${nf0.format(v)}%</text>`);
  niceTicks(x0, x1, 3).filter(v => v >= x0 && v <= x1).forEach(v => s += `<text x="${X(v)}" y="${H - 8}" text-anchor="middle" style="font-size:9px">${o.c.pct || stE.metrica !== "nivel" ? nf0.format(v) : fmtNum(v)}</text>`);
  s += `<line x1="${X(x0)}" x2="${X(x1)}" y1="${Y(o.a + o.b * x0)}" y2="${Y(o.a + o.b * x1)}" stroke="var(${color})" stroke-opacity=".55" stroke-dasharray="4 3"/>`;
  o.pts.forEach(p => {
    const cx = X(p.x), cy = Y(p.e.v);
    s += `<circle cx="${cx}" cy="${cy}" r="3.5" fill="${p.e.tipo === "pres" ? `var(${color})` : "var(--surface-1)"}" stroke="var(${color})" stroke-width="1.5"><title>${p.e.anio} ${p.e.tipo === "pres" ? "presidencial" : "legislativa"}: ${esc(p.e.of)} ${nf1.format(p.e.v)}% · ${esc(o.s.n)}: ${nf1.format(p.x)}</title></circle>`;
    s += `<text x="${cx + 5}" y="${cy - 4}" style="font-size:9px;fill:var(--text-secondary)">${p.e.anio.slice(2)}</text>`;
  });
  return s + "</svg>";
}
function renderElecciones() {
  const todas = correlaciones();
  const q = norm(stE.buscar.trim()), toks = q ? q.split(/\s+/) : [];
  let filas = todas.filter(o => o.n >= stE.minN && (stE.ipc === "si" || !esDetalle(o.s)) &&
    (!toks.length || toks.every(k => (o.s._busca || (o.s._busca = textoBusqueda(o.s))).includes(k))));
  const val = o => stE.ord.k === "abs" ? Math.abs(o.r) : stE.ord.k === "r" ? o.r : o.n;
  filas.sort((a, b) => (val(a) - val(b)) * stE.ord.d);
  const el = ELEC.filter(e => stE.tipos.has(e.tipo));
  document.getElementById("e_nota").innerHTML = `Para cada variable se calcula su valor en cada elección (${METRICA_E[stE.metrica][1]}) y se lo compara con el % que sacó el oficialismo nacional. ` +
    `<b>r</b> es la correlación: +1 = se mueven juntos, −1 = al revés, 0 = nada que ver. Con tan pocas elecciones (${el.length}), una correlación alta puede ser casualidad; con menos de 8 puntos, |r| por debajo de ~0,7 no dice mucho. Los montos de toda la economía se miden como % del PIB y los montos en pesos, en pesos reales.`;
  const t = document.getElementById("e_tabla");
  const th = (k, txt) => `<th data-k="${k}" class="${stE.ord.k === k ? (stE.ord.d > 0 ? "ord-asc" : "ord-desc") : ""}" style="cursor:pointer">${txt}</th>`;
  t.innerHTML = `<thead><tr><th>Variable</th>${th("r", "r")}${th("abs", "Fuerza |r|")}${th("n", "Elecciones")}<th style="text-align:left">Qué dice</th><th>Gráfico</th></tr></thead><tbody>` +
    (filas.slice(0, 300).map(o => {
      const on = stE.sel.includes(o.s.id);
      return `<tr><td class="nombre">${esc(o.s.n)} ${infoBtn(o.s.id)}<small>${esc(o.s.cat.slice(0, 2).join(" › "))} · ${esc(o.c.unidad)}</small></td>` +
        `<td${tinte(o.r * 0.9)}>${fmtR(o.r)}</td><td><span class="barra" style="--w:${Math.round(Math.abs(o.r) * 100)}%"></span>${nf0.format(o.r * o.r * 100)} %<small>r²</small></td><td>${o.n}</td>` +
        `<td class="unidad">${textoRel(o)}</td><td><button class="btn${on ? " on" : ""}" data-sel="${esc(o.s.id)}">${on ? "✓ en gráficos" : "+ graficar"}</button></td></tr>`;
    }).join("") || `<tr><td colspan="6" style="text-align:center;color:var(--text-muted)">Nada para mostrar.</td></tr>`) + "</tbody>";
  document.getElementById("e_cuenta").textContent = `${filas.length} variables${filas.length > 300 ? " (se muestran las primeras 300)" : ""}.`;
  t.querySelectorAll("th[data-k]").forEach(h => h.onclick = () => { const k = h.dataset.k; if (stE.ord.k === k) stE.ord.d *= -1; else { stE.ord.k = k; stE.ord.d = -1; } renderElecciones(); });
  t.querySelectorAll("[data-sel]").forEach(b => b.onclick = () => {
    const id = b.dataset.sel; stE.sel = stE.sel.includes(id) ? stE.sel.filter(x => x !== id) : [...stE.sel, id]; renderElecciones();
  });
  // Gráficos de dispersión: los elegidos, o si no hay, las 12 más fuertes
  const elegidos = stE.sel.length ? stE.sel.map(id => todas.find(o => o.s.id === id)).filter(Boolean) : filas.slice().sort((a, b) => Math.abs(b.r) - Math.abs(a.r)).slice(0, 12);
  document.getElementById("e_disp_nota").textContent = stE.sel.length ? `${elegidos.length} variables elegidas.` : "Las 12 de correlación más fuerte (elegí otras con \"+ graficar\").";
  document.getElementById("e_limpiar").style.display = stE.sel.length ? "" : "none";
  document.getElementById("e_disp").innerHTML = elegidos.map((o, k) => `<div class="disp"><div class="k">${esc(o.s.n)}</div><div class="d">r = ${fmtR(o.r)} · ${o.n} elecciones</div>${dispersion(o, PALETA[k % 8])}<div class="d">eje X: ${esc(stE.metrica === "nivel" ? o.c.unidad : o.c.pct ? "cambio en puntos" : "cambio %")} · eje Y: % del oficialismo</div></div>`).join("");
  document.getElementById("e_elec").innerHTML = `<thead><tr><th>Fecha</th><th>Tipo</th><th style="text-align:left">Oficialismo</th><th>% de votos</th><th>Resultado</th></tr></thead><tbody>` +
    ELEC.map(e => `<tr><td>${fmtMes(e.f)}</td><td>${e.tipo === "pres" ? "Presidencial (1ª vuelta)" : "Legislativa (diputados, aprox.)"}</td><td class="unidad">${esc(e.of)}</td><td>${nf1.format(e.v)} %</td><td>${e.gano ? "Ganó" : "Perdió"}</td></tr>`).join("") + "</tbody>";
}
botones("e_tipos", [["pres", "Presidenciales"], ["leg", "Legislativas"]], stE, "tipos", true, renderElecciones);
botones("e_metrica", Object.entries(METRICA_E).map(([k, v]) => [k, v[0]]), stE, "metrica", false, renderElecciones);
botones("e_ipc", [["no", "Sin detalle regional de precios"], ["si", "Con todo"]], stE, "ipc", false, renderElecciones);
(() => {
  const mn = document.getElementById("e_minn"); mn.value = stE.minN;
  mn.oninput = () => { stE.minN = Math.max(4, Math.min(16, +mn.value || 6)); renderElecciones(); };
  let tt = null; const b = document.getElementById("e_buscar");
  b.oninput = () => { clearTimeout(tt); tt = setTimeout(() => { stE.buscar = b.value; renderElecciones(); }, 150); };
  document.getElementById("e_limpiar").onclick = () => { stE.sel = []; renderElecciones(); };
})();
renders.elecciones = renderElecciones;

// =====================================================================
// FUENTES
// =====================================================================
renders.fuentes = () => {
  const porRaiz = {};
  D.series.forEach(s => { porRaiz[s.cat[0]] = (porRaiz[s.cat[0]] || 0) + 1; });
  document.getElementById("f_resumen").textContent = `${D.series.length} series en total: ` +
    ORDEN_RAIZ.filter(r => porRaiz[r]).map(r => `${r.toLowerCase()} (${porRaiz[r]})`).join(", ") + `. Datos desde ${fmtMes(F[0])} hasta ${fmtMes(F[N - 1])}, según la serie.`;
};

mostrarTab(tabActual);
