# Plan: Supabase go-live a producción + Admin dashboard completo

## Contexto

**Hallazgo principal de la revisión: no existe ningún plan ni spec de Supabase / integración con API.** Los dos únicos documentos en `docs/superpowers/` son de diseño visual (design system y loading ring), y ambos declaran explícitamente que no tocan Supabase. Todo el backend (5 migraciones, modelo de identidad completo, import de Challonge, 7 rutas de admin de identidades) se construyó ad-hoc, con la intención registrada solo en `CLAUDE.md`, `docs/infrastructure.md` y `docs/admin-dashboard-brief.md`.

El estado real es mejor de lo que sugiere la documentación: `src/lib/data/supabaseDb.js` está completo (sin stubs ni TODOs), auth con Discord está cableada, y el modelo objetivo `players` / `player_challonge_accounts` / `player_aliases` / `tournament_participants_raw` ya está implementado en `supabase/migrations/0005_identidad_jugadores.sql`. Pero el sitio sigue corriendo con `DATA_SOURCE=mock` y hay bloqueos concretos:

1. **Bloqueo duro de RLS**: `supabaseDb.js:44-51` lee `tournament_participants_raw` con el cliente anon, pero `0005:178-182` le niega policy de SELECT a propósito. Al pasar a `supabase`, la query devuelve `[]` → `getTorneoResultados` devuelve `null` → **todas las páginas `/torneo-resultado/[slug]` dan 404**.
2. **Bloqueo duro de auth en producción**: `supabase/config.toml:159` tiene `site_url = "http://127.0.0.1:3000"`. Si el proyecto remoto tiene la misma configuración de Site URL / Redirect URLs, el callback de Discord (`src/app/auth/callback/route.js`) y el link de confirmación de email **redirigen a localhost en producción**. Se configura en el dashboard de Supabase, no en migraciones — por eso no es visible en el repo.
3. **Falta el keep-alive**: `.github/` no existe y no hay `/api/health`. Supabase pausa proyectos free tras 7 días sin actividad de DB — `CLAUDE.md:18` lo marca como requisito no opcional.
4. **Falta el soporte de dos cuentas de Challonge (A histórica / B actual)**: solo existe en docs. `src/lib/challonge.js:27` lee una sola `CHALLONGE_API_KEY` y `torneos` no tiene columna `challonge_source_account`, así que hoy no se puede hacer el backfill histórico.
5. **Sin backups**: el free tier de Supabase no incluye backups restaurables (eso es Pro/PITR). Tras el backfill, la base es el archivo irreemplazable de la escena paraguaya.
6. **Cero tests**: 0 archivos de test propios, sin runner, sin script `test`. `recalcularSnapshots` (`src/lib/rankings.js:59-71`) borra e reinserta los snapshots de una temporada completa sin nada que lo verifique.

Además el admin está a ~1/6: solo `/admin/identidades` y `/admin/cargar_torneo` existen como páginas sueltas, sin shell ni sidebar (`/admin` da 404). Faltan Jugadores, Torneos, Rankings y Sistema.

**Resultado esperado**: sitio público en producción sirviendo datos reales, con keep-alive y backups automáticos, el archivo histórico cargado, y el panel de admin completo según `docs/admin-dashboard-brief.md` y el diseño `Admin Dashboard Liga Tekken Paraguay.dc.html`.

### Decisiones ya tomadas

- Fix de RLS: **vista pública** (no policy sobre la tabla), para respetar el comentario de `0005`.
- Ranking: **último snapshot / temporada** es la semántica correcta (el mock, que suma toda la historia, es el que está mal).
- Admin: **shell + rutas reales de Next**, una ruta por sección; `cargar_torneo` se absorbe en `/admin/torneos`.
- **Sección Contenido postergada** — fuera de este plan.
- Sistema muestra solo indicadores reales; **sin tarjeta del bot de Discord**.
- Auth: **cerrar el registro público**, admin entra solo por Discord OAuth.
- Tests: **Playwright como único runner** (unit + e2e), ejecutable localmente con `npm test` sin IA en el loop, incluyendo el pipeline de import de Challonge.
- Backups: **`pg_dump` por GitHub Actions**.

