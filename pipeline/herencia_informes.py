"""Herencia, fase 2 (docs/specs/herencia.md): datos oficiales que están en informes (PDF o planillas), cargados a mano.

Lee datos/manual/herencia.json (versionado), revisa que cada dato tenga su cita completa y devuelve lo que se escribe en
web/public/datos/herencia_informes.json. Sin red: corre igual con --solo-json.

Formato de cada dato: clave, nombre, unidad, traspaso ("AAAA-MM", mes de asunción del que recibe, o "hoy"), valor (número o texto),
fecha_dato ("AAAA-MM-DD"), organismo, documento, url, pagina, cita (texto tal cual del documento) y nota (opcional).
Sin documento, URL, página y cita, el dato no se carga: se corta con un error que dice cuál falta.
"""
import json
import re
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
ARCHIVO = RAIZ / "datos" / "manual" / "herencia.json"
OBLIGATORIOS = ("clave", "traspaso", "valor", "unidad", "fecha_dato", "organismo", "documento", "url", "pagina", "cita")
CAMPOS_WEB = OBLIGATORIOS + ("nota",)


def construir_json() -> dict | None:
    """Los datos para la web, o None si no hay archivo. Lanza ValueError si algún dato está incompleto o repetido."""
    if not ARCHIVO.exists():
        return None
    crudo = json.loads(ARCHIVO.read_text(encoding="utf-8"))
    datos = crudo["datos"] if isinstance(crudo, dict) else crudo
    vistos, salida = set(), []
    for n, d in enumerate(datos, 1):
        falta = [c for c in OBLIGATORIOS if d.get(c) in (None, "")]
        if falta:
            raise ValueError(f"datos/manual/herencia.json, dato {n} ({d.get('clave')}, {d.get('traspaso')}): falta {', '.join(falta)}")
        if d["traspaso"] != "hoy" and not re.fullmatch(r"\d{4}-\d{2}", d["traspaso"]):
            raise ValueError(f"dato {n}: traspaso '{d['traspaso']}' no es AAAA-MM ni 'hoy'")
        if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", d["fecha_dato"]):
            raise ValueError(f"dato {n}: fecha_dato '{d['fecha_dato']}' no es AAAA-MM-DD")
        if not str(d["url"]).startswith("https://"):
            raise ValueError(f"dato {n}: la url tiene que ser https://")
        llave = (d["clave"], d["traspaso"])
        if llave in vistos:
            raise ValueError(f"dato {n}: {llave} está repetido")
        vistos.add(llave)
        salida.append({c: d[c] for c in CAMPOS_WEB if d.get(c) not in (None, "")})
    return {"actualizado": crudo.get("actualizado") if isinstance(crudo, dict) else None, "datos": salida}


if __name__ == "__main__":
    j = construir_json()
    print("sin archivo" if j is None else f"{len(j['datos'])} datos de informes, sin errores")
