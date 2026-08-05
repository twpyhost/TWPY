# Sistema de Liga — Fase de grupos controlada desde la web

## Contexto

La comunidad organiza la **Liga Invitacional · Tekken Warriors Paraguay**: 5 grupos de 7 jugadores
(35 competidores, 105 peleas) que se juega en 12 fechas, domingos 09/08/2026 → 25/10/2026 a las
17:00. El fixture ya está armado y vive en `Liga_Tekken_Paraguay_Calendario.xlsx` (raíz del repo).

Hoy no hay nada en el sitio para esto: el archivo es una planilla suelta y la tabla de posiciones se
llevaría a mano. Hace falta que:

- el admin cargue el resultado de cada pelea desde el panel y la tabla se actualice sola,
- los visitantes (sin login) vean las 5 tablas y el calendario en una página pública,
- quede marcado quién clasifica y quiénes son **los 2 últimos de cada grupo, que quedan eliminados**.

La fase final se sigue corriendo en Challonge y se importa con el flujo de torneos que ya existe —
ese torneo es el que suma al ranking anual. **La fase de grupos no toca el ranking**, es un módulo
independiente. Cero cambios a `ranking_snapshots`, `puntajes_config` ni al importador de Challonge.

**Nota de tiempo:** la primera fecha es el 09/08/2026, a 5 días de la fecha de escritura de este spec
(04/08/2026).

### Decisiones ya tomadas con el usuario

| Tema | Decisión |
|---|---|
| Qué carga el admin | Resultado por pelea — **solo el ganador**, un click |
| Puntos | **1 punto por victoria**, 0 por derrota |
| Empates | **Orden manual** definido por el admin, sin diferencia de sets ni desempate automático |
| Fixture | **Se importa** desde un JSON versionado, generado a partir del xlsx |
| Jugadores | Cola de **vinculación asistida** contra `players`, reusando `src/lib/nameSimilarity.js` |
| Público | Página `/liga` con **las 5 tablas + el calendario completo** |
| Ranking | Liga independiente; solo la fase final (torneo de Challonge) suma al ranking |

### Estado real de los datos (verificado en Supabase)

De los 35 nombres del fixture, solo 3 coinciden exacto con `players.display_name` (Aagony, Bearpy,
Dijeorama). El resto está guardado con el usuario de Challonge (`Wario`→`WARIOTWPY`, `Rox`→`TWPY_ROX`,
`Saiken`→`SaikeNN`, `Joawquer`→`Joaqwer`, …) y ~9 no parecen existir todavía (ADN21, Kurosu, Gotenks,
Pavel, RIM, Roxer, Pat, Mahito la Mujel, Milder). Por eso `liga_participantes.player_id` es
**nullable**: la liga funciona completa sin vincular a nadie; el vínculo solo agrega link al perfil.

## Diseño

### 1. Esquema — migración `supabase/migrations/0012_liga.sql`

Mismo patrón que las migraciones existentes: comentarios en español, RLS con lectura pública y
escritura solo por `service_role`.

```sql
ligas
  id, slug text unique, nombre text, temporada int,
  estado text check (estado in ('planificada','en_curso','finalizada')) default 'planificada',
  created_at, updated_at   -- trigger set_updated_at (ya existe, ver 0004)

liga_fechas               -- las 12 fechas del calendario
  id, liga_id fk, numero int, fecha date, hora time,
  unique (liga_id, numero)

liga_grupos
  id, liga_id fk, numero int, nombre text,
  cupos_clasificados int not null default 5,
  cerrado boolean not null default false,
  unique (liga_id, numero)

liga_participantes
  id, grupo_id fk on delete cascade,
  nombre text not null,                    -- nombre del fixture ("Wario")
  player_id bigint null references players(id) on delete set null,
  orden_desempate int null,                -- lo fija el admin solo si hay empate
  unique (grupo_id, nombre)

liga_partidos
  id, grupo_id fk on delete cascade, fecha_id fk,
  participante_a_id fk liga_participantes,
  participante_b_id fk liga_participantes,
  orden int not null,                      -- Pelea 1 / 2 / 3 dentro de la fecha
  ganador_id fk liga_participantes null,   -- null = pendiente
  cargado_at timestamptz, cargado_by uuid references auth.users(id) on delete set null,
  check (participante_a_id <> participante_b_id),
  check (ganador_id is null or ganador_id in (participante_a_id, participante_b_id)),
  unique (grupo_id, participante_a_id, participante_b_id)
```

- `cargado_at` / `cargado_by` es toda la auditoría que hace falta — **no** se crea una tabla
  `liga_eventos` (el admin es una sola persona; `identidad_eventos` no se toca, su `check` de tipos
  se queda como está).
- **No** hay tabla de descansos: quien descansa en una fecha se deriva (el participante del grupo que
  no aparece en ninguna pelea de esa fecha).
- RLS: `enable row level security` + policy `"lectura publica" ... for select using (true)` en las 5
  tablas. Sin policies de insert/update/delete, igual que el resto del esquema.
