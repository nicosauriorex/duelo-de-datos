# Cómo trabajamos con Claude en este proyecto

Basado en la documentación oficial de Claude Code (code.claude.com/docs: best-practices, costs, sub-agents, memory), noviembre 2026.

## Qué hay configurado

| Archivo | Para qué | Cuándo se carga |
|---|---|---|
| `CLAUDE.md` | Lo mínimo: comandos, trampas, convenciones | Siempre (por eso es corto) |
| `docs/ESTADO.md` | Dónde estamos, qué sigue y qué quedó sin verificar | Al empezar cada sesión ("leé docs/ESTADO.md y seguí") |
| `.claude/rules/pipeline.md` | Reglas del Python | Solo al tocar `pipeline/` |
| `.claude/rules/frontend.md` | Reglas del frontend y reglas de interfaz que salieron de tus pedidos | Solo al tocar `web/` |
| `.claude/skills/spec` | `/spec <idea>`: te entrevista y escribe la spec | Cuando lo llamás |
| `.claude/skills/nueva-serie` | Pasos para sumar un indicador | Cuando se pide una serie nueva |
| `.claude/agents/revisor` | Revisa lo implementado contra la spec (Sonnet, no edita) | Después de implementar |
| `.claude/agents/investigador-datos` | Busca la fuente oficial de una serie (Haiku, barato) | Antes de sumar una serie |
| `.claude/settings.json` | Bloquea leer el token y `datos/cache/` (archivos gigantes). Para mirar un caché Claude usa `python pipeline/ver_cache.py`, que muestra columnas y pocas filas | Siempre |
| `CLAUDE.local.md` (opcional, no va a git) | Tus preferencias personales | Siempre |

Por qué así: todo lo que está en CLAUDE.md se paga en **cada** mensaje. Lo específico va en reglas por carpeta o skills, que se cargan solo cuando hacen falta. Lo que no puede fallar nunca (no leer el token) va en `settings.json`, no en texto.

## El flujo para cada feature

Un solo flujo para todo: spec primero, implementación en la misma sesión con subagentes, verificación y commit. Lo que cambia entre una feature y una tanda de ajustes es de dónde sale la spec.

1. **Idea → spec** (sesión 1): `/spec compartir gráficos`. Claude pregunta, vos elegís, sale `docs/specs/compartir.md`.
2. **Implementar en la misma sesión**: Claude reparte la spec entre subagentes, que arrancan limpios (solo con la spec y sus archivos), así que no se arrastra la charla de la entrevista. Sesión nueva solo si cambiás de tema o la conversación ya es muy larga: "leé docs/ESTADO.md y seguí".
   Para cambios grandes, arrancá en **modo plan** (Shift+Tab, o el selector de modo): Claude propone el plan y no toca nada hasta que lo aprobás.
3. **Revisar**: "que el revisor compare los cambios contra docs/specs/compartir.md". Arreglar lo que marque.
4. **Verificar y commitear**: pedir que muestre el comando que corrió y el resultado (o una captura), después commit.

Cosas chicas (un bug, un texto, un color): directo, sin spec.

## El flujo para una tanda de ajustes (el que más usamos)

Sirve cuando recorrés el sitio y juntás una lista de cosas a cambiar.

1. **Pasás la lista**, con capturas si ayudan. No hace falta ordenarla.
2. Claude la anota en `docs/IDEAS.md`, saca la regla general de cada pedido y escribe `docs/specs/ajustes-tanda-N.md`. Si algo depende de tu gusto, pregunta con opciones; si dijiste "fijate", decide y te cuenta qué eligió.
3. **Implementa orquestando subagentes**: reparte la spec en tres o cuatro partes que no comparten archivos y las corre en paralelo con un modelo más barato.
4. Después, en la sesión principal: compila, corre el barrido por código (todas las páginas a 360 px y 1280 px), mira en el navegador, pasa el `revisor` y corrige.
5. Te muestra qué verificó y qué no, y recién ahí ofrece el commit y el push.

