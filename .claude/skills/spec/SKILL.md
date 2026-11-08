---
name: spec
description: Convertir una idea en una spec lista para implementar (docs/specs/<nombre>.md) entrevistando al usuario. Usar antes de cualquier feature mediana o grande.
disable-model-invocation: true
---

# Escribir una spec

Argumento: la idea (o el nombre de una entrada de docs/IDEAS.md).

1. Leer `docs/IDEAS.md`, `docs/ROADMAP.md` y `docs/DECISIONES.md` solo en las partes que tocan esta idea.
2. Entrevistar al usuario con preguntas de opción múltiple (AskUserQuestion), de a 2–4 por vez, sobre lo que no esté definido: qué ve el usuario, quién puede hacer qué (anónimo / registrado / admin), datos que se guardan, casos borde, moderación y abuso, qué queda afuera. Proponer siempre una opción recomendada.
3. Parar cuando alcance para implementar sin adivinar.
4. Escribir `docs/specs/<nombre-corto>.md` con estas secciones:
   - **Objetivo** (2–3 líneas)
   - **Qué ve y hace el usuario** (pasos)
   - **Requisitos** (lista numerada, cada uno verificable)
   - **Datos** (tablas/campos nuevos, si hay)
   - **Casos borde**
   - **Fuera de alcance**
   - **Cómo se verifica** (comandos, pantallas a revisar)
5. Si salió una decisión de arquitectura, agregarla a `docs/DECISIONES.md`.
6. Commitear la spec (y los docs tocados) si el usuario lo aprueba.
7. Ofrecer abrir la sesión que la implementa, para que el usuario solo tenga que aceptar:
   - Usar la herramienta para abrir sesiones (`start_session`), como propuesta que el usuario acepta con un botón.
   - Contexto **fresh**, no fork: la spec tiene todo lo necesario y arrastrar la entrevista encarece cada mensaje.
   - Modelo según `docs/COMO-TRABAJAMOS.md`: Sonnet 5.5 para una spec clara; Opus 5.5 si toca seguridad, permisos o datos de usuarios.
   - Pedido: "Implementá docs/specs/<nombre>.md siguiendo CLAUDE.md (verificar, revisor, después ofrecer commit)".
   - Si esa herramienta no está disponible, cerrar diciendo: "Spec lista. Para implementar, abrí una sesión nueva y pedí: implementá docs/specs/<nombre>.md".
