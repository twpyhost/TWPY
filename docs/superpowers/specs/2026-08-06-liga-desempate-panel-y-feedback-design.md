# Desempate manual: panel de confirmación fuera de la tabla + feedback de movimiento

## Contexto

El rediseño del desempate manual (ver [2026-08-06-liga-desempate-admin-design.md](2026-08-06-liga-desempate-admin-design.md), ya implementado) puso los botones "Confirmar"/"Descartar" dentro de la celda "Desempate" de la última fila de cada bloque empatado, en `src/app/admin/liga/grupo/[numero]/GrupoDetalle.js`. En uso real esto generó confusión: los botones aparecen y desaparecen dentro de una fila de la tabla en vivo, mezclados con las flechas ↑/↓ y con las demás columnas de estadísticas.

Además, mover una fila con ↑/↓ no da ninguna señal visual de que el click surtió efecto más allá del cambio de orden en sí — en una tabla con varias filas del mismo puntaje, ese cambio de orden puede no saltar a la vista de inmediato.

## Objetivo

- Sacar "Confirmar"/"Descartar" de dentro de la tabla, a un panel aparte debajo de ella.
- Dar una señal visual clara e inmediata cuando un click en ↑/↓ registra un movimiento.

## No-objetivos

- No se toca la lógica de negocio ya implementada: `bloquesPorPuntos`, el borrador local (`ordenDraft`), `hayCambiosPendientes`, `confirmarBloque`, `descartarBloque`, ni las validaciones de cierre de grupo. Este cambio es puramente de presentación (dónde se muestran los controles y qué feedback visual acompaña un movimiento).
- No se agrega ninguna librería de animación. El feedback de movimiento es un destello de color con una transición CSS nativa, no un reordenamiento animado (FLIP) de las filas.
- Las flechas ↑/↓ no cambian de lugar — siguen en la columna "Desempate" de la tabla, tal como están hoy.

## Diseño

### 1. Panel de bloques pendientes, debajo de la tabla

Se elimina el bloque JSX que hoy renderiza "Confirmar"/"Descartar" dentro de la celda de la última fila de cada bloque (`GrupoDetalle.js:336-368` en el estado actual). En su lugar, inmediatamente después del párrafo "Clasifican los primeros... Las filas resaltadas tienen un empate sin desempatar." (dentro de la misma columna izquierda del grid, no en una sección nueva), se agrega un panel que itera sobre `bloques` y renderiza una fila por cada bloque que necesita acción — mismo criterio que hoy: `fila.empatado` (tomado de la primera fila visible del bloque) es `true`, o `hayCambiosPendientes(bloque)` es `true`. Si ningún bloque cumple ninguna de las dos condiciones, el panel no se renderiza (ni siquiera un contenedor vacío).

Cada fila del panel muestra:
- Un texto identificando el bloque por posición y nombres, ej. `Puestos 3–5: Fulano, Mengano, Zutano` (posiciones y nombres calculados igual que en la tabla: `bloque.inicio + 1` a `bloque.fin`, nombres desde `filasVisibles.slice(bloque.inicio, bloque.fin)`).
- El botón **Confirmar** (siempre presente en esa fila del panel, ya que la fila solo existe si hace falta acción).
- El botón **Descartar**, solo si `hayCambiosPendientes(bloque)` es `true` (nada que descartar si el bloque está pendiente pero nunca se tocó).

Estilo: mismo lenguaje visual que ya existe en la pantalla (borde + fondo tenue tipo `border border-white/10 bg-white/[.03]`, como el bloque de "FECHAS"), una fila por bloque, sin necesidad de un componente nuevo fuera de este archivo.

### 2. Destello al mover una fila

Se agrega un estado nuevo, `destacados` (`Set<participanteId>`), y un `useRef` (`destacadosTimeouts`) que guarda el `timeout` pendiente de cada `participanteId` para poder cancelarlo si se vuelve a mover la misma fila antes de que termine de desvanecerse.

En `moverEnDraft`, antes de aplicar el swap, se conocen los dos IDs involucrados (`actual[posLocal]` y `actual[otroLocal]`). Tras hacer el swap del borrador, ambos IDs se agregan a `destacados`; si alguno ya tenía un timeout pendiente de una animación anterior, se cancela primero. Se programa un `setTimeout` de 500ms que remueve ambos IDs de `destacados` y limpia la referencia guardada.

En el render de cada `<tr>`, si `destacados.has(fila.participanteId)` es `true`, se aplica una clase de fondo distinta (ej. `bg-primary-500/20`) en lugar de la que le tocaría normalmente (transparente, o `bg-warning/[.06]` si sigue empatada); la `<tr>` ya tiene (o pasa a tener) `transition-colors duration-500` para que, al remover la clase de destaque 500ms después, el fondo se desvanezca de vuelta a su color normal en lugar de cortar abruptamente.

## Archivos afectados

- `src/app/admin/liga/grupo/[numero]/GrupoDetalle.js` — único archivo que cambia. Se agrega el estado `destacados`/`destacadosTimeouts`, se ajusta `moverEnDraft`, se quita el JSX de Confirmar/Descartar de dentro de la tabla, y se agrega el panel nuevo debajo de ella.

## Testing

- E2E (`tests/e2e/admin/ligaDesempate.spec.js`): los tests existentes que hacen `page.getByRole("button", { name: "Confirmar" })` siguen funcionando igual (el botón sigue existiendo, solo cambia su ubicación en el DOM — ningún test actual depende de que esté dentro de la tabla). Se revisa que ninguno de los tests existentes busque el botón con un selector que asuma que está dentro de una `<tr>`.
- Se agrega un test nuevo que verifique que el panel de "pendientes" no está presente cuando no hay ningún bloque que lo requiera (por ejemplo, después de confirmar el único bloque de un grupo, el panel desaparece del DOM).
- El destello es un detalle puramente visual sin estado persistente ni llamada de red — no amerita un test e2e dedicado (no hay una forma confiable de aserting sobre una transición CSS temporizada sin volver el test frágil); se verifica manualmente.
