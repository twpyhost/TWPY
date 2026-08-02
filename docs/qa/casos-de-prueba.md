# Catálogo de casos de prueba — TWPY

Complemento del [plan de pruebas](plan-de-pruebas.md). Acá está el diseño: qué
se prueba, con qué técnica y por qué esos valores y no otros.

Cada caso está documentado **también en el código**, arriba de su `test()`, con
título, descripción, precondiciones, pasos y resultado esperado. Este documento
es el índice y el registro del diseño; el spec es la fuente de verdad de la
ejecución.

**Total: 81 casos ejecutables en 8 suites** (48 en el project `e2e`, 33 en
`e2e-admin`). Varios casos son parametrizados: una definición genera N
ejecuciones, una por clase de equivalencia o valor límite. Los números de abajo
son ejecuciones, que es lo que reporta Playwright.

---

## 1. Índice de suites

| Suite | Área | Archivo | Casos |
|---|---|---|---|
| TS-NAV | Navegación pública | `tests/e2e/publico/navegacion.spec.js` | 7 |
| TS-RANK | Ranking | `tests/e2e/publico/ranking.spec.js` | 11 |
| TS-TOR | Torneos y resultados | `tests/e2e/publico/torneos.spec.js` | 9 |
| TS-COMP | Competidores | `tests/e2e/publico/competidores.spec.js` | 4 |
| TS-REG | Reglamento | `tests/e2e/publico/reglamento.spec.js` | 3 |
| TS-AUTH | Gate de acceso | `tests/e2e/publico/auth-gate.spec.js` | 14 |
| TS-ADM | Panel (lectura) | `tests/e2e/admin/lectura.spec.js` | 12 |
| TS-PAG | Paginación del panel | `tests/e2e/admin/paginacion.spec.js` | 21 |

A eso se suman los 51 casos de `tests/unit/` + `tests/integration/` que corren
en el project `unit`: **132 en total** con `npx playwright test`.

---

## 2. Clases de equivalencia

### 2.1 `?year=` en `/ranking` (TC-RANK-004)

La página valida el parámetro contra las temporadas que existen y cae en la más
reciente si no lo reconoce.

| Clase | Valor representativo | Resultado esperado |
|---|---|---|
| Válida — temporada actual | `9086` | muestra 9086 |
| Válida — temporada anterior | `9085` | muestra 9085 |
| Numérica inexistente | `9084` | fallback a 9086 |
| No numérica | `no-es-un-ano` | fallback a 9086 |
| Vacía | `` | fallback a 9086 |
| Ausente | (sin parámetro) | fallback a 9086 — cubierto por TC-RANK-001 |

### 2.2 `slug` en `/torneo-resultado/[slug]` (TC-TOR-005)

El slug es el id numérico del torneo. `getTorneoResultados` corta en
`Number.isFinite` y devuelve `null`, lo que dispara `notFound()`.

| Clase | Valor | Resultado |
|---|---|---|
| Numérico existente | `996001` | 200 con resultados |
| Numérico inexistente | `999999999` | 404 |
| No numérico | `no-es-un-id` | 404 |
| Cero | `0` | 404 |
| Negativo | `-1` | 404 |

### 2.3 `?redirectTo=` en `/auth/login` (TC-AUTH-002)

| Clase | Valor | Resultado |
|---|---|---|
| Ruta interna | `/admin/jugadores` | se respeta |
| Protocol-relative | `//evil.example` | se descarta → `/admin/identidades` |
| Absoluta externa | `https://evil.example` | se descarta → `/admin/identidades` |

### 2.4 Búsqueda en `/competidores` (TC-COMP-002)

| Clase | Valor | Resultado |
|---|---|---|
| Coincidencia exacta | `E2E Jugador 07` | 1 resultado |
| Coincidencia parcial | `E2E Jugador` | 45 resultados |
| Sin coincidencias | `zzz-no-existe-zzz` | lista vacía, sin error |

### 2.5 `url_challonge` (TC-TOR-004, TC-ADM-006)

| Clase | Dato sembrado | Resultado |
|---|---|---|
| Presente | torneo 996001 | el botón de bracket se renderiza |
| Nula | torneo 996002 | el botón no existe |

---

## 3. Valores límite

### 3.1 `?page=` en las listas del panel (TC-PAG-001)

Con 45 jugadores sembrados y 20 por página: **3 páginas, la última con 5**.

