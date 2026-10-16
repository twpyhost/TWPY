# Estado para retomar el desarrollo

Actualizado: 2026-10-16. Release preparado en `feat/community-growth`, sobre `dfbba15`.
Este registro complementa `TODO.todo` y `tech-debt-backlog.md`.

## Roadmap de crecimiento — ejecución de fase 1

- Se creó `feat/community-growth` en `.worktrees/community-growth`, desde
  `dfbba15`, copiando los cambios locales previos sin descartarlos. El checkout
  original sigue intacto. Los commits de la fase incluyen únicamente sus
  archivos; los cambios anteriores de Liga no se mezclan en ellos.
- Perfiles públicos canónicos, main/secondaries declarados, temporadas,
  resultados locales, títulos/podios, avatar de reserva y enlaces desde
  directorio/ranking/resultados/Liga. Los IDs absorbidos redirigen con 308;
  los inexistentes devuelven 404 antes del streaming.
- Editor exclusivo de admin, Tekken IDs privados por defecto y fusión
  transaccional con cuentas/personajes/resultados/vínculos de Liga/auditoría.
  Se conserva el main base y se reportan colisiones de torneos. No se cambió
  la fórmula de ranking ni el puntaje de Liga.
- Migración aditiva generada localmente:
  `20261016212742_public_player_profiles.sql`. Reconstrucción de todas las
  migraciones y restore del backup anterior verificados en dos bases
  temporales; fixture de guardado/fusión y ACL aprobado en ambas. Sin reset
  de desarrollo. Advisors: únicamente los hallazgos preexistentes.
- Baseline aprobado: 203/203. Cierre local de fase 1: **223/223**, lint y build
  correctos después de la revisión independiente y su corrección. Se
  inspeccionaron capturas a 390px/1440px; se verificaron
  nombre largo, avatar ausente, teclado y movimiento reducido.
- La revisión encontró una diferencia de corte entre perfiles y ranking al
  haber dos torneos el mismo día: se reprodujo y corrigió ordenando también
  por ID. Regresión RED→GREEN y suite completa aprobada. La precisión de IDs
  fuera de Number seguro en productores legacy queda documentada como Minor
  no bloqueante en el backlog.
- EWGF diferido por falta de clave/respuesta libre verificada; no bloquea
  los perfiles locales. DesignSync no está disponible en esta sesión; se
  usaron `design/README.md` y los componentes reales del proyecto.
- Supabase MCP/CLI ya están autenticados para `hjpgsklqlellatijahbg`.
  Auditoría nueva: 223/223, lint/build correctos; producción no tiene
  resultados incompletos de Liga. Backup real de esquema/datos obtenido por
  CLI y restaurado localmente con conteos coincidentes; ambas migraciones
  y fixture de perfiles/ACL aprobados sobre esa restauración.
- Bloqueo de publicación: el backup programado no tiene `SUPABASE_DB_URL`
  y generaba gzip vacío con éxito aparente. Workflow corregido para rechazar
  conexión ausente, dump fallido o vacío; falta configurar el secret y probar
  el artifact real. No hubo migración remota ni deploy. La fase 2 sigue
  pendiente del release. Runbook: `docs/releases/2026-10-16-public-player-profiles.md`.

## Trabajo retomado y cerrado

- Se conservaron y revisaron los cambios sin commit de la sesión anterior
  sobre fixtures y regresiones de Liga.
- Las peleas sancionadas 0-0 cuentan en el total público y en el progreso del
  panel, sin otorgar victorias, derrotas, matches ni puntos.
- Las pruebas cubren marcadores con ganador A/B, sanciones, quitar sanciones
  y volver a cargar resultados. Re-sembrar conserva los estados cargados.
- El desempate comprueba que recargar sin confirmar descarta el borrador y
  que confirmar sí persiste el orden después de recargar.
- El cleanup del resaltado de filas captura su Map al montar; se cerró el
  aviso de ESLint.
- La migración `20261016171620_liga_resultados_completos.sql` cierra dos huecos
  del CHECK: `jugado` sin ganador y `sancionado` con matches nulos. No modifica
  resultados existentes. Si encuentra datos incompletos, falla para revisión.
- Catálogo y plan de QA actualizados: 117 e2e en 12 suites, 82 unit/integración
  y 4 tareas de preparación/limpieza. Se cerraron A1 y A5 del inventario de
  inconsistencias y se corrigieron referencias antiguas en `TODO.todo`.

## Verificación

- Lint sin avisos y build de Next exitosos.
- Suite completa inicial: 203/203.
- Regresiones del CHECK: fallaron contra la constraint anterior; 6/6 pruebas
  de integración de Liga pasaron después de corregirla.
- Control de mutación de contadores: sin los fixes fallan TC-LIGA-007 y
  TC-LIGA-ADMIN-004; los archivos se restauraron byte a byte.
- La nueva migración se aplicó en local y se reconstruyó junto con todas las
  anteriores en una base temporal, sin resetear la base de desarrollo.
- Dos corridas completas consecutivas con la nueva constraint: 203/203 en
  ambas (2,6 minutos cada una), incluida la preparación y limpieza de fixtures.
- Revisión independiente del código, pruebas y migración: sin defectos nuevos.

## Pendientes concretos

1. Resolver el secret del backup y publicar el árbol verificado de fase 1 con
   el prerrequisito de Liga (commit separado `e5135f5`) y fix de backup
   (`7e5352a`). Usar el historial remoto real en un workdir aislado para
   aplicar solo las dos migraciones nuevas; el dry run ya coincide.
2. Retomar las correcciones de navegación del backlog del 2026-08-02:
   evitar transiciones al pulsar la temporada activa, señalización accesible
   y prueba de la etiqueta de carga de Todos.
3. Revisar los advisors preexistentes: la vista pública usa privilegios del
   owner deliberadamente y `set_updated_at` tiene search_path mutable. El
   detalle y las protecciones actuales están en el backlog del 2026-10-16.
4. Revisar la diferencia de versiones de la base temporal del CLI (15) y el
   stack local (17), que agrega ruido de GRANT MAINTAIN a los diffs. La nueva
   migración contiene solo el CHECK de Liga y se verificó en ambas versiones.
5. Discord OAuth: habilitar el provider con sus credenciales/redirects y
   asignar el rol al usuario OAuth. Falta configuración externa; el código
   valida acceso al panel mediante `roles_panel()`.
6. Redes sociales: faltan las URLs reales para reponer sus enlaces.
7. Perfiles públicos implementados localmente; release bloqueado por backup.
   Noticias/eventos corresponden a fase 2, todavía sin iniciar.

## Entorno al terminar

- Docker Desktop y Supabase local se iniciaron para la validación.
- Playwright inicia su propio Next en el puerto 3000 y lo cierra al terminar;
  `NODE_ENV=test` y `reuseExistingServer: false` siguen activos.
- `.codex/` y `AGENTS.md` ya estaban sin seguimiento al empezar; se dejaron
  intactos. No incluirlos por accidente al preparar un commit.
