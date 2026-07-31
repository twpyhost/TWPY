# Go-live de Supabase + Admin dashboard completo + Rediseño Tekken 8

## Resumen

Esta rama lleva el sitio de un prototipo con datos mockeados y diseño genérico a una
plataforma completa lista para producción: modelo de identidad de jugadores, integración
real con Challonge (v2, dos cuentas), panel de admin de 5 secciones, suite de tests, y
rediseño total sobre el sistema visual de Tekken 8. Todo el trabajo de código está terminado
y testeado; **falta únicamente el UAT con humanos** antes de salir a producción.

## Qué cambia

### 1. Modelo de identidad de jugadores (el corazón del sistema)
- Migración `0005_identidad_jugadores.sql`: reemplaza el esquema plano viejo
  (`usuarios`/`nombres_alternativos`) por `players` / `player_challonge_accounts` /
  `player_aliases` / `tournament_participants_raw`, desacoplando "persona real" de
  "cuenta de Challonge".
- Cubre los 5 escenarios reales de la comunidad: cuenta única, múltiples cuentas en el
  tiempo, jugador sin cuenta de Challonge (registro manual), y fusión/deshacer de cuentas
  duplicadas — todo auditado en `identidad_eventos`.
- Auto-resolución en el import es **estrictamente por `challonge_id`, nunca por nombre**
  (regresión cubierta por test) para no fusionar por error a dos personas distintas con
  el mismo nombre.

### 2. Integración con Challonge
- Migración de API v1 → v2.1 (`src/lib/challonge.js`).
- Soporte para **dos cuentas organizadoras** (A histórica, B actual), seleccionable en el
  import — cada torneo guarda `challonge_source_account` para trazabilidad.
- Pipeline de import extraído a `src/lib/importarTorneo.js`, testeado con fixtures reales
  (participante sin rango final, posición sin puntaje configurado, `challonge_id`
  duplicado, rollback si falla la inserción, etc).

### 3. Panel de admin completo (`/admin`)
Antes solo existían dos páginas sueltas sin shell. Ahora:
- **Resolución de identidades**: cola de pendientes, búsqueda de jugadores, fusión con
  modal de confirmación, deshacer, log de actividad.
- **Jugadores**: listado + detalle editable, gestión de cuenta de Challonge activa.
- **Torneos**: sincronizar nuevos (cuenta B) o importar histórico (A|B) con preview,
  reimportar, badges de cuenta de origen.
- **Rankings**: tabla anual con flechas ▲/▼, recalcular con confirmación, editor de
  puntajes por posición.
- **Sistema**: estado real de health check, últimas importaciones por cuenta.
- Shell responsive (sidebar → drawer en mobile), gate de auth centralizado — aunque la
  seguridad real sigue viviendo en `requireAdmin()` de cada ruta de API, no en el layout.

### 4. Producción y confiabilidad
- Fix del bloqueo de RLS que hacía dar 404 a todas las páginas `/torneo-resultado/[slug]`
  en modo Supabase (vista pública `torneo_resultados_publicos` en vez de exponer la tabla
  interna de resolución).
- Keep-alive (`GitHub Actions` diario + `/api/health`) para que Supabase free tier no
  pause el proyecto por inactividad.
- Backups automáticos semanales (`pg_dump` vía Actions).
- Cierre del registro público (auth solo por Discord OAuth), fix de open-redirect en
  `?redirectTo=`.
- SEO básico: metadata, `robots.js`, `sitemap.js`.

### 5. Suite de tests (antes: cero tests en el repo)
- Playwright como único runner: unit, integración (contra Supabase local) y e2e.
- Cubre el pipeline de import, recálculo de rankings/snapshots, aislamiento de RLS, y las
  4 páginas públicas.

### 6. Rediseño visual completo (Tekken 8 design system)
- Todas las páginas públicas reconstruidas sobre los tokens del sistema de diseño oficial:
  Home, Torneos, Ranking, Competidores, Reglamento, Login, Navbar, Footer.
- Nuevos primitives reutilizables (`Button`, `RibbonTag`, `HeroSection`, `StatusChip`,
  `PageLoadingRing`, etc).
- Animaciones y transición de carga (ring loader) entre páginas.

## Qué falta (bloqueante para producción)

Según el plan de go-live (`docs/superpowers/plans/2026-07-29-supabase-go-live-y-admin.md`),
de las fases A–C solo quedan dos hitos, y ambos requieren intervención humana directa —
no son tareas de código:

- **Hito 7 — Deploy**: crear/configurar el proyecto en Vercel (variables de entorno de
  producción, `DATA_SOURCE=supabase`), dominio en Cloudflare con SSL Full (Strict), y
  configuración de Auth de Discord en el dashboard remoto de Supabase (Site URL,
  Redirect URLs).
- **Hito 8 — Backfill histórico**: importar los torneos reales de las cuentas A y B, y
  **resolver manualmente la cola de identidades de los ~50 jugadores reales** (vincular,
  fusionar cuentas duplicadas, registrar a quienes no tienen Challonge). Es trabajo
  humano por diseño — no se puede automatizar sin arriesgar fusionar personas distintas.

Además quedan pendientes menores en `TODO.todo` (no bloqueantes, pulido de UX):
- El log de actividad debería mostrar con qué cuentas se hizo cada acción.
- Falta modal de advertencia de irreversibilidad al confirmar una fusión.
- El sidebar del admin parpadea al navegar entre secciones (solo debería recargar el
  contenido, no el sidebar).
- Falta diseño para la UI de alta de nuevas posiciones/puntajes en el editor de rankings.

## Cómo probarlo

- La base de datos ya está creada y `.env.local` (`DATA_SOURCE=supabase`) ya apunta al
  proyecto real en la nube (`hjpgsklqlellatijahbg.supabase.co`) — no a un stack local.
  `npm run dev` corre directo contra Supabase cloud.
- `npm test` es la única excepción: por diseño, la suite de integración (`tests/testSupabase.js`,
  `playwright.config.js`) siempre apunta a un stack local vía Docker (`supabase start`,
  `127.0.0.1:54321`) y **nunca** al proyecto remoto, para no arriesgar los datos reales al
  correr tests que insertan/borran filas. Ese stack local sigue siendo necesario solo para
  correr `npm test`, no para desarrollo normal.
- El UAT real (checklist de verificación por hito) está en la sección "Verificación" del
  plan de go-live enlazado arriba.
