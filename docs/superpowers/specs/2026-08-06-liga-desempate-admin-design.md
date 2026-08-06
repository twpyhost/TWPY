# Rediseño del desempate manual (admin) — Fase de grupos de la Liga

## Contexto

`GrupoDetalle.js` (`/admin/liga/grupo/[numero]`) muestra la tabla en vivo de un grupo con flechas ↑/↓ para que el admin resuelva empates de puntos asignando `orden_desempate`. Ver diseño original en [2026-08-04-liga-fase-de-grupos-design.md](2026-08-04-liga-fase-de-grupos-design.md).

## Problema

Dos bugs reportados y una duda de negocio:

1. **"Se cierra la ventana de desempate al primer click y no se puede revertir ni corregir."** Causa raíz: al mover una fila, `PUT /desempate` asigna `orden_desempate` a **todo** el bloque empatado de una sola vez. Eso hace que `calcularTabla` marque el bloque como `empatado: false` (ver `src/lib/ligaTabla.js:76`), y las flechas ↑/↓ solo se renderizan cuando `fila.empatado` es `true` (`GrupoDetalle.js:237`). Resultado: tras el primer movimiento, las flechas desaparecen y no queda ninguna forma de reabrir o ajustar el orden.
2. **"Recarga la página."** No es una recarga real: cada click dispara un PUT y luego `cargar()`, que pone `loading = true` y sustituye toda la tabla por "Cargando…" (`GrupoDetalle.js:141`). Se percibe como un parpadeo/recarga de pantalla.
3. **"¿Es posible tener puntos empatados?"** Sí, y es esperable: el puntaje (`PTS`) puede quedar empatado en un round-robin. Lo que el sistema no puede permitir es que la **posición final** (de la que depende clasificación/eliminación) quede ambigua — siempre debe resolverse a un orden estricto.

## Objetivo

- El admin puede reordenar libremente un bloque empatado con las flechas, sin que cada click dispare un guardado ni un parpadeo de pantalla.
- El admin puede corregir el orden de un bloque en cualquier momento, incluso después de haberlo resuelto — no solo mientras está "pendiente".
- El admin decide explícitamente cuándo persistir el orden (botón "Confirmar desempate"), con la opción de descartar cambios locales antes de confirmar.
- No se puede cerrar un grupo mientras quede algún bloque de puntos empatado sin resolver.

## No-objetivos

- No se permite dejar la clasificación final con posiciones ambiguas (empate sin resolver) — descartado explícitamente por decisión de negocio.
- No se cambia el contrato de la API `PUT /api/admin/liga/grupos/[numero]/desempate` (sigue recibiendo `{ orden: [participanteId, …] }` para un bloque).
- No se cambia el esquema de datos (`orden_desempate` sigue siendo un `int` nullable por participante, ver `0012_liga.sql`).
- No se agrega una pantalla ni un patrón visual nuevo — se reutilizan los componentes ya existentes (`Button`, el mismo layout de tabla).

## Diseño

### 1. Agrupar por puntos, no por "empatado"

`bloquesEmpatados(tabla)` se reemplaza por `bloquesPorPuntos(tabla)`: agrupa filas contiguas que comparten el mismo `puntos`, sin filtrar por `fila.empatado`, y descarta bloques de tamaño 1. Como la tabla ya viene ordenada por puntos descendente, esto es un simple recorrido lineal.

Esto separa dos conceptos que hoy están mezclados:

- **`empatado`** (ya existe en `calcularTabla`): el bloque tiene *al menos un* integrante sin `orden_desempate` → pendiente de resolver → se resalta con el fondo de advertencia actual (`bg-warning/[.06]`).
- **bloque "desempatable"** (nuevo, solo en el frontend): cualquier bloque de 2+ filas con el mismo puntaje, resuelto o no → siempre muestra las flechas ↑/↓.

### 2. Estado local de borrador (draft) por bloque

Hoy, cada click en ↑/↓ llama a `moverEnBloque`, que hace PUT inmediatamente. Pasa a:

- Cada bloque (identificado por el conjunto de `participanteId` que lo componen, no por índice — para no romper si la forma de la tabla cambia entre refrescos) tiene un **orden local en memoria** (`ordenDraft: Map<bloqueKey, participanteId[]>`).
- Click en ↑/↓: si el bloque no tiene draft todavía, se inicializa con el orden actual (derivado del servidor); luego se reordena el draft. **No** dispara ningún fetch.
- El render de cada bloque usa el draft si existe; si no, usa el orden que vino del servidor.
- Un bloque "tiene cambios pendientes" si su draft existe y difiere del orden del servidor.

