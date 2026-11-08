"""
Compara los ids de serie de datos/cache/compilado.json con datos/series_esperadas.txt.

- Si falta algún id esperado y no se pasó --aceptar-menos: lista los faltantes y sale con código 1.
- Si hay ids nuevos, o faltan y se pasó --aceptar-menos: reescribe el archivo con los ids actuales.
- Si el archivo no existe: lo crea con los ids actuales.
No baja nada de internet. Si existe GITHUB_STEP_SUMMARY, agrega el detalle al resumen de la corrida.
"""
import json
import os
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
COMPILADO = RAIZ / "datos" / "cache" / "compilado.json"
ESPERADAS = RAIZ / "datos" / "series_esperadas.txt"


def ids_actuales():
    datos = json.loads(COMPILADO.read_text(encoding="utf-8"))
    return sorted({s["id"] for s in datos["series"]})


def escribir(ids):
    ESPERADAS.write_text("\n".join(ids) + "\n", encoding="utf-8", newline="\n")


def resumen(texto):
    archivo = os.environ.get("GITHUB_STEP_SUMMARY")
    if archivo:
        with open(archivo, "a", encoding="utf-8") as f:
            f.write(texto + "\n")


def main():
    aceptar_menos = "--aceptar-menos" in sys.argv
    actuales = ids_actuales()
    if not ESPERADAS.exists():
        escribir(actuales)
        print(f"Se creó series_esperadas.txt con {len(actuales)} series.")
        resumen(f"- Series: {len(actuales)} (archivo de control creado)")
        return 0
    esperadas = [l.strip() for l in ESPERADAS.read_text(encoding="utf-8").splitlines() if l.strip()]
    faltan = sorted(set(esperadas) - set(actuales))
    nuevas = sorted(set(actuales) - set(esperadas))
    resumen(f"- Series: {len(actuales)} actuales, {len(esperadas)} esperadas")
    if faltan and not aceptar_menos:
        print(f"ERROR: faltan {len(faltan)} series:")
        for i in faltan:
            print("  -", i)
        resumen("\n**Faltan series (no se publica):**\n\n" + "\n".join(f"- `{i}`" for i in faltan))
        return 1
    if faltan or nuevas:
        escribir(actuales)
        print(f"series_esperadas.txt actualizado: {len(nuevas)} nuevas, {len(faltan)} quitadas.")
    else:
        print(f"OK: {len(actuales)} series, sin cambios.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