| Valor | Clase | Filas esperadas | Por qué este valor |
|---|---|---|---|
| `-3` | bajo el mínimo | 20 (→ página 1) | negativo, debe normalizarse |
| `0` | límite inferior − 1 | 20 (→ página 1) | el off-by-one clásico: las páginas arrancan en 1 |
| `1` | límite inferior | 20 | primera página completa |
| `2` | intermedio | 20 | página del medio, completa |
| `3` | límite superior | **5** | última página **parcial** — el caso que más se rompe |
| `4` | límite superior + 1 | 0 (lista vacía) | fuera de rango: no debe romper ni 500 |
| `abc` | no numérico | 20 (→ página 1) | entrada basura |

45 se eligió justamente para que la última página sea parcial. Con 40 la última
sería completa y el caso interesante quedaría sin cubrir.

### 3.2 Bordes de los controles (TC-PAG-005, TC-PAG-006)

| Estado | ANTERIOR | SIGUIENTE |
|---|---|---|
| Página 1 de 3 | deshabilitado | habilitado |
| Página 2 de 3 | habilitado | habilitado |
| Página 3 de 3 | habilitado | deshabilitado |
| 1 sola página | el control no se renderiza | — |

### 3.3 Contador de rankeados (TC-RANK-002)

Límite inferior: con 45 jugadores sembrados el contador tiene que ser **≥ 45**.
No se asserta igualdad porque la BD local puede tener datos reales además de los
sembrados.

---

## 4. Matriz pairwise

Probar el producto completo de (6 listas × 7 valores de página × 3 filtros ×
2 estados de sesión) son 252 combinaciones. Con pairwise se cubre **cada par de
valores al menos una vez** en 10 casos.

Factores:

- **Lista**: jugadores, torneos, rankings, sistema, identidades, participantes
- **Página**: primera, intermedia, última, fuera de rango
- **Filtro**: ninguno, búsqueda por texto, filtro propio de la lista (cuenta / temporada)
- **Sesión**: admin, anónimo

| # | Lista | Página | Filtro | Sesión | Caso |
|---|---|---|---|---|---|
| 1 | jugadores | primera | ninguno | admin | TC-PAG-002 |
| 2 | jugadores | intermedia | búsqueda | admin | TC-PAG-004 |
| 3 | jugadores | última | búsqueda | admin | TC-PAG-001, TC-PAG-006 |
| 4 | jugadores | fuera de rango | búsqueda | admin | TC-PAG-001 |
| 5 | torneos | primera | filtro propio (cuenta) | admin | TC-PAG-009 |
| 6 | torneos | fuera de rango | ninguno | admin | TC-PAG-008 |
| 7 | rankings | fuera de rango | ninguno | admin | TC-PAG-008 |
| 8 | sistema | fuera de rango | ninguno | admin | TC-PAG-008 |
| 9 | identidades | intermedia | ninguno | admin | TC-PAG-010 |
| 10 | participantes | intermedia | ninguno | admin | TC-PAG-007 |
| 11 | jugadores | primera | ninguno | **anónimo** | TC-AUTH-001 |

Pares que quedan cubiertos y no son obvios:

- (última página, búsqueda) — verifica que el filtro viaje al servidor y que el
  total de páginas se recalcule sobre el resultado filtrado, no sobre la tabla
  entera.
- (fuera de rango, cada lista) — cada lista tiene su propia forma de paginar
  (`.range()` en la query, o slice en memoria en la cola de identidades), así
  que el borde hay que tocarlo en todas.
- (intermedia, participantes) — es la única lista con un bloque que **no** se
  pagina (el Top 4): el par existe para verificar ese invariante.

---

## 5. Modelo de estados (MBT)

### 5.1 Selector de temporadas del ranking

Es el modelo que motiva TC-RANK-005 a TC-RANK-008. La transición tiene un
estado intermedio observable, y ahí vivían los dos bugs del TODO.

```
      click en otro tab
[ MOSTRANDO 9086 ] ─────────────────► [ CARGANDO ] ─────────► [ MOSTRANDO 9085 ]
                                            │
                            invariantes que deben valer AQUI:
                              I1. el label dice "CARGANDO TEMPORADA 9085"
                                  (la elegida), nunca 9085 → 9086 → 9085
                              I2. el eyebrow del hero ya dice 9085
                              I3. el indicador del selector ya se movio
                              I4. window.scrollY no cambio
```

| Transición / invariante | Caso |
|---|---|
| Estado final correcto | TC-RANK-005 |
| I1 — label del loading | TC-RANK-006 |
| I2 — eyebrow optimista | TC-RANK-008 |
| I4 — scroll preservado | TC-RANK-007 |

### 5.2 Grafo de navegación pública

