# Fase 1 — perfiles públicos de jugadores

Implementación local en `feat/community-growth`, dentro de
`.worktrees/community-growth`. La fase todavía no está publicada.

## Comportamiento

- `/competidores/[id]` muestra la persona canónica, main y secundarios
  declarados, posición/puntos anuales, participaciones, títulos y podios de
  la temporada elegida. Sin resultados sigue siendo un perfil válido.
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
correctos, 203 pruebas aprobadas. La ampliación prueba identidad, privacidad,
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

## Publicación pendiente

El roadmap requiere **publicar y verificar una fase antes de iniciar la
siguiente**. La implementación de las fases 2–7 permanece pendiente de este
gate; no se marcaron como publicadas.

1. Confirmar el proyecto de producción y obtener acceso de Supabase. El
   proyecto configurado en `.env.prod.local` es `hjpgsklqlellatijahbg`; el
   conector rechazó tanto su lectura como la consulta de migraciones. No se
   pudo comprobar el estado remoto ni se aplicó SQL remoto.
2. Revisar y conservar los cambios previos de Liga. Comprobar que no haya
   resultados incompletos antes de aplicar su migración pendiente
   `20261016171620_liga_resultados_completos.sql`, según el registro anterior.
3. Obtener y verificar el backup remoto. Revisar el historial real antes de
   aplicar **solo las migraciones pendientes**, en orden; la nueva de perfiles
   es `20261016212742_public_player_profiles.sql`. No ejecutar un reset remoto
   ni reemplazar migraciones históricas.
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
