// Barrido de interfaz (tanda 4, B2 a B5). Se pega en la consola del navegador o se corre con una herramienta
// de automatización sobre cada ruta, a 360 px y a 1280 px, con la página ya cargada (y con cada ventana abierta).
// Devuelve un objeto con los hallazgos; sin hallazgos, todas las listas quedan vacías.
//   barridoPLD()            → mide la página como está
//   barridoPLD({ capa: 1 }) → además exige que haya una capa abierta con cruz de 44 px
//   barridoPLD({ arranque: 1 }) → además informa con qué dato arranca la sección (B8)
//   barridoAtrasPLD()       → con una capa abierta, dispara Atrás y dice si se cerró sin salir de la página (B2)
// B1 (cuentas) tiene además su script propio: `npx tsx scripts/barrido-cuentas.ts`.
// B7 (compartir lo que se ve) no se puede medir desde acá: se revisa abriendo Compartir en cada vista alternativa
// (Tabla, Velas, base 100, cada modo de Meses de mandato) y comparando la imagen con la pantalla.
(function () {
  const visible = (el) => {
    const r = el.getBoundingClientRect(), s = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && s.display !== "none";
  };
  const nombre = (el) => {
    const c = typeof el.className === "string" && el.className ? "." + el.className.trim().split(/\s+/).join(".") : "";
    return (el.tagName.toLowerCase() + c + " «" + (el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 40) + "»");
  };
  // Un contenedor que se desliza de costado a propósito (tablas, renglones de botones) no cuenta como desborde.
  const deslizable = (el) => {
    for (let p = el; p && p !== document.body; p = p.parentElement) {
      const o = getComputedStyle(p).overflowX;
      if ((o === "auto" || o === "scroll") && p.scrollWidth > p.clientWidth) return true;
    }
    return false;
  };

  window.barridoPLD = function (op = {}) {
    const ancho = document.documentElement.clientWidth;
    const h = { ruta: location.pathname + location.search, ancho, paginaDesborda: false, fueraDePantalla: [], textoCortado: [], fijos: [], enlacesRepetidos: [], botonesChicos: [], desalineados: [], capa: null, error: false };

    // B3 · la página no se desliza de costado y nada visible queda fuera del ancho
    h.paginaDesborda = document.documentElement.scrollWidth > ancho + 1;
    // El enlace "Saltar al contenido" vive fuera de pantalla a propósito y la barra de navegación es fija por diseño.
    const todos = [...document.body.querySelectorAll("*")].filter((el) => visible(el) && !el.closest("a.skip") && !el.matches("header.barra"));
    for (const el of todos) {
      const r = el.getBoundingClientRect();
      if ((r.right > ancho + 1 || r.left < -1) && !deslizable(el) && getComputedStyle(el).position !== "fixed") h.fueraDePantalla.push(nombre(el));
    }
    // B3 · texto más ancho que su caja, sin puntos suspensivos ni deslizamiento
    for (const el of todos) {
      if (!el.childElementCount && el.textContent.trim() && el.scrollWidth > el.clientWidth + 1) {
        const s = getComputedStyle(el);
        if (s.textOverflow !== "ellipsis" && s.overflowX === "visible" && s.display !== "inline") h.textoCortado.push(nombre(el));
      }
    }
    h.fueraDePantalla = [...new Set(h.fueraDePantalla)].slice(0, 25);
    h.textoCortado = [...new Set(h.textoCortado)].slice(0, 25);

    // B4 · elementos fijos o pegados que cubren contenido (se listan para revisar cada uno)
    for (const el of todos) {
      const p = getComputedStyle(el).position;
      if (p === "sticky" && el.tagName !== "TH" && el.tagName !== "TD") h.fijos.push(nombre(el));
    }
    h.fijos = [...new Set(h.fijos)].slice(0, 25);

    // B5 · enlaces con el mismo destino y el mismo texto dentro del contenido (la barra de navegación no cuenta)
    const vistos = new Map();
    for (const a of document.querySelectorAll("main a[href]")) {
      if (!visible(a)) continue;
      const k = a.getAttribute("href") + " | " + a.textContent.trim().replace(/\s+/g, " ");
      vistos.set(k, (vistos.get(k) || 0) + 1);
    }
    h.enlacesRepetidos = [...vistos].filter(([, n]) => n > 1).map(([k, n]) => k + " ×" + n);

    // B5 · en listas de filas con botón, el botón principal queda en la misma columna
    for (const lista of document.querySelectorAll("[data-filas], .oraciones, .lista-filas")) {
      // el botón principal de la fila es el último (los anteriores son los huecos de la oración)
      const xs = [...lista.children].map((f) => [...f.querySelectorAll("a.btn, button.btn")].pop()).filter((b) => b && visible(b)).map((b) => Math.round(b.getBoundingClientRect().left));
      if (new Set(xs).size > 1 && ancho >= 900) h.desalineados.push(nombre(lista) + " → " + xs.join(", "));
    }

    // B2 · capa abierta: tiene cruz de 44 px
    const capa = [...document.querySelectorAll('[role="dialog"], .desplegable .panel, .sel-lista')].filter(visible).pop();
    if (capa) {
      const cruz = capa.querySelector('button[aria-label="Cerrar"]');
      const r = cruz && cruz.getBoundingClientRect();
      h.capa = { cual: nombre(capa).slice(0, 60), cruz: !!cruz, medida: r ? Math.round(r.width) + "×" + Math.round(r.height) : null };
    } else if (op.capa) h.capa = { cual: null, cruz: false, medida: null };

    // B1 · un cero con signo ("-0,0", "+0,0") o "arriba"/"encima" con un número negativo no debe verse en ninguna pantalla
    const texto = document.body.innerText;
    h.ceroConSigno = [...new Set(texto.match(/[-−–+]\s?0(?:,0+)?(?![\d,])\s?(?:%|p\.p\.|puntos?)?/g) || [])].slice(0, 10);
    h.signoCruzado = [...new Set(texto.match(/[-−–]\d[\d.,]*\s?(?:%|p\.p\.|puntos?)?\s(?:arriba|por encima)/g) || [])].slice(0, 10);

    // B6 · lo que se mueve solo (animaciones largas o sin fin) sin estar a la vista
    h.moviendose = (document.getAnimations ? document.getAnimations() : []).filter((a) => a.playState === "running" && a.effect && a.effect.target && visible(a.effect.target))
      .filter((a) => { const t = a.effect.getTiming(); return t.iterations === Infinity || Number(t.duration) >= 3000; })   // las entradas de una sola vez no cuentan
      .filter((a) => { const r = a.effect.target.getBoundingClientRect(); return r.bottom < 0 || r.top > innerHeight; })   // corre sin estar a la vista
      .map((a) => nombre(a.effect.target)).slice(0, 10);

    // B8 · con qué arranca la sección (para revisar que el arranque sin parámetros sea el dato más pedido)
    const tit = document.querySelector("main h2, main h1");
    if (op.arranque) h.arranque = (tit ? tit.textContent.trim() : "") + (location.search ? " [con parámetros]" : "");

    // Pantalla de error de la aplicación
    h.error = /Algo salió mal|Application error/i.test(document.body.innerText);
    return h;
  };

  // B2 · con una capa abierta: dispara Atrás y dice si la capa se cerró y la página sigue siendo la misma.
  window.barridoAtrasPLD = async function () {
    const ruta = location.pathname, cuenta = () => [...document.querySelectorAll('[role="dialog"], .desplegable .panel, .sel-lista, .grafico-expandido')].filter(visible).length;
    const antes = cuenta();
    history.back();
    await new Promise((r) => setTimeout(r, 400));
    return { capasAntes: antes, capasDespues: cuenta(), mismaPagina: location.pathname === ruta };
  };
})();