- Índices: `liga_partidos (grupo_id)`, `liga_partidos (fecha_id)`, `liga_participantes (grupo_id)`,
  `liga_participantes (player_id)`.

### 2. Fixture: xlsx → JSON versionado

1. Script one-shot de conversión (no queda en el flujo normal): leer
   `Liga_Tekken_Paraguay_Calendario.xlsx` descomprimiéndolo y parseando
   `xl/worksheets/sheet1.xml` (hoja `Calendario`, celdas `inlineStr`). Las hojas `Grupo 1..5` son la
   misma info pivotada — usar `Calendario` como fuente y las de grupo solo para validar.
2. Salida: **`scripts/data/liga-2026-fixture.json`**, commiteado, fuente de verdad del importador:

```json
{
  "slug": "liga-invitacional-2026",
  "nombre": "Liga Invitacional · Tekken Warriors Paraguay",
  "temporada": 2026,
  "fechas": [{ "numero": 1, "fecha": "2026-08-09", "hora": "17:00" }, "… 12 fechas"],
  "grupos": [
    {
      "numero": 1,
      "participantes": ["Wario","Rox","Saiken","Slammers","Jarri","ADN21","Joawquer"],
      "partidos": [{ "fecha": 1, "orden": 1, "a": "Wario", "b": "Rox" }, "… 21 partidos"]
    }
  ]
}
```

3. **`scripts/seed-liga.js`** (patrón de `scripts/seed-datos-prueba.js`, `node --env-file=.env.local`,
   service_role): lee el JSON, hace upsert idempotente por `slug` / `(liga_id, numero)` /
   `(grupo_id, nombre)` y crea los partidos. **Nunca borra resultados ya cargados** — si el partido
   existe, deja `ganador_id` intacto. Agregar script `seed:liga` a `package.json`.
4. Validaciones que el seed debe fallar ruidosamente si no se cumplen: 5 grupos, 7 participantes por
   grupo, 21 partidos por grupo, 6 partidos por participante, 105 partidos totales, 12 fechas.

Composición esperada por grupo (del xlsx, para el test):

| Grupo | Fechas que juega | Jugadores |
|---|---|---|
| 1 | 1,2,4,6,7,8,9 | Wario, Rox, Saiken, Slammers, Jarri, ADN21, Joawquer |
| 2 | 1,3,4,6,8,10,11 | Damian, Kurosu, Yuya, Fate, Overlord, Gotenks, Pavel |
| 3 | 1,3,5,6,8,10,11 | Hosco, Danns, Dijeorama, Tsuki, Ayrlex, RIM, Roxer |
| 4 | 2,3,5,7,9,10,12 | Rushador Cuidadoso, Lightgear, Gonza, Lagann, Aagony, The Last Outlaw, Pat |
| 5 | 2,4,5,7,9,11,12 | Colo, SSnake, Trunks, Bearpy, Okocom, Mahito la Mujel, Milder |

### 3. Lógica de tabla: `src/lib/ligaTabla.js`

Función **pura** (sin Supabase) — es lo que se testea con unit tests, igual que `src/lib/puntajes.js`:

```js
// participantes: [{ id, nombre, player_id, orden_desempate }]
// partidos:      [{ participante_a_id, participante_b_id, ganador_id }]
// opciones:      { cuposClasificados = 5 }
calcularTabla(participantes, partidos, opciones) -> [{
  posicion, participanteId, nombre, playerId,
  pj, g, p, puntos,
  empatado,        // true si comparte puntos con otro y no hay orden_desempate
  estado,          // 'clasificado' | 'eliminado' | 'neutral'
}]
```

Reglas:
- `puntos` = victorias (1 por victoria). `pj` cuenta solo partidos con `ganador_id` no nulo.
- Orden: `puntos` desc → `orden_desempate` asc (los `null` van al final) → `nombre` asc
  (determinista, evita que la tabla salte entre renders).
- `estado`: las primeras `cuposClasificados` (5) posiciones = `clasificado`; **las últimas 2 =
  `eliminado`**; el resto `neutral`.
- `empatado: true` marca los bloques que el admin todavía no desempató → la UI de admin los resalta.

### 4. Capa de datos y rutas de API

**Lectura pública** — nueva función en `src/lib/data/supabaseDb.js` + el equivalente mock en
`src/lib/data/mockDb.js`, re-exportada por `src/lib/data/index.js` y `src/app/utils/db.js`
(el toggle `DATA_SOURCE=mock|supabase` tiene que seguir funcionando):

- `getLiga(slug)` → `{ liga, fechas, grupos: [{ …, participantes, partidos, tabla }] }`, con la tabla
  ya calculada por `calcularTabla`. Una sola pasada de queries (los 105 partidos entran cómodos).

**Rutas admin** — todas con `requireAdmin()` de `src/lib/apiAuth.js` + `getSupabaseAdmin()`, y
`revalidatePath("/liga")` después de escribir (mismo patrón que `src/app/api/admin/puntajes/route.js`):

