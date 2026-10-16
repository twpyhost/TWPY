# Liga · marcador por set (first-to-3) — diseño

**Fecha:** 2026-08-11
**Estado:** implementado
**Supersede:** decisiones de puntaje y desempate de
`2026-08-04-liga-fase-de-grupos-design.md`

> **Actualización (2026-08-11, posterior a la implementación):** el puntaje
> volvió al criterio clásico — **PTS = FT ganados** (1 punto por set ganado,
> `puntos = g`). Los matches se siguen cargando y mostrando, pero pasaron a ser
> desempate: `puntos` → diferencia de matches → matches ganados (`mg`) →
> `orden_desempate` → nombre. Todo lo demás de este spec (carga del marcador,
> columnas y bloques de empate) sigue vigente. El cuerpo se alineó con esta
> decisión el 2026-10-16. Los resultados ya cargados no se tocaron: solo cambió
> el cálculo, retroactivamente. La migración 0015 agregó luego las sanciones 0-0
> descritas abajo.

---

## Qué cambia y por qué

El spec del 2026-08-04 definió la fase de grupos con el dato mínimo posible:
el admin cargaba **solo el ganador** de cada pelea (un click), la tabla daba
**1 punto por victoria**, y los empates de puntos se resolvían **únicamente a
mano** (flechas ↑/↓ del admin → `orden_desempate`). Su sección "Fuera de
alcance" difería explícitamente *"diferencia de sets / marcadores por pelea,
desempates automáticos"*.

Ese modelo probó dos problemas en uso real:

1. **Pierde información.** Un 3-0 y un 3-2 son resultados muy distintos y la
   tabla los guardaba idénticos.
2. **Genera empates constantes.** En un round-robin de 7 con 1 punto por
   victoria, los empates son la norma, y cada uno bloquea el cierre del grupo
   hasta que el admin lo ordena a mano.

Cada pelea de la liga es un **first-to-3**. Ahora se carga **cuántos matches
ganó cada participante** dentro del set. El ganador suma un punto; el marcador
aporta los criterios automáticos de desempate.

---

## Decisiones

| Tema | Decisión |
|---|---|
| Qué carga el admin | Ganador **+ marcador**: 3-0, 3-1 o 3-2 |
| Puntos (PTS) | **FT (sets) ganados**, un punto por victoria; PTS coincide con G |
| Desempate | **Automático** por diferencia de matches y matches ganados; el orden manual del admin queda como último recurso antes del nombre |
| Formato | Solo first-to-3. Otros formatos (FT2, FT5, walkover) quedan fuera |
| Ranking anual | Sin cambios: la liga sigue siendo independiente de `ranking_snapshots` / `puntajes_config` / el importador de Challonge |

### Ejemplo del criterio vigente

La cantidad de sets ganados tiene prioridad sobre la cantidad de matches:

- **A**: gana 4 sets 3-0 y pierde 2 sets 2-3 → **4 puntos**, 16 matches ganados.
- **B**: gana 5 sets 3-2 y pierde 1 set 0-3 → **5 puntos**, 15 matches ganados.

B queda primero por tener más victorias. La propuesta original de puntuar por
matches habría dejado a A primero; se descartó el 2026-08-11. Las columnas
MATCHES y DIF siguen visibles para explicar los desempates entre jugadores
con la misma cantidad de victorias.

---

## Modelo de datos

Migración `0013_liga_matches_por_set.sql`: dos columnas en `liga_partidos`.

```
matches_a int   -- matches ganados por participante_a
matches_b int   -- matches ganados por participante_b
```

Una `check` constraint (`liga_partidos_marcador_coherente`) mantiene las tres
columnas de resultado sincronizadas: o las tres son `null` (partido
pendiente), o el marcador es un first-to-3 válido (el mayor es exactamente 3,
el menor entre 0 y 2) **y** `ganador_id` apunta al lado que llegó a 3. No hay
forma de guardar un ganador sin marcador ni un 3-3.

Los resultados cargados con el sistema viejo (sin marcador) se **limpiaron**
en la migración 0013: faltaban los datos necesarios para el nuevo desempate.
Se descartó rellenarlos con 3-0 porque inventa datos; eran pocos (fecha 1) y
el admin debía volver a cargarlos.

La migración `0015_liga_resultado_sancionado.sql` reemplaza esa constraint por
`liga_partidos_resultado_coherente` y agrega `resultado_tipo`:

