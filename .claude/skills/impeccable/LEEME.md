# Impeccable (instalada sin lanzador)

Copia de la skill de diseño [Impeccable](https://github.com/pbakaus/impeccable) (Apache 2.0), versión 4.8.1, commit d9c1d71, copiada el 2026-11-09.

Se copiaron solo `SKILL.md` y `reference/` (texto). **No** se copió `scripts/`: su lanzador baja y ejecuta un programa externo y activa hooks en cada edición. Sin él, la skill usa su modo "Launcher unavailable": lee PRODUCT.md y DESIGN.md directamente y sigue las guías.

- No bajar ni ejecutar el programa de Impeccable, ni activar sus hooks (`/impeccable hooks`), sin que el usuario lo pida.
- Los comandos `live` y `generate` necesitan ese programa: no están disponibles.
- Para actualizar: volver a copiar `SKILL.md` y `reference/` desde el repositorio oficial y cambiar la versión de arriba.