Dos frases útiles:
- **"No implementes"** (o "me quedan pocos tokens"): solo anota y planifica en los documentos.
- **"Leé docs/ESTADO.md y seguí"**: para retomar en una sesión nueva sin explicar nada.

Cuánto gasta: en las tandas de noviembre de 2026, cada subagente usó entre 120.000 y 240.000 tokens y cada pasada del `revisor` unos 150.000. Una tanda de cuatro partes ronda el millón de tokens, sin contar la sesión principal. Si el límite corta a los subagentes, se retoman donde quedaron.

Publicar: un push que solo toca `web/` o `docs/` se publica en un minuto; si toca `pipeline/` corre la actualización completa (10 minutos).

## Qué modelo y qué esfuerzo

| Tarea | Modelo | Esfuerzo |
|---|---|---|
| Decidir arquitectura, specs grandes, bugs difíciles en código ajeno, seguridad/permisos | Opus 5.5 | high |
| Implementar una spec clara, features normales | Opus 5.5 o Sonnet 5.5 | medium (default) |
| Cambios rutinarios: textos, estilos, renombres, sumar una serie siguiendo el skill | Sonnet 5.5 | low o medium |
| Búsquedas y tareas mecánicas de subagentes | Haiku 5.5 | (lo fija el agente) |
| Orquestar una tanda (repartir, revisar, decidir) | Fable 5.2 u Opus 5.5 en la sesión principal; Sonnet 5.5 en los subagentes | medium |
| Recorrer pantallas buscando textos mal escritos, repeticiones y desbordes | Haiku 5.5 en subagentes, cada uno en su pestaña | — |
| Un problema realmente trabado | Fable 5.2 (`/model fable`) o escribir `ultrathink` en ese mensaje | — |

- El modelo se cambia en el selector de modelo de la app (o `/model`); el esfuerzo con `/effort`.
- Subir el esfuerzo no ayuda en tareas simples: tarda más y gasta más para el mismo resultado.
- Ya no hace falta escribir "pensá bien", "sé exhaustivo" o MAYÚSCULAS: eso lo maneja el esfuerzo.

## Hábitos que ahorran tokens

- **Una tarea por sesión.** Cada mensaje reenvía toda la conversación; una sesión con tres temas paga los tres en cada mensaje. Terminaste algo → sesión nueva (o `/clear`). Una sesión larga de orquestación es la excepción: conviene mientras dura la tanda, y al cerrarla se actualiza `docs/ESTADO.md` para poder empezar limpio.
- **Pedidos concretos.** "Arreglá el filtro de fecha de Histórico que se superpone" gasta mucho menos que "mejorá la página".
- **Pará temprano.** Si arranca mal, cortalo (Esc) y corregí; no esperes a que termine.
- **Subagentes con criterio.** Sirven para búsquedas largas, trabajo en paralelo o una revisión con ojos frescos; no dan mejores respuestas y cada uno gasta sus propios tokens. Su informe no es prueba: lo que dicen que hicieron se compila y se mira antes de darlo por bueno.
- **Mirá el consumo**: `/usage` muestra qué se lleva más (sesiones largas, agentes, conectores) y sugiere ajustes.
- **Conectores (MCP)**: los que no uses en este proyecto, desactivalos para esta sesión.

## Dónde va cada cosa

- Algo que Claude tuvo que corregir dos veces → una línea en `CLAUDE.md` (o en la regla de esa carpeta).
- Un procedimiento de varios pasos que se repite → un skill nuevo.
- Algo que no puede fallar nunca → `settings.json` (deny) o un hook.
- Una decisión → `docs/DECISIONES.md`. Una idea → `docs/IDEAS.md`. Un plan → `docs/ROADMAP.md`. El estado para retomar → `docs/ESTADO.md`.
- Una regla de interfaz que vale para todo el sitio → `.claude/rules/frontend.md`.