| Ruta | Método | Qué hace |
|---|---|---|
| `/api/admin/liga` | GET | Resumen: grupos, progreso (`X/21`), pendientes de vincular |
| `/api/admin/liga/grupos/[numero]` | GET | Tabla + fechas + peleas del grupo |
| `/api/admin/liga/partidos/[id]` | PUT | `{ ganadorId }` — carga el ganador; `null` lo deshace |
| `/api/admin/liga/grupos/[numero]/desempate` | PUT | `{ orden: [participanteId…] }` → escribe `orden_desempate` |
| `/api/admin/liga/grupos/[numero]/cerrar` | PUT | `{ cerrado: bool }` — congela el grupo |
| `/api/admin/liga/vinculacion` | GET | Participantes sin `player_id` + sugerencia por `nameSimilarity` |
| `/api/admin/liga/vinculacion` | POST | `{ participanteId, playerId }` o `{ participanteId, crearComo }` |

Validaciones en `PUT /partidos/[id]`: el `ganadorId` debe ser uno de los dos participantes del
partido, y el grupo no puede estar `cerrado`. `POST /vinculacion` con `crearComo` inserta en `players`
(solo `display_name`) reusando lo que ya hace `/api/admin/identidades/registrar_manual`.

### 5. Admin UI

Agregar el item **LIGA** a `NAV_ITEMS` en `src/components/admin/AdminShell.js` (entre Torneos y
Rankings), con badge de participantes sin vincular igual que el de Identidades.

- **`src/app/admin/liga/page.js` + `Liga.js`** — 5 tarjetas de grupo: nombre, progreso `X/21`, líder
  actual, estado (abierto/cerrado) y link al detalle. Banner arriba si hay participantes sin vincular.
- **`src/app/admin/liga/grupo/[numero]/page.js` + `GrupoDetalle.js`** — dos columnas:
  - *Tabla en vivo* con `calcularTabla`; los bloques `empatado` resaltados con controles ↑/↓ que
    guardan `orden_desempate`; las 2 últimas filas marcadas como zona de eliminación.
  - *Fechas* (7 por grupo): cada pelea es un par de botones con los dos nombres; click = ganador,
    click en el ganador actual = deshacer. Optimistic UI + `toast` (`react-hot-toast` ya está).
  - Botón **Cerrar grupo** con `ConfirmModal` (`src/components/ui/ConfirmModal.js`).
- **`src/app/admin/liga/vinculacion/page.js` + `Vinculacion.js`** — cola de los 35 participantes: cada
  fila muestra el nombre del fixture, la sugerencia de `nameSimilarity.js` con su score, botones
  *Confirmar* / *Buscar otro* (reusar `src/app/admin/identidades/BuscadorJugador.js`) / *Crear nuevo*.

### 6. Página pública `/liga`

`src/app/liga/page.js` — Server Component con `export const revalidate = 60`, mismo esqueleto que
`src/app/ranking/page.js` (`HeroSection`, `AnimatedCount`, tipografía `font-display`, `primary-500`).

- **Hero**: título `LIGA`, bajada, y contador de peleas jugadas sobre 105.
- **`TablasGrupos.js`**: las 5 tablas — `#`, jugador (link a `/competidores/[id]` si hay `player_id`,
  texto plano si no), `PJ`, `G`, `P`, `PTS`. Franja de clasificación tras la 5ª posición y las 2
  últimas filas en tono de eliminación. Nota al pie cuando un desempate fue definido a mano.
- **`CalendarioLiga.js`**: las 12 fechas con su día y hora; dentro de cada una, los 3 grupos que
  juegan, sus 3 peleas (ganador resaltado, o *pendiente*) y `Descansa: X`.
- Agregar `{ name: "LIGA", href: "/liga" }` a `src/components/navbar.js` y la ruta a
  `src/app/sitemap.js`.

El **pase visual fino lo hace Claude Design después**: esta versión usa los tokens y componentes del
sistema Tekken existente para que la página sea funcional y coherente desde el día uno, y el rediseño
posterior toca solo estos tres archivos de presentación.

## Fuera de alcance

- La fase final (bracket): se corre en Challonge y entra por el importador de torneos actual.
- Cualquier cambio a `ranking_snapshots`, `puntajes_config` o al cálculo de ranking anual.
- Diferencia de sets / marcadores por pelea, desempates automáticos, y soporte multi-liga en la UI
  (el esquema ya admite otra edición cargando otro JSON, pero no se construye pantalla para eso).

## Testing

- `tests/unit/ligaTabla.test.js` — puntos por victoria, `pj` ignora pendientes, orden por puntos,
  `orden_desempate` rompe el empate, `empatado` se marca cuando falta desempate, top 5 `clasificado`
  y últimos 2 `eliminado`, orden estable con tabla vacía.
- `tests/integration/ligaSeed.test.js` — el seed produce 5 grupos / 35 participantes / 105 partidos /
  6 partidos por participante / 12 fechas, y re-correrlo no borra un ganador ya cargado.
- `tests/e2e/publico/liga.spec.js` — `/liga` muestra los 5 grupos, la zona de eliminación y el
  calendario, sin login.
- `tests/e2e/admin/liga.spec.js` — cargar un ganador actualiza la tabla; un grupo cerrado no acepta
  cambios.
