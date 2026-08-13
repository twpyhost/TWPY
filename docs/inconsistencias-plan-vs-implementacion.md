# Inconsistencias entre lo planeado y lo implementado

**Fecha del relevamiento:** 2026-08-12
**Estado:** abierto — cada ítem se decide uno a uno

Comparación entre las fuentes de verdad escritas (`CLAUDE.md`,
`design/README.md`, `docs/superpowers/specs/`, `docs/superpowers/plans/`,
`docs/qa/`, `TODO.todo`) y lo que el código realmente hace hoy.

**Cómo usar este documento.** Cada ítem tiene una recomendación, pero la
decisión es del dueño del proyecto. Para cada uno hay tres salidas posibles:

- **Implementar lo planeado** — el doc tiene razón, falta código.
- **Actualizar el doc** — el código tiene razón, el doc quedó viejo.
- **Decisión de producto** — hay que elegir; no es un error de nadie.

Marcá la casilla cuando el ítem quede resuelto y anotá qué se hizo.

Los ítems de **deuda técnica ya conocida** (bugs registrados y abiertos) viven
en `docs/tech-debt-backlog.md`; acá solo se listan los dos que además
contradicen un invariante declarado por escrito.

---

## A. Documentación que contradice al código

### [ ] A1 — El spec de marcador por set describe un puntaje que ya no existe

- **Dice el plan:** el cuerpo de
  `docs/superpowers/specs/2026-08-11-liga-marcador-por-set-design.md` explica que
  `PTS = matches ganados`.
- **Hace el código:** `puntos: s.g` — un punto por **set (FT) ganado**, y los
  matches quedaron como desempate. Ver `src/lib/ligaTabla.js:90` y el orden de
  criterios en `src/lib/ligaTabla.js:94-98`.
- **Detalle:** el propio spec ya tiene una nota de cabecera que corrige esto y
  aclara que lo de abajo es el estado anterior. O sea: no hay ambigüedad sobre
  cuál es el criterio vigente, pero el cuerpo sigue leyéndose como si fuera
  actual. `CLAUDE.md` sí está alineado con el código.
- **Recomendación:** **actualizar el doc.** Reescribir las secciones de puntaje
  y desempate del cuerpo para que digan lo que hace el código, dejando la nota
  histórica como registro del cambio.

### [ ] A2 — `CLAUDE.md` lista una sección "Contenido" del panel que no existe

- **Dice el plan:** `CLAUDE.md` enumera las secciones del panel e incluye
  **Contenido** (CRUD de noticias/eventos).
- **Hace el código:** no existe `src/app/admin/contenido/` ni el ítem en el
  sidebar. Las secciones reales son Identidades, Jugadores, Torneos, Liga,
  Rankings y Sistema (`src/components/admin/AdminShell.js`).
- **Detalle:** el plan de go-live (`2026-07-29-supabase-go-live-y-admin.md`) ya
  había pospuesto Contenido explícitamente, así que la ausencia es deliberada;
  lo que quedó desactualizado es `CLAUDE.md`, que la describe como si estuviera.
- **Recomendación:** **actualizar el doc** — marcar Contenido como diferida en
  `CLAUDE.md`, no como sección existente. Construirla es una decisión aparte
  (ver B2).

### [ ] A3 — `design/README.md` describe un panel que ya no es el real

- **Dice el plan:** el handoff de diseño lista 6 secciones del panel, **con
  Contenido y sin Liga**.
- **Hace el código:** 6 secciones, **con Liga y sin Contenido**. La Liga se
  diseñó y construyó después del handoff.
- **Recomendación:** **actualizar el doc.** Anotar en `design/README.md` que el
  sidebar real cambió y por qué, igual que ya se hizo con las otras
  discrepancias que ese archivo documenta (breakpoint del hero, variante `ring`
  de la transición, etc.).

### [ ] A4 — Dos plans afirman que no existe framework de tests

- **Dice el plan:** `2026-07-28-tekken-design-system-rebuild.md` y
  `2026-07-29-page-loading-ring-transition.md` dicen "no existe framework de
  tests" y proponen verificar a mano con el navegador.
- **Hace el código:** hoy hay 6 suites unit, 7 de integración, ~13 e2e y
  documentación en `docs/qa/`.
- **Detalle:** `CLAUDE.md` ya establece que los specs/plans históricos son
  *registros puntuales, no punteros vivos*. Bajo ese criterio esto no es un
  error: era cierto cuando se escribió.