---

# FASE A — Sitio público en producción

## Hito 0 — Verificación previa (bloquea todo lo demás)

No escribir código hasta confirmar esto, porque `supabaseDb.js` apunta **solo** al esquema post-`0005`:

1. Confirmar que las migraciones `0001`–`0005` están aplicadas en el proyecto remoto `hjpgsklqlellatijahbg` (`supabase/.temp/project-ref`), vía `supabase migration list`. **El servidor MCP de Supabase necesita autorización OAuth — hay que autorizarlo con `/mcp` en una sesión interactiva antes de poder consultarlo.** Si `0005` no está aplicada, aplicarla antes de seguir.
2. Confirmar que `.env.local` tiene las 4 variables de `.env.example`. `DATA_SOURCE` sigue en `mock` hasta el final de la Fase A.
3. **Auditar la configuración de Auth del proyecto remoto** (dashboard, no repo): Site URL, lista de Redirect URLs permitidas, y si el provider Discord está habilitado (paso manual nunca hecho — advertido en `docs/superpowers/plans/2026-07-28-tekken-design-system-rebuild.md:1585`). Anotar los valores actuales; se corrigen en el Hito 6.
4. Confirmar que existe una fila en `user_roles` con rol `admin` para el usuario de Denis; si no, `public.is_admin()` (`0004:67-84`) devuelve false y todo `/admin` redirige a `/no-autorizado`.
5. Verificar si ya existe proyecto en Vercel y dominio en Cloudflare, o si hay que crearlos (Hito 7).
6. Copiar este plan a `docs/superpowers/plans/2026-07-29-supabase-go-live-y-admin.md` para que quede versionado.

## Hito 1 — Desbloquear el modo Supabase

**Migración `0006_vista_resultados_publicos.sql`** (nueva):

```sql
-- Los resultados publicos se exponen via vista: tournament_participants_raw
-- es la cola interna de resolucion y no debe leerse desde paginas publicas
-- (ver comentario en 0005). La vista corre con privilegios del owner
-- (security_invoker = false, default) y por eso puede leer la tabla base sin
-- una policy que expondria challonge_id/username/resolved_by al rol anon.
create view torneo_resultados_publicos as
  select tpr.torneo_id,
         t.nombre       as torneo_nombre,
         tpr.player_id,
         p.display_name as jugador_nombre,
         tpr.posicion,
         tpr.puntaje
  from tournament_participants_raw tpr
  join torneos t on t.id = tpr.torneo_id
  join players p on p.id = tpr.player_id
  where tpr.player_id is not null
    and p.merged_into_player_id is null;

grant select on torneo_resultados_publicos to anon, authenticated;
-- Defensa en profundidad: ademas de RLS, sin privilegio de tabla para anon.
revoke all on tournament_participants_raw from anon, authenticated;
```

La vista hace los joins ella misma (columnas planas) en lugar de depender de que PostgREST infiera relaciones de embedding sobre una vista — más robusto. El linter de Supabase va a marcar `security_definer_view`; es intencional y queda documentado en el comentario.

**`src/lib/data/supabaseDb.js`**:
- `getTorneoResultados` (:36-72): leer `torneo_resultados_publicos` y mapear a la forma que ya consume la página (`{ torneo: { nombre_torneo }, jugador: { id, nombre }, posicion, puntaje }`). No cambiar la firma ni el guard `Number.isFinite` (:37-40) — `torneo-resultado/[slug]/page.js:46` compara con `String(...)` y eso debe quedar así.
- Extraer el helper duplicado `getMovimiento` (idéntico en `supabaseDb.js:173` y `mockDb.js:123`) a `src/lib/data/movimiento.js` e importarlo en ambos.

**Ajustes de páginas públicas** (la semántica del ranking cambia respecto del mock):
- `src/app/ranking/page.js`: el copy de :37 ("posiciones acumuladas") y el contador de :41 ahora refieren al acumulado de la **temporada actual**, no histórico — corregir el texto. Agregar estado vacío (:51 hoy renderiza una lista vacía sin mensaje; copiar el patrón de `torneos/page.js:139-143`).
- `src/app/competidores/page.js:14-23`: los jugadores que no compitieron en la temporada actual quedan con `posicion: null, puntaje: null`. Renderizar "sin ranking esta temporada" en vez de celdas vacías.

