# Fase 1 — perfiles públicos de jugadores

**Publicada el 2026-10-16** en https://twpy.vercel.app. Perfiles de ejemplo:
[con resultados](https://twpy.vercel.app/competidores/1) y
[sin resultados](https://twpy.vercel.app/competidores/59).
El código se integró mediante [PR #12](https://github.com/twpyhost/TWPY/pull/12),
merge `1e24c0c073826867a50fb1e59fa89f87b9a8457a`. El checkout original con
cambios locales se conserva; el trabajo está en `.worktrees/community-growth`.

## Comportamiento

- `/competidores/[id]` muestra la persona canónica, main y secundarios
  declarados, posición/puntos anuales, participaciones, títulos y podios de
  la temporada elegida. Sin resultados sigue siendo un perfil válido.
- El último corte se elige por fecha e ID de torneo, tanto en perfiles como
  en ranking/contador. Esto resuelve la inconsistencia de dos torneos del
  mismo día sin cambiar la fórmula ni reescribir snapshots en lecturas.
- Competidores, ranking, resultados de torneo y participantes vinculados de
  Liga enlazan al perfil. Una identidad absorbida redirige con HTTP 308;
  una desconocida responde HTTP 404 antes de iniciar el streaming.
- Solo `admin` edita personajes/cuentas desde el detalle de jugador.
  Cada Tekken ID es privado por defecto; publicar uno requiere marcarlo.
  No se buscan ni vinculan personas por nombre.
- La fusión conserva el main base, incorpora otros personajes como
  secundarios y transfiere las cuentas conservando sus IDs y privacidad.
  Cuentas de Challonge, resultados sin conflicto, vínculos de Liga y auditoría
  se escriben en una única transacción. Los resultados que colisionan en un
  torneo quedan reportados para revisión manual. El recálculo sigue usando
  `rankings.js` y conserva su advertencia si falla después de la fusión.
- Los DTO públicos seleccionan campos explícitos; no incluyen Discord,
  usuarios de Auth ni datos de la cola. Los bigint nuevos se leen como texto
  para conservar precisión. Los fixtures mock mantienen sus IDs simbólicos
  existentes y soportan la misma interfaz.
- EWGF queda diferido: no hay clave configurada ni respuesta autenticada
  verificada. No se crearon cachés ficticias, llamadas por visita ni jobs sin
  credenciales. Los perfiles locales funcionan completos sin EWGF.

## Validación local

Se preservó el trabajo previo de Liga y sus pruebas. Baseline: lint y build
correctos, 203 pruebas aprobadas. Cierre local: **223/223**, lint y build
correctos después de resolver el hallazgo importante de la revisión. La ampliación prueba identidad, privacidad,
colisiones, rollback, bigint, navegación pública, edición persistente y el rol
`liga`. Los resultados finales se registran en `docs/estado-desarrollo.md`.

Se reconstruyeron todas las migraciones en una base temporal PostgreSQL 17;
en otra se restauró el backup anterior y se aplicó la migración nueva. Un
fixture ejecutó guardado y fusión, comprobando main, secundarios, privacidad,
IDs estables y ACL de las funciones en ambas bases. No se reseteó desarrollo.

Los advisors solo reportaron los dos hallazgos ya documentados: la vista
`torneo_resultados_publicos` y `set_updated_at`. El diff generado omitía
revocar el EXECUTE predeterminado de PUBLIC: se agregaron REVOKE explícitos,
la transacción y el permiso de la secuencia; la reconstrucción comprueba
denegación a `anon`/`authenticated` y acceso de `service_role`.

UI contrastada con `design/README.md` y los componentes existentes, con
inspección a 390px y 1440px. DesignSync no está disponible en las herramientas
de esta sesión; no se afirma comparación visual con los prototipos live.

La revisión independiente identificó y se corrigió el selector de corte para
torneos del mismo día, con regresión RED→GREEN. El seguimiento no bloqueante
de bigint en productores legacy de enlaces y auditoría queda en
`docs/tech-debt-backlog.md`; el DTO nuevo sí conserva precisión. Los efectos
de colisiones de resultados conservan la lógica existente y requieren revisión
manual, como indica el panel. No se implementó paginación para historiales que
algún día superen las 1.000 filas del límite actual de la API; no se detectó un
jugador afectado en el alcance actual.

## Auditoría de release — 2026-10-16

El acceso MCP está autenticado y el CLI puede leer producción. La revisión
actual repitió `npm test` (**223/223**), lint y build correctamente. El chequeo
remoto encontró **0 resultados incompletos** de Liga; los conteos eran 77
jugadores, 18 torneos, 307 resultados raw y 546 snapshots.

Se encontró un bloqueo real en los backups: el workflow
[38977300405](https://github.com/twpyhost/TWPY/actions/runs/38977300405)
reportó éxito aunque su gzip descomprime a cero bytes. No existe el secret
`SUPABASE_DB_URL`; `pg_dump` falló y el pipeline sin `pipefail` ocultó el error.
No tratar los artifacts anteriores como backups válidos sin inspeccionarlos.

El workflow corregido exige la conexión, detiene el dump fallido o vacío,
valida gzip y registra éxito solo después de subir el artifact. Una prueba
aislada reprodujo los tres falsos positivos y confirmó su rechazo tras el
fix; un dump válido sigue aceptándose. Se solicitó configurar el secret en
GitHub Actions con la conexión Session pooler de producción, puerto 5432,
sin compartir credenciales en el chat.

Mientras tanto se obtuvo un backup real con el CLI autenticado (`db dump`
de esquema público y datos por separado). Se restauró en la base local
temporal `twpy_phase1_release_20261016`; coincidieron todos los conteos y
pasaron ambas migraciones pendientes y el fixture transaccional de
perfiles/ACL. No se reseteó la base de desarrollo. Los archivos privados y
logs están en el directorio ignorado `.superpowers/sdd/2026-10-16-community-growth-roadmap/`.

El historial remoto usa timestamps para algunas migraciones cuyos nombres
locales son `0005`–`0014`. Un `db push` directo se niega correctamente.
Se preparó un directorio aislado de despliegue con `migration fetch` del
historial real y solo las dos migraciones nuevas copiadas sin cambios. Su
`db push --dry-run` lista exactamente:

1. `20261016171620_liga_resultados_completos.sql`
2. `20261016212742_public_player_profiles.sql`

No marcar versiones históricas como revertidas ni renombrar los archivos
aplicados para forzar el push. Para reproducir, crear otro workdir de
Supabase, enlazar `hjpgsklqlellatijahbg`, hacer `migration fetch` y copiar
únicamente los dos archivos pendientes antes del dry run. Las versiones y
el SQL remoto quedan intactos.

Los cambios previos de Liga y sus pruebas/documentación se conservaron en
un commit separado (`e5135f5`), para que el árbol publicado corresponda a la
suite validada. El fix del backup está en `7e5352a`. El checkout original
permanece intacto.

La rama está subida y el [PR #12](https://github.com/twpyhost/TWPY/pull/12)
queda en draft hasta resolver el gate. El build de
[Vercel Preview](https://vercel.com/twpy/twpy/BrqBPaak6vVyVyccxdjEQADTWmmU)
pasó; esto no sustituye el smoke test de perfiles contra el esquema publicado.
El workflow corregido se ejecutó realmente desde esa rama:
[38978079976](https://github.com/twpyhost/TWPY/actions/runs/38978079976)
falló correctamente por `SUPABASE_DB_URL` ausente, no subió un artifact vacío
y registró el fallo en Sistema. El keep-alive diario existente sigue intacto
y su ejecución de producción del 2026-10-16 fue exitosa.

## Cierre de publicación — 2026-10-16

- El usuario configuró `SUPABASE_DB_URL` en el environment **Production** de
  GitHub Actions y renovó la contraseña Postgres. El job declara ese
  environment; los archivos `.env.local`/`.env.prod.local` usan API keys y no
  necesitan cambiar por este reset. La web y `/api/health` siguieron sanos.
  Herramientas externas con conexiones Postgres deben actualizar su contraseña.
- El [backup previo 38980982423](https://github.com/twpyhost/TWPY/actions/runs/38980982423)
  produjo SQL real y se restauró antes de migrar, con ambas migraciones y
  fixture de perfiles/ACL aprobados. Se volvió a comprobar cero resultados
  incompletos de Liga. Se aplicaron exactamente `20261016171620` y
  `20261016212742`, conservando versiones e historial anteriores.
- Después de migrar, producción conserva 77 jugadores, 18 torneos, 307
  resultados raw y 546 snapshots. Las tablas nuevas tienen RLS; anon y
  authenticated no pueden escribir ni ejecutar los dos RPC internos.
  Service role conserva EXECUTE; ambas funciones son SECURITY INVOKER.
- Vercel publicó el merge de PR #12. Smoke con navegador anónimo: navegación
  desde competidores (79 enlaces), ranking 2026 (38), resultados del torneo
  18604240 (30) y Liga (35); perfiles con/sin resultados 200; identidad 19
  redirige con 308 a 27 conservando la temporada; ID desconocido 404; sitemap
  contiene los perfiles. API admin anónima 401 y panel redirige a login.
  Ningún error JavaScript ni campos privados en el HTML inspeccionado.
  Capturas reales a 390px/1440px revisadas después de completar la animación.
- Las pruebas de escritura, guardado de admin y denegación del rol `liga`
  permanecieron locales (223/223). No se crearon cuentas ni metadatos de prueba
  en producción. No se dispone de una sesión admin/`liga` real en el navegador
  de QA; la revisión remota de privilegios y el control anónimo sí se ejecutaron.
- El backup posterior detectó que `--no-privileges` omitía los REVOKE/GRANT:
  un restore dejaba EXECUTE predeterminado de PUBLIC en los RPC. Se reprodujo
  el fallo y se retiró ese flag; **la base de producción conservó sus ACL
  correctas durante toda la prueba**. El [backup 38981464176](https://github.com/twpyhost/TWPY/actions/runs/38981464176)
  incluye ACL, se restauró con conteos coincidentes y fixture de RPC/fusión
  aprobado. SQL: 208.764 caracteres; SHA-256
  `f7ee7d7a07e8c0496ef21fb14331702573187780e9ed483abd94e124b3244c25`.
  En la copia de restore se excluyeron únicamente 12 sentencias de defaults
  del rol gestionado `supabase_admin`, que `postgres` no puede alterar.
  Se conservó el dump original y todos los GRANT/REVOKE de objetos. Procedimiento
  reproducible en `docs/infrastructure.md`.
- Advisors: siguen los hallazgos preexistentes. La detección de tablas
  descubribles en GraphQL pasa de 17 a 19 por las dos proyecciones públicas
  nuevas; ambas mantienen políticas de lectura y RLS, incluidas cuentas
  publicadas explícitamente. No es una nueva exposición de filas privadas.
  [Referencia del advisor](https://supabase.com/docs/guides/database/database-linter?lint=0026_pg_graphql_anon_table_exposed).

Los backups/artifacts, hashes, capturas y `production-smoke.json` se conservan
en el workspace ignorado de este plan. El keep-alive diario continúa intacto.
No se modificaron OAuth, DNS, hosting ni facturación. EWGF continúa diferido
según el plan; fases 2–7 no se iniciaron.

Para rollback de la app, las tablas aditivas pueden permanecer. No borrar
metadatos ni intentar deshacer fusiones mediante DDL.
