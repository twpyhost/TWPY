# Admin Dashboard — Tekken Paraguay Community Platform

## Brief general (para Claude Design)

Diseñar el panel de administración de una plataforma comunitaria de **Tekken 8** (Next.js + Supabase + Tailwind). MVP enfocado solo en Tekken 8 — el soporte multi-juego queda para una fase futura, no hace falta diseñar para eso ahora. Estilo: gaming/competitivo pero limpio y funcional, no infantil — panel de esports/torneos, dark mode como default, acentos de color vibrante (rojo/naranja tipo Tekken). Debe sentirse como una herramienta de trabajo para 1-2 admins, no una app consumer.

**Responsive: debe funcionar bien tanto en desktop como en mobile.**

**Navegación principal (sidebar en desktop, colapsa a menú hamburguesa o bottom nav en mobile):**
1. Resolución de identidades
2. Jugadores
3. Torneos
4. Rankings
5. Contenido
6. Sistema

---

## 1. Resolución de identidades (pantalla más usada — prioridad de diseño)

- **Cola de participantes sin vincular**: nombres de usuario de Challonge que aparecieron en un torneo importado y todavía no están asociados a un jugador. Por cada fila: nombre de Challonge, torneo de origen, fecha, y dos acciones — "Vincular a jugador existente" (buscador con autocompletado) o "Crear jugador nuevo". Acciones en la misma fila, sin navegación extra (es la tarea más repetitiva del admin). Contador/badge visible de casos pendientes.

- **Fusionar cuentas de Challonge de un mismo jugador**: caso de alguien que olvidó su cuenta vieja y creó una nueva. Buscador de dos jugadores/cuentas existentes, vista de comparación (desktop: lado a lado / mobile: apilada verticalmente, jugador A arriba, jugador B abajo) mostrando stats, matches y torneos de cada uno. Botón de confirmar fusión con advertencia clara de que reasigna historial completo.

- **Registrar jugador manualmente (sin cuenta de Challonge)**: formulario simple (nombre) para participantes que el admin registra a pedido, sin cuenta propia en Challonge. Estos jugadores no requieren vinculación posterior a menos que después consigan cuenta de Challonge.

- **Log de fusiones/vinculaciones recientes**: quién hizo qué acción y cuándo, con opción de deshacer.

*Nota de diseño: en mobile, considerar restringir la fusión de cuentas (vista comparativa completa) a una versión simplificada, con opción de "ver detalle completo en desktop" si no entra bien en pantalla chica.*

---

## 2. Jugadores

- Tabla con búsqueda/filtro: nombre, avatar, cantidad de torneos jugados, ranking actual. Tarjetas apiladas en mobile.
- Vista de detalle: perfil editable, cuentas de Challonge vinculadas (puede ser más de una, marcando cuál está activa), historial de matches/torneos.

---

## 3. Torneos

**Barra superior de acciones:**
- Botón **"Sincronizar nuevos torneos"** (acción rápida, un click — trae lo último de la cuenta B, la default/actual).
- Botón **"Importar torneo histórico"** (abre modal — ver detalle abajo).

**Modal "Importar torneo histórico":**
- Selector de cuenta de origen de Challonge (A histórica / B actual, seleccionable por si acaso).
- Campo de texto para pegar URL o ID del torneo.
- Botón "Buscar" → preview del torneo encontrado (nombre, fecha, cantidad de participantes) antes de confirmar.
- Botón "Confirmar importación".

**Tabla de torneos:**
- Columnas: nombre, fecha, **badge de cuenta de origen** (A histórica vs B actual, colores distintos), estado de sincronización (importado / pendiente / error).
- Filtro/dropdown para filtrar por cuenta de origen.
- Botón "Reimportar" por torneo individual (casos de error puntual).

**Vista de detalle de torneo:** resumen de resultados, lista de participantes con estado de vinculación (vinculado / pendiente / sin cuenta).

---

## 4. Rankings

- Tabla de ranking anual: posición, jugador, puntos acumulados, flecha de tendencia (▲/▼ respecto al torneo anterior).
- Filtro por año.
- Botón "Recalcular rankings" con confirmación (para forzar recálculo tras una fusión de jugadores).
- Configuración de puntajes por posición: tabla simple "posición → puntos" (un solo juego, sin necesidad de tabla por juego en el MVP).

---

## 5. Contenido

> **Postergada** — fuera del plan de go-live actual (`docs/superpowers/plans/2026-07-29-supabase-go-live-y-admin.md`). El brief de abajo queda como referencia para cuando se retome.

- CRUD simple de noticias/eventos: lista, crear, editar, subir imagen (Supabase Storage), publicar/despublicar.

---

## 6. Sistema

- Panel de estado con indicadores tipo "todo OK" / "atención requerida":
  - Último ping exitoso del health check (Supabase).
  - Estado del bot de Discord.
  - Última importación de Challonge (por cuenta A y B).

---

## Consideraciones generales de UX

- Confirmaciones explícitas para acciones destructivas/irreversibles (fusionar jugadores, recalcular rankings, importar histórico).
- Responsive en todas las pantallas — tablas se adaptan a tarjetas o scroll horizontal en mobile.
- "Resolución de identidades" es la pantalla de mayor prioridad visual — contador claro de pendientes, resolución rápida.

---

## Prompts usados para Claude Design (histórico de iteraciones)

**Prompt 1 — brief inicial:** (ver secciones 1-6 arriba, brief completo tal cual se armó originalmente)

**Prompt 2 — ajuste de importación histórica:**
> Actualizá el diseño de la sección "Torneos" del admin dashboard:
>
> 1. En la barra superior de la tabla, agregá dos botones: **"Sincronizar nuevos torneos"** (acción rápida, un solo click) y **"Importar torneo histórico"** (abre un modal).
>
> 2. El modal de "Importar torneo histórico" debe tener: un selector de cuenta de origen de Challonge (A / B), un campo de texto para pegar la URL o ID del torneo, un botón "Buscar" que muestra un preview del torneo encontrado (nombre, fecha, cantidad de participantes) antes de confirmar, y un botón final de "Confirmar importación".
>
> 3. En la tabla de torneos, cada fila debe mostrar un badge indicando la cuenta de origen (A histórica vs B actual, con colores distintos), y agregá un filtro/dropdown arriba de la tabla para filtrar por cuenta de origen.