## Hito 2 — Base de tests

Un solo runner: `@playwright/test` cubre tanto los tests de node como los de browser, así que no hace falta sumar Vitest.

- `playwright.config.js` con dos projects: **`unit`** (sin browser, `testDir: tests/unit`) y **`e2e`** (chromium, `webServer` levantando `next dev`). Scripts en `package.json`: `test`, `test:unit`, `test:e2e`, `test:ui`.
- **Prerrequisito de los tests con DB**: stack local de Supabase (`supabase start`, requiere Docker Desktop). Los tests que escriben nunca corren contra el proyecto remoto. Los tests puros no necesitan nada.
- **Refactor previo (sin cambio de comportamiento)**: extraer `insertarTorneo` / `insertarResultados` / `obtenerJuegoId` / `obtenerPuntajes` / `obtenerCuentasChallonge` de `src/app/api/admin/insertar_torneo/route.js:105-315` a `src/lib/importarTorneo.js`, dejando el route como capa de auth + HTTP. Esto es lo que hace testeable el pipeline, y el Hito 11 lo reusa para el botón de sincronizar.
- **Tests puros**: `extractTournamentId` (`src/lib/challonge.js:9-24`) — `challonge.com/slug`, `/es/slug`, subdominio de organización, subdominios reservados, URL inválida.
- **Tests de integración contra DB local**:
  - `recalcularSnapshots`: acumulado correcto en orden cronológico, `posicion_global` por puntaje, y que el `delete` + `insert` por temporada (:59-71) no pise otras temporadas.
  - **Aislamiento de RLS**: con el cliente anon, `tournament_participants_raw` devuelve 0 filas o error, `torneo_resultados_publicos` devuelve las resueltas, y un `player` con `merged_into_player_id` no aparece en `players` ni en la vista.
  - **Pipeline de import** con payloads fixture de Challonge (JSON en `tests/fixtures/`, sin HTTP: `importarTorneo` recibe el objeto `tournament` ya parseado): participante sin `final_rank` se omite con advertencia, posición sin puntaje configurado da 0 puntos + advertencia, `challonge_id` duplicado se omite, dos cuentas del mismo `player_id` en un torneo se omiten, torneo ya cargado da 409, y **rollback**: si falla la inserción de participantes, el torneo se borra (`route.js:142-147`).
  - Auto-resolución **solo por `challonge_id`**: dos jugadores distintos con el mismo nombre no se fusionan (regresión del riesgo que documentaba `CLAUDE.md:88`).
- **E2E**: las 4 páginas públicas contra la DB local sembrada (`/torneo-resultado/[id]` es la que hoy da 404), y el gate de admin (anónimo en `/admin/*` → login).

## Hito 3 — Health check y keep-alive

- **`src/app/api/health/route.js`** (nuevo): `export const dynamic = "force-dynamic"`. Query real y liviana (`select id from juegos limit 1`) con el cliente anon; 200 + `{ ok: true, checked_at }`, o 503 con el error. Tiene que consultar la DB, no solo responder HTTP: lo que dispara la pausa es la inactividad de la base (`docs/infrastructure.md:70`).
- **Registro del ping** (lo consume el panel Sistema del Hito 13): migración `0007_sistema_eventos.sql` con `sistema_eventos (id, tipo, ok, detalle jsonb, created_at)`, RLS habilitado y **sin policy** (solo service role, mismo patrón que `identidad_eventos`). El route inserta una fila solo si viene el header `x-health-secret` correcto (`HEALTH_PING_SECRET`, nueva variable) para que un GET anónimo no pueda spamear filas. El insert además genera actividad de escritura, que es justo lo que mantiene el proyecto despierto.
- **`.github/workflows/keep-supabase-alive.yml`** (nuevo, `.github/` no existe): base en `docs/infrastructure.md:74-88` — cron diario `0 12 * * *` + `workflow_dispatch`. Usar `vars.SITE_URL` y `secrets.HEALTH_PING_SECRET` en vez de hardcodear la URL del ejemplo.
- Agregar `HEALTH_PING_SECRET` a `.env.example`.