- **Recomendación:** **actualizar el doc, mínimamente.** No reescribirlos —
  alcanza con una línea al pie de cada uno que diga "escrito antes de que
  existiera `tests/`". Es el ítem más discutible de la lista y no cuesta nada
  dejarlo como está.

### [ ] A5 — El catálogo de QA no cubre las suites de liga del panel

- **Dice el plan:** `docs/qa/casos-de-prueba.md` es el catálogo completo de
  casos.
- **Hace el código:** faltan `tests/e2e/admin/liga.spec.js` y
  `ligaDesempate.spec.js`. El propio catálogo se auto-denuncia en una nota.
- **Detalle:** la suite pública `TS-LIGA` **ya se incorporó** al catálogo el
  2026-08-12, junto con el cambio a pestañas de `/liga`.
- **Recomendación:** **implementar lo planeado** — documentar las dos suites de
  liga del panel en el catálogo, que es barato y cierra la nota pendiente.

---

## B. Planeado y nunca implementado

### [ ] B1 — `/competidores/[id]`: el perfil de jugador no existe

- **Dice el plan:** el spec de liga (§6) pide que el nombre en la tabla de
  grupos linkee al perfil del jugador cuando hay `player_id`. `CLAUDE.md`
  también lista "player profiles" en la fase 1.
- **Hace el código:** `/competidores` es solo un board sin rutas dinámicas. El
  nombre se muestra en texto plano **a propósito**, para no dejar un link roto;
  está documentado en `src/app/liga/TablasGrupos.js:4-8`.
- **Recomendación:** **decisión de producto.** El código tomó la salida correcta
  ante una página inexistente. Hay que decidir si se construye el perfil (y
  entonces se conecta el link) o si se acepta que no va a existir en el MVP y se
  saca la promesa del spec.

### [ ] B2 — Noticias y eventos: ni panel ni páginas públicas

- **Dice el plan:** `CLAUDE.md` fase 1 incluye "events, news" como páginas
  públicas, y el panel debía tener **Contenido** para administrarlas.
- **Hace el código:** no existe nada de eso, ni público ni en el panel.
- **Recomendación:** **decisión de producto.** Es una feature entera, no un
  olvido. Si no entra en el MVP, sacarla de la fase 1 en `CLAUDE.md` para que
  deje de figurar como algo casi hecho.

### [ ] B3 — Discord OAuth: código listo, provider sin configurar

- **Dice el plan:** `TODO.todo` lo lista como pendiente.
- **Hace el código:** el botón y `/auth/callback` con gate por `is_admin()` ya
  están; falta habilitar el provider en el dashboard de Supabase y decidir cómo
  se le asigna rol al `auth.users` nuevo que crea Discord (no comparte UUID con
  la cuenta email/password). El login documenta la postergación en
  `src/app/auth/login/page.js:61`.
- **Recomendación:** **no es inconsistencia de código** — es una acción externa
  tuya en Supabase. Queda listado para que no se pierda.

---

## C. Implementado sin spec ni plan

Todas las features del repo tienen spec y plan, salvo estas. No es un bug: es
trazabilidad faltante, que es justamente lo que hace difícil este relevamiento.

### [ ] C1 — Los dos specs de liga no tienen plan de implementación

`2026-08-04-liga-fase-de-grupos-design.md` y
`2026-08-11-liga-marcador-por-set-design.md` no tienen archivo en
`docs/superpowers/plans/`, a diferencia de todas las demás features.

- **Recomendación:** **decisión de producto.** Escribir un plan retroactivo de
  algo ya construido rinde poco. La alternativa barata es anotar en cada spec
  que se implementó sin plan intermedio.

### [ ] C2 — El rol `liga` salió sin spec ni plan

`supabase/migrations/0014_rol_liga.sql` (separación `admin` / `liga`) y
`tests/e2e/rol-liga/rolLiga.spec.js` no tienen documento de diseño.

- **Atenuante:** `CLAUDE.md` **sí** documenta el modelo de roles en detalle
  (tabla de alcances, las tres capas de control, cómo se asigna el rol a mano).
- **Recomendación:** **actualizar el doc** — con lo que hay en `CLAUDE.md`
  alcanza; a lo sumo, dejar constancia de que se hizo sin spec.

