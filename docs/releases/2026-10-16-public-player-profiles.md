# Fase 1 — perfiles públicos de jugadores

Implementación local en `feat/community-growth`, dentro de
`.worktrees/community-growth`. La fase todavía no está publicada.

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

## Publicación pendiente

El roadmap requiere **publicar y verificar una fase antes de iniciar la
siguiente**. La implementación de las fases 2–7 permanece pendiente de este
gate; no se marcaron como publicadas.

1. Configurar `SUPABASE_DB_URL` en GitHub Actions y ejecutar el workflow
   corregido desde la rama del release. Descargar, descomprimir y restaurar
   su artifact antes de considerar resuelto el bloqueo de backup.
2. Repetir el chequeo de resultados incompletos de Liga inmediatamente antes
   del push de migraciones; no inventar resultados ni modificar datos para
   hacer pasar la constraint.
3. Aplicar **solo las dos migraciones pendientes**, en orden, usando el
   workdir aislado ya contrastado con el historial remoto. No ejecutar un
   reset remoto ni reemplazar migraciones históricas. Comprobar conteos,
   RLS/ACL e historial después; repetir advisors y registrar solo diferencias.
4. Publicar la aplicación después del esquema, conservando claves de servicio
   solo en el servidor. No modificar OAuth, DNS, hosting ni facturación para
   esta fase.
5. Comprobar como visitante un perfil conocido, uno sin resultados, un ID
   absorbido y uno inexistente, enlaces desde las cuatro fuentes, sitemap y
   la ausencia de IDs privados. Comprobar acceso del admin y denegación del
   rol `liga` con una lectura. Las pruebas de escritura siguen siendo locales.
6. Registrar el release antes de comenzar la fase 2. Para rollback de la app,
   las tablas nuevas pueden permanecer: son aditivas. No borrar metadatos ni
   intentar deshacer fusiones mediante DDL.

No se hizo push, deploy, cambio de dominio, migración remota ni activación de
servicios externos.