## Hito 4 — Backups automáticos

- **`.github/workflows/backup-supabase.yml`** (nuevo): semanal + `workflow_dispatch`. `pg_dump` de la connection string de Supabase (`secrets.SUPABASE_DB_URL`), comprimido y subido como artifact con retención larga. Al volumen de datos de esta comunidad es gratis y sobra.
- Documentar en `docs/infrastructure.md` el procedimiento de restore (crear proyecto nuevo + `psql < dump`), porque un backup que nadie probó restaurar no es un backup: hacer un restore de prueba una vez, sobre el stack local.
- Ejecutarlo manualmente una vez **inmediatamente después del backfill del Hito 8**.

## Hito 5 — Dos cuentas de Challonge (A / B)

- Migración `0008_torneos_source_account.sql`: `alter table torneos add column challonge_source_account text not null default 'B' check (challonge_source_account in ('A','B'))`. El default `'B'` deja correctos los torneos ya importados.
- **`src/lib/challonge.js`**: `fetchChallongeApi(tournamentId, cuenta = "B")` resolviendo la key con un helper `apiKeyPara(cuenta)` que lee `CHALLONGE_API_KEY_A` / `CHALLONGE_API_KEY_B`, con fallback a la `CHALLONGE_API_KEY` actual cuando `cuenta === "B"` (para no romper el entorno existente). Agregar `listarTorneos(cuenta)` (`GET /v1/tournaments.json`) que necesita el botón "Sincronizar" del Hito 11. Mantener el comentario sobre el límite de ~500 requests/mes del plan free: la sincronización pide la lista una vez por cuenta, no un request por torneo.
- **Rutas**: `previsualizar_torneo/route.js` e `insertar_torneo/route.js` aceptan `cuenta` en el body (validar contra `['A','B']`, default `'B'`), y la inserción persiste `challonge_source_account`.
- Actualizar `.env.example` con las dos keys. Extender los tests del Hito 2 para cubrir la selección de cuenta.

## Hito 6 — Auth de producción

- **Cerrar el registro público**: deshabilitar signup en el dashboard de Supabase y en `supabase/config.toml` (`enable_signup = false`), borrar `src/app/api/auth/register/route.js` y el formulario de registro del login. Esto elimina de paso dos problemas: el límite de ~2-3 emails/hora del sender por defecto de Supabase (no apto para producción) y la enumeración de emails del route actual (`register/route.js:31-46` distingue "ya existe" de otros errores).
- Si el flujo de confirmación de email queda sin uso, evaluar borrar también `src/app/auth/confirm/route.js`; conservarlo solo si se sigue usando para recuperación de contraseña.
- **Corregir la configuración remota de Auth** según lo auditado en el Hito 0: Site URL al dominio de producción y Redirect URLs con el dominio de producción **y** `http://localhost:3000` para desarrollo. Habilitar el provider Discord con el client ID/secret, y registrar en el portal de developers de Discord la redirect URI de Supabase.
- Verificar que `src/lib/safeNext.js` sigue bloqueando redirects externos en `?redirectTo=` con el dominio nuevo.

## Hito 7 — Deploy: Vercel + Cloudflare

- Proyecto en Vercel apuntando a la rama de producción. Variables de entorno **de Production**: las 4 actuales + `HEALTH_PING_SECRET` + `CHALLONGE_API_KEY_A`/`_B`.
- **`DATA_SOURCE=supabase` hay que setearlo en Vercel**, no alcanza `.env.local`. Decidir explícitamente qué usan los Preview deployments (recomendado: `mock`, para que las previews no toquen datos reales) — Vercel hereda las variables entre entornos si no se separan.
- Confirmar que `SUPABASE_SERVICE_ROLE_KEY` no tiene prefijo `NEXT_PUBLIC_` en ningún entorno.
- Dominio en Cloudflare apuntando a Vercel, **SSL en Full (Strict)** — cualquier otro modo genera loop de redirección con Vercel.
- Recién con la URL de producción viva, completar `vars.SITE_URL` del workflow del Hito 3 y dispararlo con `workflow_dispatch`.