- `pendiente`: ganador y matches nulos.
- `jugado`: ganador y marcador first-to-3 coherentes.
- `sancionado`: sin ganador, marcador 0-0. Suma PJ para ambos y cuenta en el
  progreso de la liga y el grupo, sin G, P, matches ni puntos.

La migración `20261016171620_liga_resultados_completos.sql` refuerza los campos
obligatorios de cada estado: un `jugado` exige ganador y una sanción exige
ambas cifras no nulas. Así el CHECK rechaza estados incompletos incluso cuando
la comparación con NULL habría dado un resultado desconocido.

`ligaSeed` sigue sin tocar las columnas de resultado en sus upserts, así que
re-sembrar el fixture nunca borra un marcador cargado.

---

## Tabla de posiciones

Columnas: `# | Jugador | PJ | G | P | MATCHES | DIF | PTS` (la del admin
agrega `Desempate`). `MATCHES` es `mg-mp` (ganados-perdidos) y `DIF` es
`mg - mp` con signo.

**Orden**, en `calcularTabla`:

1. `puntos` (FT ganados) desc
2. `dif` desc
3. `mg` (matches ganados) desc
4. `orden_desempate` asc, nulls al final
5. `nombre` asc — determinista, evita que la tabla salte entre renders

Los criterios 1-3 son la **clave automática**. Dos filas se consideran
empatadas (`empatado: true`, tinte de warning, flechas ↑/↓, bloqueo del cierre
de grupo) **solo si coinciden en las tres**. Antes bastaba con compartir
`puntos`, y `bloquesPorPuntos` agrupaba por ese único valor; ahora
`bloquesEmpatados` agrupa por la clave completa. En la práctica el admin pasa
a desempatar a mano solo en casos realmente idénticos.

El resto de las reglas del desempate manual queda intacto (ver
`2026-08-06-liga-desempate-admin-design.md`): `orden_desempate` se conserva
siempre y se ignora si el bloque deja de estar empatado; un bloque se
considera resuelto solo si todos sus miembros tienen `orden_desempate` no nulo
**y distinto entre sí**.

---

## UI de carga (admin)

Se conserva el botón por nombre para elegir ganador y se agrega debajo una
fila de tres botones de marcador:

```
[    Wario    ]  VS  [  Joawquer  ]
       ( 3-0 )  ( 3-1 )  ( 3-2 )
```

- Los botones de marcador están **deshabilitados hasta que hay un ganador
  elegido**. El guardado lo dispara el click en el marcador, no el del nombre.
- El ganador pendiente (elegido, sin marcador todavía) se pinta en el tono
  primario; el ganador ya guardado, en verde, con su marcador activo.
- Click en el ganador ya guardado → **borra el resultado** (mismo "deshacer"
  de siempre). Click en el ganador pendiente → cancela la elección.
- Con el grupo cerrado, tanto los nombres como los marcadores quedan
  deshabilitados.

Contrato del endpoint (`PUT /api/admin/liga/partidos/[id]`):

```
{ ganadorId: number | null, matchesPerdedor: 0 | 1 | 2 | null, sancionado?: boolean }
```

El servidor deriva `matches_a`/`matches_b` poniendo 3 del lado del ganador —
el cliente nunca manda las dos cifras, así que no puede construir un marcador
incoherente. `ganadorId: null` limpia marcador y auditoría e ignora
`matchesPerdedor`. Con `sancionado: true` y sin ganador guarda un 0-0; quitar
la sanción vuelve a pendiente y limpia la auditoría. Se mantienen el 409 con
el grupo cerrado y el `revalidatePath("/liga")`.

---

## UI pública

- **Tablas de grupo**: las mismas columnas nuevas.
- **Calendario**: la celda del medio, que decía `VS` cuando había resultado,
  ahora muestra el marcador orientado A–B (`3 – 1`). `PENDIENTE` se mantiene
  para las peleas sin cargar, igual que el resaltado en verde del ganador.

---

## Fuera de alcance

- Formatos distintos de first-to-3 y walkovers — la constraint los rechaza a
  propósito. Si aparecen, hay que relajarla y guardar el formato por
  liga/fecha.
- Historial de ediciones de marcador: sigue habiendo solo `cargado_at` /
  `cargado_by`, sin tabla de eventos.
- Los torneos de Challonge, que siguen puntuando por posición final.