### [ ] C3 — El plan de go-live no tiene spec

`2026-07-29-supabase-go-live-y-admin.md` es un plan de 16 hitos sin spec previo;
el propio documento abre reconociendo que todo el backend se construyó ad-hoc.

- **Recomendación:** **actualizar el doc** — ya está declarado en el propio
  archivo. Solo se lista para que quede en el inventario.

---

## D. Deuda abierta que contradice un invariante declarado

Estos dos ya están en `docs/tech-debt-backlog.md` con estado Open. Se repiten
acá porque no son cosméticos: rompen algo que la documentación afirma.

### [x] D1 — Un grupo cerrado se puede seguir modificando

- **Dice el plan:** cerrar un grupo lo congela, y no se puede cerrar mientras
  queden empates sin resolver.
- **Hace el código:** `PUT /desempate` y los botones Confirmar/Descartar **no
  chequean `grupo.cerrado`**, así que un borrador de desempate abierto de antes
  puede reescribir `orden_desempate` de un grupo ya cerrado.
- **Detalle:** anotado **dos veces** en el backlog (2026-08-06, en las dos
  tandas) y sigue abierto.
- **Recomendación:** **implementar lo planeado.** Es el ítem más accionable de
  toda la lista: un chequeo de `cerrado` en el endpoint, más el guard en la UI.
- **Resuelto (2026-08-12):** `PUT /desempate` devuelve 409 si el grupo está
  cerrado (`src/app/api/admin/liga/grupos/[numero]/desempate/route.js:32-38`) y
  el botón Confirmar del panel se deshabilita, con un aviso arriba del panel
  (`src/app/admin/liga/grupo/[numero]/GrupoDetalle.js`). Descartar sigue
  habilitado a propósito: no escribe nada, solo limpia el borrador local — si
  también se deshabilitara, un borrador viejo dejaría el panel pegado hasta
  recargar la página. Regresión nueva: `TC-LIGA-DESEMPATE-006` en
  `tests/e2e/admin/ligaDesempate.spec.js` (verificado que falla sin el fix).

### [x] D2 — `.env.local` apunta a producción

- **Riesgo:** un `npm run dev` distraído habla con el Supabase de **producción**.
- **Atenuante:** la suite de Playwright ya está blindada — corre con
  `NODE_ENV=test` (Next no carga `.env.local`) y `reuseExistingServer: false`
  justamente para que los tests no toquen prod. El agujero es el desarrollo
  manual, no los tests.
- **Recomendación:** **implementar lo planeado** — el backlog ya propone un
  guard en tiempo de desarrollo sobre `NEXT_PUBLIC_SUPABASE_URL`.
- **Resuelto (2026-08-12):** dos cambios.
  1. **Se dio vuelta el reparto de credenciales:** `.env.local` ahora apunta al
     stack local (`npx supabase start`) y las de producción viven en
     `.env.prod.local`, que no se carga solo. Efecto colateral buscado: los
     scripts de seed/purga (que usan `--env-file=.env.local`) dejaron de
     sembrar y purgar en **producción**. Además ahora todos llaman a
     `exigirSupabaseLocal()` (`scripts/entorno.js`), que los frena si los
     apuntás al remoto sin `--permitir-prod`.
  2. `scripts/guard-dev-env.mjs` corre antes de `next dev` y **frena el
     arranque** si `NEXT_PUBLIC_SUPABASE_URL` no es local. `npm run dev:prod`
     es la puerta explícita: carga `.env.prod.local`, advierte y levanta el
     server como proceso hijo con esas variables inyectadas.
  Playwright no cambia: invoca `npx next dev` directo con `NODE_ENV=test`.

---

## Resumen

| Categoría | Ítems | Recomendación dominante |
|---|---|---|
| A. Docs que contradicen al código | A1–A5 | Actualizar docs (A5: documentar 2 suites) |
| B. Planeado y no implementado | B1–B3 | Decisión de producto |
| C. Implementado sin doc | C1–C3 | Actualizar docs / aceptar |
| D. Deuda que rompe un invariante | D1–D2 | ✅ **Resueltos** el 2026-08-12 |

Si hay que priorizar una sola cosa de todo el documento: **D1**, porque es el
único que permite corromper datos ya cerrados. — *Cerrado: D1 y D2 se
implementaron el 2026-08-12; queda pendiente decidir A1–A5, B1–B3 y C1–C3.*