## Hito 8 — Backfill histórico y resolución de identidades

Sin esto el sitio está técnicamente listo pero vacío, y no se puede salir a producción de verdad.

- Importar los torneos de la **cuenta A** (histórica) y los de la **cuenta B** con `/admin/cargar_torneo` (funciona de uno en uno; el flujo masivo llega en el Hito 11). Presupuestar el límite de ~500 requests/mes de Challonge free: 1 request por torneo, más 1 por preview.
- **Resolver la cola de identidades** de los ~50 jugadores en `/admin/identidades`: vincular, crear jugadores, registrar manualmente a los que no tienen cuenta de Challonge, y fusionar las cuentas duplicadas (el escenario de "olvidó su cuenta vieja"). Es la tarea más larga de este hito y es manual por diseño.
- Verificar que `recalcularSnapshots` dejó los rankings coherentes por temporada tras las fusiones.
- **Correr el backup del Hito 4 inmediatamente después.**
- **Recién ahora poner `DATA_SOURCE=supabase`** en Vercel y en `.env.local`, y reiniciar/redeployar (el toggle se evalúa en `src/lib/data/index.js:5` al cargar el módulo, no en runtime).

## Hito 9 — SEO y metadata mínima

- `src/app/layout.js:36-40`: agregar `metadataBase` con el dominio de producción y una `openGraph` con imagen — el sitio se comparte por WhatsApp y Twitter, sin OG image el link sale pelado.
- `metadata` por página en `/torneos`, `/ranking`, `/competidores`, `/reglamento`, y `generateMetadata` en `torneo-resultado/[slug]` con el nombre del torneo.
- `src/app/robots.js` y `src/app/sitemap.js`. El sitemap debe excluir `/admin/*`, `/auth/*`, `/error` y `/no-autorizado`.

---

# FASE B — Admin dashboard completo

## Hito 10 — Shell de admin

- **`src/app/admin/layout.js`** (nuevo): sidebar de 250px según el diseño (logo "TEKKEN PY / PANEL ADMIN", nav con badges, user chip abajo), header sticky con hamburguesa + título de sección + pill de estado, drawer off-canvas bajo 900px. Centraliza el guard que hoy se repite idéntico en `admin/identidades/page.js:5-10` y `admin/cargar_torneo/page.js:5-10`. **El límite de seguridad real sigue siendo `requireAdmin()` en las rutas de API** (`src/lib/apiAuth.js:7-38`); el guard del layout es UX, no defensa.
- **`src/app/admin/page.js`** (nuevo): redirect a `/admin/identidades` (hoy `/admin` da 404).
- El badge de pendientes del sidebar sale de un conteo server-side de `tournament_participants_raw where player_id is null` (service role), no de la ruta `resumen` del cliente.
- Reusar los primitives ya construidos (`RibbonTag`, `Button` en `src/components/`) — no crear variantes nuevas. Leer el diseño con `DesignSync get_file "Admin Dashboard Liga Tekken Paraguay.dc.html"` (proyecto `a8f8a0e5-4dfe-4ac2-8e1b-39351e40cd7a`); los `.dc.html` no están en el repo.
- Mover el contenido de `/admin/cargar_torneo` al modal de `/admin/torneos` (Hito 11) y dejar un redirect permanente desde la ruta vieja.

## Hito 11 — Sección Torneos