Cada item del navbar es una arista desde cualquier página. TC-NAV-001 recorre
las cuatro; TC-NAV-002 cubre la arista condicional (BLACKHAND si anónimo, ADMIN
si hay sesión admin).

### 5.3 Sidebar del panel

Mismo modelo: 5 estados (identidades, jugadores, torneos, rankings, sistema),
más el estado inicial `/admin` que es una transición automática a identidades.
TC-ADM-001 cubre los estados; TC-ADM-002 la transición por defecto; TC-ADM-004
la transición listado → detalle.

### 5.4 Botón de link externo

```
[ DETALLE ] ── click en VER BRACKET ──► [ MODAL DE SALIDA ] ── continuar ──► Challonge
                                               │
                                     invariante: la URL del sitio NO cambio
```

Cubierto por TC-ADM-007.

---

## 6. Catálogo de casos

### TS-NAV — Navegación pública

| Id | Título | Técnica | Prioridad |
|---|---|---|---|
| TC-NAV-001 | El navbar lleva a cada sección (×4) | MBT | alta |
| TC-NAV-002 | Un visitante anónimo ve BLACKHAND y no ADMIN | equivalencia | media |
| TC-NAV-003 | Una ruta inexistente devuelve el 404 propio | equivalencia | media |
| TC-NAV-004 | sitemap.xml y robots.txt responden | cobertura | baja |

### TS-RANK — Ranking

| Id | Título | Técnica | Prioridad |
|---|---|---|---|
| TC-RANK-001 | Carga la temporada más reciente | equivalencia | alta |
| TC-RANK-002 | El contador del hero cuenta los rankeados | valor límite | media |
| TC-RANK-003 | La posición 1 usa el resaltado del top 3 | valor límite | media |
| TC-RANK-004 | `?year=` por clase de equivalencia (×4) | equivalencia + límite | alta |
| TC-RANK-005 | Cambiar de temporada reemplaza los datos | MBT | alta |
| TC-RANK-006 | El loading nunca muestra la temporada de partida | MBT (invariante) | alta |
| TC-RANK-007 | Cambiar de temporada no resetea el scroll | MBT (invariante) | alta |
| TC-RANK-008 | El eyebrow refleja la temporada elegida durante la carga | MBT | media |

### TS-TOR — Torneos y resultados

| Id | Título | Técnica | Prioridad |
|---|---|---|---|
| TC-TOR-001 | El listado muestra los torneos sembrados | equivalencia | alta |
| TC-TOR-002 | El filtro por temporada acota el listado | equivalencia | media |
| TC-TOR-003 | Los resultados de un torneo existente cargan (regresión RLS) | equivalencia | alta |
| TC-TOR-004 | El botón de bracket depende de que haya url | equivalencia | media |
| TC-TOR-005 | Slug inválido devuelve 404 (×4) | equivalencia + límite | alta |
| TC-TOR-006 | La temporada actual lista sus dos torneos | equivalencia | baja |

### TS-COMP — Competidores

| Id | Título | Técnica | Prioridad |
|---|---|---|---|
| TC-COMP-001 | El board lista a los competidores | equivalencia | alta |
| TC-COMP-002 | Buscador por clase de equivalencia (×3) | equivalencia | media |

### TS-REG — Reglamento

| Id | Título | Técnica | Prioridad |
|---|---|---|---|
| TC-REG-001 | La página carga con sus seis secciones | cobertura | media |
| TC-REG-002 | Los subtítulos entran con la animación fadeUp | estado visual | media |
| TC-REG-003 | El índice lateral apunta a cada sección | cobertura | baja |

### TS-AUTH — Gate de acceso

| Id | Título | Técnica | Prioridad |
|---|---|---|---|
| TC-AUTH-001 | Anónimo en cada ruta del panel va a login (×9) | equivalencia | alta |
| TC-AUTH-002 | `redirectTo` por clase de equivalencia (×3) | equivalencia (seguridad) | alta |
| TC-AUTH-003 | Credenciales inválidas no crean sesión | equivalencia | alta |
| TC-AUTH-004 | `/api/admin/jugadores` rechaza a un anónimo | equivalencia (seguridad) | alta |

### TS-ADM — Panel (lectura)

| Id | Título | Técnica | Prioridad |
|---|---|---|---|
| TC-ADM-001 | Cada sección carga con sesión admin (×5) | MBT | alta |
| TC-ADM-002 | `/admin` redirige a identidades | MBT | baja |
| TC-ADM-003 | La lista de jugadores muestra a los sembrados | equivalencia | alta |
| TC-ADM-004 | El detalle de torneo abre desde el listado | MBT | alta |
| TC-ADM-005 | El detalle no tiene placeholder y sí botón de bracket | estado | media |
| TC-ADM-006 | Sin url de Challonge no hay botón de bracket | equivalencia | media |
| TC-ADM-007 | El botón de bracket abre el aviso de salida | MBT | media |
| TC-ADM-008 | Rankings muestra la temporada sembrada | equivalencia | media |

