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
6. Cerrar diciendo: "Spec lista. Para implementar, abrí una sesión nueva y pedí: implementá docs/specs/<nombre>.md".