- Barra superior: **"Sincronizar nuevos torneos"** (un click, cuenta B) y **"Importar torneo histórico"** (modal con selector A|B + URL + preview + confirmar — el flujo de 2 pasos ya existe en `admin/cargar_torneo/cargarTorneo.js:13,44`, portarlo al modal).
- Tabla: nombre, fecha, badge de cuenta de origen (colores distintos A/B), estado; filtro por cuenta; botón "Reimportar" por fila.
- Detalle de torneo: resumen de resultados + participantes con estado de vinculación (vinculado / pendiente / sin cuenta).
- Nuevas rutas: `GET /api/admin/torneos`, `POST /api/admin/torneos/sincronizar` (usa `listarTorneos('B')`, filtra los ya presentes en `torneos` e importa solo los `state === "complete"`), `POST /api/admin/torneos/[id]/reimportar`.
- **Consumir `src/lib/importarTorneo.js`** (extraído en el Hito 2) — no duplicar la lógica. Preservar tal cual: chequeo de duplicados, rollback por delete, auto-resolución solo por `challonge_id`, `recalcularSnapshots` y los `revalidatePath` de `/ranking`, `/competidores`, `/torneos`.
- Reimportar borra el torneo (cascade limpia participantes y snapshots) y vuelve a importar, luego recalcula la temporada.

## Hito 12 — Sección Jugadores

- `/admin/jugadores`: tabla con búsqueda/filtro (nombre, avatar, torneos jugados, ranking actual), tarjetas apiladas en mobile.
- `/admin/jugadores/[id]`: perfil editable, cuentas de Challonge vinculadas marcando la activa, historial de torneos.
- **Reusar** `GET /api/admin/identidades/jugadores/buscar` y `GET /api/admin/identidades/jugadores/[id]/detalle` — ya existen y ya están detrás de `requireAdmin()`.
- Nuevas rutas: `PATCH /api/admin/jugadores/[id]` (`display_name`, `avatar_url`, `discord_id`) y `PATCH /api/admin/jugadores/[id]/cuenta_activa`. Ojo con el índice único parcial `player_challonge_accounts_un_activa` (`0005:65-67`): cambiar la cuenta activa exige desactivar la anterior en la misma transacción, no dos updates sueltos.
- Registrar los cambios en `identidad_eventos` reusando `src/lib/identidadEventos.js`.

## Hito 13 — Sección Rankings

- Tabla anual: posición, jugador, puntos acumulados, flecha ▲/▼ respecto al torneo anterior. Filtro por año.
- Botón "Recalcular rankings" con modal de confirmación + checkbox "entiendo" (patrón destructivo del diseño).
- Editor de `puntajes_config` (posición → puntos, un solo juego en MVP).
- Nuevas rutas: `POST /api/admin/rankings/recalcular` (**reusar `recalcularSnapshots` / `recalcularSnapshotsPorTorneos` de `src/lib/rankings.js:6,82`**, no reimplementar) y `GET`/`PUT /api/admin/puntajes`.
- **Advertencia obligatoria en la UI del editor de puntajes**: `tournament_participants_raw.puntaje` está desnormalizado a propósito (`0005:88-91`, `0001:61-62`), así que cambiar la configuración **no reescribe la historia** — solo afecta importaciones futuras.

## Hito 14 — Sección Sistema

Solo indicadores reales, sin tarjeta de Discord:
- Último ping exitoso del health check: `select max(created_at) from sistema_eventos where tipo = 'health' and ok`.
- Última importación por cuenta A y B: máximo `created_at` de `torneos` agrupado por `challonge_source_account`.
- Último backup exitoso (Hito 4), si se registra en `sistema_eventos`.
- El pill "SUPABASE OK" del header del shell se alimenta del mismo dato, no del placeholder estático del prototipo.

---

# FASE C — Cierre

## Hito 15 — Corregir la documentación desactualizada

La doc rot es material: hace que cada sesión nueva planifique contra un esquema que ya no existe.

- **`CLAUDE.md:45-108`**: borrar el bloque "Status: this is the TARGET model, not yet implemented" (:47) y la descripción de `usuarios`/`nombres_alternativos` como esquema actual; los 5 escenarios de identidad (:82-88) ya no son ❌/⚠️ — `0005` los implementó. Las referencias `supabaseDb.js:296-352` y `supabaseDb.js:212-214` son falsas (el archivo tiene 187 líneas y no contiene lógica de import). El riesgo de auto-match por nombre en minúsculas (:88) **ya está corregido** en el código actual.
- **`README.md:49-53`**: dice "ejecutar `0001_init.sql` en el SQL Editor" e ignora `0002`–`0008`. Reemplazar por `supabase db push` y documentar `npm test` + el prerrequisito de Docker.
- **`docs/infrastructure.md`**: marcar keep-alive y dual-account como implementados; agregar la sección de backups y restore.
- **`docs/admin-dashboard-brief.md`**: nota indicando que Contenido queda postergado.