### TS-PAG — Paginación del panel

| Id | Título | Técnica | Prioridad |
|---|---|---|---|
| TC-PAG-001 | `?page=` por valor límite (×7) | valores límite | alta |
| TC-PAG-002 | El buscador encuentra a un jugador de la última página | equivalencia | alta |
| TC-PAG-003 | Cambiar el filtro vuelve a la página 1 | MBT | alta |
| TC-PAG-004 | La página sobrevive a una recarga | MBT | media |
| TC-PAG-005 | Los botones recorren las páginas y se cortan en los bordes | valores límite | alta |
| TC-PAG-006 | La última página deshabilita SIGUIENTE | valores límite | media |
| TC-PAG-007 | El podio no cambia al pasar de página | MBT (invariante) | media |
| TC-PAG-008 | Cada lista tolera `?page=` fuera de rango (×6) | pairwise | media |
| TC-PAG-009 | El filtro por cuenta se refleja en la URL | pairwise | media |
| TC-PAG-010 | Los stats de identidades no dependen de la página | MBT (invariante) | media |

---

## 7. Matriz de trazabilidad

| Requisito | Origen | Casos que lo cubren |
|---|---|---|
| Los subtítulos del reglamento animan como el resto | `TODO.todo` | TC-REG-002 |
| El detalle de torneo no muestra placeholder de embed, sí botón de bracket | `TODO.todo` | TC-ADM-005, TC-ADM-006, TC-ADM-007 |
| El loading del ranking no muestra la temporada vieja | `TODO.todo` | TC-RANK-006, TC-RANK-008 |
| Cambiar de temporada no resetea el scroll | `TODO.todo` | TC-RANK-007 |
| Las listas del panel están paginadas | `TODO.todo` | TS-PAG completa |
| Suite e2e ejecutable sin asistencia | `TODO.todo` | el plan de pruebas entero |
| Rankings: puntos por posición y corte por torneo | `CLAUDE.md` | TC-RANK-001, TC-RANK-003, TC-ADM-008 |
| Rankings: tendencia ▲/▼ por torneo | `CLAUDE.md` | TC-ADM-008 (datos sembrados con posiciones rotadas) |
| El panel es la única parte con auth | `CLAUDE.md` | TS-AUTH completa |
| Las páginas públicas no requieren login | `CLAUDE.md` | TS-NAV, TS-RANK, TS-TOR, TS-COMP, TS-REG |
| La vista pública de resultados es legible por anónimos (RLS) | migración 0006 | TC-TOR-003 |
| Dos cuentas organizadoras (A / B) trazables | `CLAUDE.md` | TC-PAG-009 |

### Defectos encontrados por la suite

| Hallazgo | Estado | Dónde |
|---|---|---|
| `?page=` fuera de rango hacía que la API devolviera **500**: PostgREST responde 416 `PGRST103` cuando el offset supera el total de filas | **Corregido** — `consultarPagina()` en `src/lib/paginacion.js` lo detecta y devuelve página vacía con el total real | TC-PAG-001, TC-PAG-008 |
| El servidor de pruebas hablaba con el Supabase de **producción** porque `.env.local` pisaba las variables inyectadas | **Corregido** — `NODE_ENV=test` + `reuseExistingServer: false` | toda la suite |
| El login con email estaba deshabilitado en el stack local, así que el panel no se podía testear | **Corregido** — `[auth.email] enable_signup = true` en `supabase/config.toml` | TS-ADM, TS-PAG |
| `/torneo-resultado/<id inexistente>` muestra el 404 pero responde **HTTP 200** (soft 404, malo para SEO) | **Abierto** — anotado en `TODO.todo`; el caso verifica el contenido, no el status | TC-TOR-005 |

### Huecos conocidos

Se dejan anotados a propósito, no son olvidos:

- **Resolución de identidades** (vincular, fusionar, deshacer, registrar
  manual) — es la sección de mayor prioridad del panel y está cubierta a nivel
  integración, pero no e2e, porque son acciones de escritura. Es el primer
  candidato si en algún momento se decide tener una suite de escritura contra
  una BD desechable.
- **Importación desde Challonge** — necesita stubs de red.
- **OAuth de Discord** — no está configurado en el stack local.
