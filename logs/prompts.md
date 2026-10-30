# Log de prompts y cambios — Cumbre Café

Registro obligatorio exigido por el enunciado del trabajo semestral de
**INFB8091 — Desempeño de Sistemas** (UTEM, 2026-2).

Cada entrada deja constancia del prompt solicitado, el agente y modelo que lo atendió, y un
resumen de lo que ese prompt generó. Las entradas se agregan **al final**, en orden cronológico.

**Formato:**
```
## YYYY-MM-DD HH:mm | agente: <nombre> (<modelo>)
- **Prompt:** <texto solicitado por el usuario>
- **Cambios:** <resumen de archivos creados/modificados>
- **Defectos conocidos:** <lo que quedó sin corregir>        (opcional)
- **Propuestas no aprobadas:** <lo que se propuso y se rechazó>  (opcional)
```

---

## 2026-10-30 | agente: Claude Code (claude-opus-5)
- **Prompt:** "tengo un proyecto universitario, te mandare todo material que tengamos en cavas,
  ya sea materia y contenido, para poder desarrollar de buena forma el proyecto semestral de
  este ramo." Seguido del envío del material del curso: bitácora (imagen), programa y objetivos
  (texto de Canvas), `Catedra 1.0 Introducción al Curso INFB8091 2026-2.ppt` y
  `Catedra 1.1 Etapas de la Modelación-SEM2-2026.pdf`.
- **Cambios:**
  - Creada la estructura de trabajo del ramo: `material/catedras/`, `material/libros/`,
    `enunciado/`, `proyecto/`.
  - Copiadas las cátedras a `material/catedras/`.
  - Creado `NOTAS.md` con el programa del ramo, los 8 objetivos específicos, la bitácora
    completa con fechas y la fórmula de evaluación, y la transcripción íntegra de la
    Cátedra 1.1 (etapas de la modelación, agente monitor, análisis de sensibilidad).
- **Defectos conocidos:** la Cátedra 1.0 es un `.ppt` binario de Office 97 del que no se pudo
  extraer el texto (no hay PowerPoint ni librería compatible en el equipo). Queda pendiente
  re-exportarla como PDF desde Canvas.

## 2026-10-30 | agente: Claude Code (claude-opus-5)
- **Prompt:** Envío de `Catedra 1.2 Consolidacion de La Evaluacion del Rendimiento-SEM2-2026.pdf`
  y una segunda copia de la Cátedra 1.1, con la indicación "estos son para el proyecto".
- **Cambios:**
  - Copiada la Cátedra 1.2 a `material/catedras/`. Se verificó por hash que la segunda copia
    de la Cátedra 1.1 era idéntica a la ya existente; no se duplicó.
  - `NOTAS.md`: agregada la sección 4 con la Cátedra 1.2 completa — carga vs. workload, tiempo
    de respuesta y throughput, las tres técnicas de evaluación, fórmulas de aceleración y
    relación rendimiento/costo con sus ejemplos numéricos, y las leyes de **Amdahl** y
    **Gustafson** con sus casos resueltos.

## 2026-10-30 | agente: Claude Code (claude-opus-5)
- **Prompt:** Envío de `Trabajo 1 Semestre 2 - 2026.pdf` (enunciado) y
  `Modelos de Carga en la Web.pdf`, más el enlace https://github.com/jabtools/tiempo
  con la aclaración "perdón me equivoqué".
- **Cambios:**
  - Copiado el enunciado a `enunciado/` y el PDF de modelos de carga a `material/catedras/`.
  - Creado `enunciado/TRABAJO-SEMESTRAL.md`: objetivos, Fase 1.1 (ambas opciones), Fase 1.2
    (generadores de carga), Fase 2 (indicadores de servidor y de experiencia de usuario),
    entregables y las recomendaciones del profesor sobre el uso del agente generativo.
  - Revisado el repositorio `jabtools/tiempo`: se identificó como el **ejemplo de referencia
    del profesor** del flujo de trabajo con agente (no como un error del usuario). Se extrajo
    y documentó el molde de su `AGENTS.md` y el formato de su `logs/prompts.md`.
  - `NOTAS.md`: agregada la sección 4-bis con el contenido de Modelos de Carga en la Web —
    CBMG, interacción Browser/WebServer sobre TCP-IP/HTTP/HTML, estructuras `HTTPRequest` y
    `HTTPResponse`, datos obtenibles, mecanismos de recolección y usos.
- **Defectos conocidos:** las láminas 9 a 15 de `Modelos de Carga en la Web.pdf` son imágenes
  sin texto extraíble, presumiblemente el diagrama del CBMG con sus probabilidades de
  transición. Quedan pendientes de revisión manual.

## 2026-10-30 | agente: Claude Code (claude-opus-5)
- **Prompt:** "Opción 1: e-commerce". Decisiones complementarias tomadas por el usuario:
  stack **Next.js + PostgreSQL**, herramienta de carga **k6**, y rubro del comercio delegado
  al agente para su propuesta.
- **Cambios:**
  - Propuesto el rubro: **Cumbre Café**, tostaduría de café de especialidad. Justificación:
    los atributos ortogonales del café (origen, variedad, proceso, nivel de tueste, notas de
    cata, formato, tamaño) producen filtros ricos para el catálogo y permiten que el detalle
    de producto sea una página naturalmente pesada frente a un home liviano, cumpliendo el
    requisito de "páginas con distinta carga de datos".
  - Creada la estructura del repositorio en `proyecto/`: `logs/`, `docs/`, `carga/escenarios/`.
  - Creado `AGENTS.md` con las reglas del agente, reglas específicas de desempeño,
    verificación obligatoria, cierre de entrega, áreas de expertise y convenciones técnicas.
  - Creado este `logs/prompts.md` con el historial retroactivo de la sesión.