---

## Verificación

**Hito 1** (el más crítico — es lo que hoy rompería producción):
- Con `DATA_SOURCE=supabase` y un torneo importado, `npm run dev` y visitar `/torneos`, `/ranking`, `/competidores`, `/torneo-resultado/[id]`. **La cuarta es la que hoy da 404** — es la prueba de que la vista funciona.
- Con el cliente anon: query directa a `tournament_participants_raw` → 0 filas o error de permisos; `torneo_resultados_publicos` → filas resueltas. Un participante pendiente (`player_id is null`) **no** aparece en la página pública.
- Volver a `DATA_SOURCE=mock` y revisitar las 4 páginas: el toggle tiene que seguir siendo reversible.

**Hito 2**: `npm test` en verde desde cero con `supabase start` corriendo, sin intervención manual ni IA. Confirmar que los tests fallan si se rompe a propósito la vista del Hito 1 (si no fallan, no están probando nada).

**Hito 3**: `curl -f http://localhost:3000/api/health` → 200. Con el header `x-health-secret` correcto aparece fila nueva en `sistema_eventos`; sin él, no. `workflow_dispatch` desde GitHub una vez desplegado.

**Hito 4**: correr el workflow a mano, bajar el artifact y **restaurarlo sobre el stack local** (`psql < dump`) verificando que los torneos y jugadores están completos.

**Hito 5**: importar un torneo con cuenta A y confirmar `challonge_source_account = 'A'`; otro con B y confirmar `'B'`.

**Hito 6**: intentar registrarse → debe fallar/no existir. Login con Discord de punta a punta **en el dominio de producción** (es el escenario que la config de localhost rompe). Probar `?redirectTo=https://evil.com` → debe ignorarse.

**Hito 7**: en producción, cargar las 4 páginas públicas; `/admin` anónimo redirige a login; revisar en las devtools que la service role key no aparece en ningún bundle de cliente.

**Hito 8**: el contador de pendientes en `/admin/identidades` llega a 0. Los rankings por temporada cuadran contra los resultados reales de Challonge (chequeo cruzado manual de al menos una temporada).

**Hitos 10-14**: recorrer cada sección como admin; en ventana anónima confirmar que `/admin/*` redirige a login. Cada ruta de API nueva: sin sesión → 401, con sesión no-admin → 403 (`requireAdmin()` ya lo cubre; verificar que las rutas nuevas lo usen). Responsive: sidebar → drawer bajo 900px, tablas → tarjetas en mobile.

**Regresión de identidades** (lo que ya funciona y no debe romperse): con un torneo con participantes pendientes, ejecutar el ciclo vincular → crear jugador → registrar manual → fusionar → deshacer, confirmando después de cada acción que `/ranking` y `/torneo-resultado/[id]` siguen coherentes y que ningún jugador fusionado aparece en páginas públicas.

**Al cierre de cada hito**: `npm run lint`, `npm run build` y `npm test` sin errores.

---

## Notas de secuencia

La Fase A es la ruta crítica y su orden importa: **1 → 2 → 3/4/5 → 6 → 7 → 8 → 9**. Los hitos 3, 4 y 5 son independientes entre sí. El 7 (deploy) necesita el 6 hecho o el login de producción queda roto, y el 8 (backfill) necesita el 5 o no se puede tocar la cuenta A. El flip de `DATA_SOURCE` es lo último de la fase, después del backfill.

La Fase B necesita el Hito 10 primero; los hitos 11-14 son independientes entre sí (el 11 antes que el 12 conviene, porque los datos de torneos alimentan la vista de jugadores). El 11 depende del refactor de `importarTorneo.js` hecho en el Hito 2.

El Hito 15 se puede hacer en cualquier momento, pero conviene no dejarlo para el final: mientras `CLAUDE.md` describa el esquema viejo como actual, cada sesión nueva arranca con contexto equivocado.