### 3. Confirmar / Descartar (por bloque)

Cuando un bloque tiene cambios pendientes, aparecen junto a él (o en una fila resumen debajo del bloque en la tabla) dos botones:

- **"Confirmar desempate"**: hace `PUT /desempate` con el orden del draft para ese bloque. En éxito: limpia el draft de ese bloque (el servidor ya coincide), muestra `toast.success("Desempate guardado")`, y dispara un refresco de datos **en segundo plano** (sin loading skeleton — ver punto 4). En error: `toast.error(...)`, el draft se conserva para que el admin pueda reintentar.
- **"Descartar cambios"**: borra el draft de ese bloque; vuelve a mostrar el orden del servidor.

Los bloques son independientes entre sí: confirmar o descartar uno no afecta a otros bloques empatados en otro rango de puntos.

### 4. Sin parpadeo de pantalla

`cargar()` se divide en dos modos:

- **Carga inicial** (al montar el componente): comportamiento actual, `setLoading(true)` + skeleton "Cargando…".
- **Refresco silencioso** (tras confirmar un desempate, o tras cargar un resultado de partido): vuelve a pedir `/api/admin/liga/grupos/[numero]` pero sin tocar `loading` — la tabla nunca desaparece de pantalla. Esto también aplica a `cargarGanador` y `cambiarCerrado`, que hoy también pasan por el mismo `cargar()` con skeleton completo.

### 5. Bloquear el cierre del grupo con empates pendientes

El botón "CERRAR GRUPO" se deshabilita (con un mensaje visible, ej. tooltip o texto debajo: "Resolvé los empates pendientes antes de cerrar el grupo") mientras `grupo.tabla.some(f => f.empatado)` sea verdadero. Esto es solo una validación de UI en el modal/botón existente — no requiere cambios en la API de cierre, aunque conviene replicar la misma validación server-side en `PUT /api/admin/liga/grupos/[numero]/cerrar` para no depender únicamente del cliente.

### 6. Qué pasa con `orden_desempate` cuando cambian los resultados

Sin cambios respecto al comportamiento actual de `calcularTabla`: el valor se conserva siempre. Si un bloque deja de estar empatado (porque un resultado cambió los puntos), el `orden_desempate` guardado simplemente se ignora al ordenar (ya no hay bloque de tamaño >1 con ese puntaje). Si aparecen nuevos jugadores en ese mismo puntaje, el bloque vuelve a marcarse `empatado: true` y hay que resolverlo de nuevo (los que ya tenían `orden_desempate` de una resolución anterior no alcanzan por sí solos para resolver un bloque con miembros nuevos sin asignar).

## Cambios de archivos (referencia para el plan de implementación)

- `src/app/admin/liga/grupo/[numero]/GrupoDetalle.js`: la mayor parte del trabajo — estado de drafts, `bloquesPorPuntos`, botones Confirmar/Descartar, separar carga inicial vs. refresco silencioso, deshabilitar "CERRAR GRUPO" con empates pendientes.
- `src/app/api/admin/liga/grupos/[numero]/cerrar/route.js`: validación server-side que rechace el cierre si queda algún bloque `empatado`.
- `tests/unit/ligaTabla.test.js`: sin cambios de comportamiento en `calcularTabla`, pero puede sumar un test para el nuevo agrupamiento por puntos si esa función se extrae a `ligaTabla.js` en vez de vivir solo en el componente.
- Puede convenir un test de integración nuevo para la validación de cierre con empates pendientes.

## Testing

- Unit: si `bloquesPorPuntos` se extrae como función pura (recomendado, para poder testearla sin renderizar el componente), cubrir: bloque de 2, bloque de 3+, múltiples bloques simultáneos a distinto puntaje, ningún bloque (tabla sin empates).
- Integración: `PUT /cerrar` debe devolver error si hay `empatado: true` en el grupo.
- Manual/E2E: flujo completo — mover flechas varias veces sin guardar, descartar, volver a mover, confirmar, verificar toast y que el orden persiste tras recargar la página real (F5).
