# Cómo trabajamos con Claude en este proyecto

Basado en la documentación oficial de Claude Code (code.claude.com/docs: best-practices, costs, sub-agents, memory), noviembre 2026.

## Qué hay configurado

| Archivo | Para qué | Cuándo se carga |
|---|---|---|
| `CLAUDE.md` | Lo mínimo: comandos, trampas, convenciones | Siempre (por eso es corto) |
| `.claude/rules/pipeline.md` | Reglas del Python | Solo al tocar `pipeline/` |
| `.claude/rules/frontend.md` | Reglas del frontend | Solo al tocar `web/` |
| `.claude/skills/spec` | `/spec <idea>`: te entrevista y escribe la spec | Cuando lo llamás |
| `.claude/skills/nueva-serie` | Pasos para sumar un indicador | Cuando se pide una serie nueva |
| `.claude/agents/revisor` | Revisa lo implementado contra la spec (Sonnet, no edita) | Después de implementar |
| `.claude/agents/investigador-datos` | Busca la fuente oficial de una serie (Haiku, barato) | Antes de sumar una serie |
| `.claude/settings.json` | Bloquea leer el token y los archivos gigantes generados | Siempre |
| `CLAUDE.local.md` (opcional, no va a git) | Tus preferencias personales | Siempre |

Por qué así: todo lo que está en CLAUDE.md se paga en **cada** mensaje. Lo específico va en reglas por carpeta o skills, que se cargan solo cuando hacen falta. Lo que no puede fallar nunca (no leer el token) va en `settings.json`, no en texto.

## El flujo para cada feature

1. **Idea → spec** (sesión 1): `/spec compartir gráficos`. Claude pregunta, vos elegís, sale `docs/specs/compartir.md`.
2. **Sesión nueva → implementar** (sesión 2): "implementá docs/specs/compartir.md". Empezar limpio sale más barato y sale mejor que arrastrar la charla de la spec.
   Para cambios grandes, arrancá en **modo plan** (Shift+Tab, o el selector de modo): Claude propone el plan y no toca nada hasta que lo aprobás.
3. **Revisar**: "que el revisor compare los cambios contra docs/specs/compartir.md". Arreglar lo que marque.
4. **Verificar y commitear**: pedir que muestre el comando que corrió y el resultado (o una captura), después commit.

Cosas chicas (un bug, un texto, un color): directo, sin spec.

## Qué modelo y qué esfuerzo

| Tarea | Modelo | Esfuerzo |
|---|---|---|
| Decidir arquitectura, specs grandes, bugs difíciles en código ajeno, seguridad/permisos | Opus 5.5 | high |
| Implementar una spec clara, features normales | Opus 5.5 o Sonnet 5.5 | medium (default) |
| Cambios rutinarios: textos, estilos, renombres, sumar una serie siguiendo el skill | Sonnet 5.5 | low o medium |
| Búsquedas y tareas mecánicas de subagentes | Haiku 5.5 | (lo fija el agente) |
| Un problema realmente trabado | Fable 5.1 (`/model fable`) o escribir `ultrathink` en ese mensaje | — |

- El modelo se cambia en el selector de modelo de la app (o `/model`); el esfuerzo con `/effort`.
- Subir el esfuerzo no ayuda en tareas simples: tarda más y gasta más para el mismo resultado.
- Ya no hace falta escribir "pensá bien", "sé exhaustivo" o MAYÚSCULAS: eso lo maneja el esfuerzo.

## Hábitos que ahorran tokens

- **Una tarea por sesión.** Cada mensaje reenvía toda la conversación; una sesión con tres temas paga los tres en cada mensaje. Terminaste algo → sesión nueva (o `/clear`).
- **Pedidos concretos.** "Arreglá el filtro de fecha de Histórico que se superpone" gasta mucho menos que "mejorá la página".
- **Pará temprano.** Si arranca mal, cortalo (Esc) y corregí; no esperes a que termine.
- **Subagentes con criterio.** Sirven para búsquedas largas, trabajo en paralelo o una revisión con ojos frescos; no dan mejores respuestas y cada uno gasta sus propios tokens.
- **Mirá el consumo**: `/usage` muestra qué se lleva más (sesiones largas, agentes, conectores) y sugiere ajustes.
- **Conectores (MCP)**: los que no uses en este proyecto, desactivalos para esta sesión.

## Dónde va cada cosa

- Algo que Claude tuvo que corregir dos veces → una línea en `CLAUDE.md` (o en la regla de esa carpeta).
- Un procedimiento de varios pasos que se repite → un skill nuevo.
- Algo que no puede fallar nunca → `settings.json` (deny) o un hook.
- Una decisión → `docs/DECISIONES.md`. Una idea → `docs/IDEAS.md`. Un plan → `docs/ROADMAP.md`.
