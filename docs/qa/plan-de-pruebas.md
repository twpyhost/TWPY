# Plan de pruebas — TWPY

## Ampliación 2026-10-16 — perfiles públicos (fase 1)

Se agregan `/competidores/[id]`, su editor de personajes/Tekken IDs y las
redirecciones canónicas. `tests/unit/playerProfiles.test.js` cubre validación,
proyección, ciclos y paridad mock; `tests/integration/playerProfiles.test.js`
cubre privacidad/RLS, bigint, colisiones y rollback de la fusión. La nueva
banda de torneos es 994801–994802 (temporada 9093), cuentas 994811–994813;
el caso de precisión reserva temporalmente 9007199254740992–9007199254740993
en temporada 9094 y los elimina en `finally`.

Las suites `playerProfiles.spec.js` de público, admin y rol `liga` verifican
las cuatro fuentes de navegación, 308/404 reales, guardado/recarga y 401/403,
incluida la denegación de RPC al rol autenticado. La edición e2e escribe solo
en jugadores sembrados de la suite y la limpieza elimina por cascade los
metadatos/cuentas. Se mantiene un worker y `NODE_ENV=test`; no se utilizan
Challonge, EWGF ni producción.

Las capturas a 390px/1440px se guardan en el workspace ignorado de ejecución.
El runbook de esquema, reconstrucción y release está en
`docs/releases/2026-10-16-public-player-profiles.md`.

Plan de pruebas de la suite end-to-end del sitio de Tekken Warriors Paraguay.
Está pensado para ejecutarse **sin asistencia**: el que corre los tests no
necesita conocer el código ni pedirle nada a nadie.

El catálogo de casos, con las tablas de clases de equivalencia, valores límite,
la matriz pairwise y el modelo de estados, vive en
[casos-de-prueba.md](casos-de-prueba.md).

---

## 1. Alcance

### En alcance

| Área | Rutas | Suite |
|---|---|---|
| Navegación pública | `/`, navbar, 404, `sitemap.xml`, `robots.txt` | TS-NAV |
| Ranking | `/ranking`, `/ranking?year=` | TS-RANK |
| Torneos y resultados | `/torneos`, `/torneo-resultado/[slug]` | TS-TOR |
| Competidores | `/competidores` | TS-COMP |
| Reglamento | `/reglamento` | TS-REG |
| Liga pública | `/liga`, pestañas Grupos y Calendario | TS-LIGA |
| Resultados y sanciones de Liga | `/admin/liga`, `/admin/liga/grupo/[numero]` | TS-LIGA-ADMIN |
| Desempates y cierre de grupos | `/admin/liga/grupo/[numero]` | TS-LIGA-DESEMPATE |
| Gate de acceso | `/auth/login`, todas las rutas `/admin/*` como anónimo | TS-AUTH |
| Panel (lectura) | las 6 secciones de `/admin` con sesión admin | TS-ADM |
| Paginación del panel | `?page=` y filtros en las listas de `/admin` | TS-PAG |
| Separación de roles | `/admin/*` y `/api/admin/*` con sesión de rol `liga` | TS-ROL |

### Fuera de alcance (y por qué)

- **Acciones de escritura del panel** — fusionar identidades, vincular, borrar
  torneos, recalcular rankings. Esas operaciones tienen cobertura de integración
  en `tests/integration/`. La excepción e2e son los resultados, sanciones,
  desempates y cierres de **Liga**: escriben únicamente en ligas de prueba
  sembradas en el stack local y eliminadas al terminar.
- **Todo lo que pega a Challonge** — importar, sincronizar, reimportar. El
  servidor de pruebas no recibe `CHALLONGE_API_KEY`. Si en el futuro se
  quieren cubrir, hay que interceptar con `page.route` usando los fixtures que
  ya existen en `tests/fixtures/challonge-v2-*.json`.
- **OAuth de Discord** — el provider no está habilitado en el stack local
  (`supabase/config.toml` no tiene bloque `[auth.external.discord]`). El botón
  se verifica que exista; el flujo no se ejercita.
- **Compatibilidad entre navegadores** — la suite corre solo en Chromium
  (Desktop Chrome). La comunidad es chica y el sitio no usa APIs de riesgo.

---

## 2. Niveles y tipos de prueba

| Nivel | Dónde vive | Runner | Necesita |
|---|---|---|---|
| Unitario | `tests/unit/` | Playwright, project `unit` | nada |
| Integración | `tests/integration/` | Playwright, project `unit` | Supabase local |
| Sistema / e2e | `tests/e2e/` | Playwright, projects `e2e`, `e2e-admin` y `e2e-liga` | Supabase local + `next dev` |

La siembra está montada como un **project** (`datos`) y no como `globalSetup`.
`npx playwright test tests/unit --project=unit` funciona sin Docker: solo
ejecuta funciones puras. El project `unit` completo también incluye integración
y por eso necesita Supabase local. La configuración actual arranca `next dev`
incluso al seleccionar solo pruebas unitarias.

Playwright es el **único runner** del repo (no hay Jest ni Vitest), a propósito:
un solo comando, una sola forma de escribir asserts.

Tipos cubiertos: funcional, de navegación, de seguridad de acceso (gate y open
redirect) y de regresión visual puntual (la animación de los subtítulos y el
resaltado del top 3).

---

## 3. Entorno de pruebas

### Requisitos

1. **Docker Desktop** corriendo.
2. **Stack local de Supabase**: `npx supabase start`.
3. Node y las dependencias del repo: `npm install`.

No hace falta `.env.local`: `playwright.config.js` le inyecta al servidor de
pruebas la URL y las claves del stack local (las *demo keys* fijas que imprime
`supabase start`, iguales en cualquier máquina).

### Cómo se corre

```bash
npx playwright test                          # todo: unit + integracion + e2e
npx playwright test --project=e2e            # solo paginas publicas
npx playwright test --project=e2e-admin      # solo el panel (arrastra su setup)
npx playwright test --project=e2e-liga       # solo la separacion de roles
npx playwright test --project=unit           # unit + integracion, sin browser
npx playwright test tests/unit --project=unit # solo unit: no necesita Docker
npx playwright test --ui                     # modo interactivo
npx playwright show-report                   # reporte HTML de la ultima corrida
```

Los mismos comandos están como scripts: `npm test`, `npm run test:e2e`,
`npm run test:unit`, `npm run test:ui`.

### Qué pasa automáticamente

- El project `datos` verifica que el stack local responda y, si no, **falla con
  instrucciones** en vez de con un `fetch failed` sin contexto.
- El project `datos` siembra; su teardown (`limpieza`) borra. La siembra limpia
  primero, así que una corrida que murió a la mitad no deja la siguiente rota.
- El project `setup` crea el usuario admin de pruebas, hace login real contra
  `/api/auth/login` y guarda la sesión en `tests/e2e/.auth/admin.json`
  (ignorado por git). El project `e2e-admin` depende de él.
- El project `setup-liga` hace lo mismo con un usuario de rol `liga`
  (`tests/e2e/.auth/liga.json`); del él depende `e2e-liga`. Los dos usuarios
  los borra el teardown de `datos`.
- Playwright levanta su propio `next dev`. Si el 3000 ya está ocupado, falla:
  `reuseExistingServer: false` evita ejecutar la suite contra otro entorno.

### Datos de prueba

Se siembran una vez por corrida (`tests/e2e/fixtures/seed.js`):

| Entidad | Cantidad | Detalle |
|---|---|---|
| Torneos | 3 | 2 en la temporada 9086, 1 en la 9085 |
| Jugadores | 45 | `E2E Jugador 01` … `E2E Jugador 45` |
| Participaciones | 93 | todas resueltas (`resolved_at` no nulo) |
| Snapshots de ranking | 93 | posiciones rotadas entre torneos, para que haya tendencias |

**45 jugadores no es arbitrario**: con 20 por página da 3 páginas y la última
parcial (5 filas), que es exactamente el valor límite que interesa probar.

Uno de los torneos se siembra **sin** `url_challonge` a propósito, para cubrir
el caso del botón de bracket que no debe renderizarse.

### Bandas de ids reservadas

Los tests que escriben usan ids fuera de cualquier rango real. Registro:

| Banda | Temporadas | Quién la usa |
|---|---|---|
| `996xxx` | 9084–9086 | suite e2e (`tests/e2e/fixtures/datos.js`) |
| `995xxx` | 9093–9095 | `tests/integration/rankingsCount.test.js` |
| `910xxx` | 9099 | `tests/integration/rls.test.js` |
| `800001–800099` | — | `scripts/seed-datos-prueba.js` (datos de demo, no tests) |

Las suites de Liga usan IDs generados por la base y slugs exclusivos:
`liga-test-*` en integración y `liga-e2e-*` en e2e. No modifican la liga real.
`workers: 1` mantiene serializadas las suites que consultan la liga más reciente;
`fullyParallel: false` por sí solo no serializa archivos distintos.

Al agregar una suite nueva que escriba en la BD, **tomá una banda nueva y
anotala acá**. Si usa IDs generados, reservar un prefijo de slug y documentar
su limpieza. La configuración serial actual no sustituye ese aislamiento.

---

## 4. Criterios de entrada y salida

**Entrada** (se puede empezar a testear cuando):
- `npm run lint` y `npm run build` pasan.
- El stack local está arriba y con las migraciones aplicadas
  (`npx supabase db reset` si hay dudas).

**Salida** (la corrida se considera buena cuando):
- Pasan todas las ejecuciones que lista `npx playwright test --list`, sin
  `test.skip` ni `test.fixme` nuevos. Al 2026-10-16 son 203: 117 e2e,
  82 unit/integración y 4 tareas de preparación/limpieza.
- Dos corridas seguidas dan el mismo resultado (verifica que el cleanup sea
  idempotente).
- **Control de mutación**: al romper a propósito el código bajo prueba, el caso
  correspondiente falla. Un test que pasa igual con el código roto no está
  probando nada.

---

## 5. Riesgos conocidos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| **Credenciales remotas en un entorno de desarrollo** | La suite testearía **producción** sin avisar | `.env.local` apunta al stack local; el remoto está en `.env.prod.local`. Se mantienen `NODE_ENV=test` (Next no carga `.env.local`) y `reuseExistingServer: false` como defensas. No sobrescribir las variables `SUPABASE_*` de tests con valores remotos. **No quites estas protecciones.** |
| La BD local tiene datos además de los sembrados | Los conteos exactos fallarían | Los casos que cuentan filas filtran siempre por el prefijo `E2E Jugador` |
| El login del admin no anda en local | Toda la suite del panel queda sin correr | `[auth.email] enable_signup` en `supabase/config.toml` tiene que estar en `true`: en el CLI de Supabase ese flag apaga el **proveedor de email entero**, no solo el alta. El registro público sigue cerrado por el `enable_signup` global de `[auth]` |
| **Puerto 3000 ocupado por una corrida anterior** | La corrida siguiente falla al toque: `http://localhost:3000 is already used` | En Windows, `command: "npm run dev"` metía una capa extra (`npm.cmd` → `node`) que Playwright no lograba cerrar del todo al terminar. El `webServer.command` invoca `next` directo (`npx next dev --turbopack`) para evitarlo. Si aun así ves este error, algo más tiene el puerto tomado — cerralo (`netstat -ano \| findstr :3000` en PowerShell, después `taskkill /PID <pid> /F`) y volvé a correr |
| `revalidate = 60` en las páginas públicas | Datos recién sembrados servidos viejos | La siembra ocurre antes de arrancar los tests; en `next dev` el cacheo es mínimo |
| `workers: 1` y `fullyParallel: false` | Corrida más lenta | Aceptado: la suite escribe en una BD compartida y las rutas de Liga eligen la más reciente |
| El stack local no está arriba | Errores opacos | El project `datos` falla temprano con instrucciones |
| Cambios de copy en la UI | Selectores por texto se rompen | Se prefiere `getByRole` y, donde el texto es identidad (nombres sembrados), el texto es dato del test, no de la UI |

---

## 6. Trazabilidad

Cada caso del catálogo referencia el requisito que cubre: los ítems de
`TODO.todo` y las reglas de negocio de `CLAUDE.md`. La matriz completa está en
[casos-de-prueba.md](casos-de-prueba.md#7-matriz-de-trazabilidad).

## 7. Cierre de release de perfiles — 2026-10-16

La fase 1 se publicó mediante PR #12 después de 223/223 pruebas locales,
lint/build, revisión independiente y restore previo de producción. Smoke
remoto de solo lectura: cuatro fuentes de enlaces, perfiles con/sin resultados,
308/404 reales, sitemap, API admin 401 y panel a login; capturas revisadas a
390px/1440px, sin errores JavaScript. No se sembraron datos ni usuarios remotos.
Las escrituras y roles admin/`liga` se verificaron localmente.

El backup de Actions posterior al release (`38981464176`) se restauró en
una base local aislada: conteos históricos coincidentes, fusión transaccional
y ACL de RPC aprobados. Se conservan los GRANT/REVOKE; la copia de restore
omite solo los defaults del rol gestionado supabase_admin. Procedimiento y
evidencia en `docs/infrastructure.md` y el runbook de release. EWGF diferido;
fase 2 no iniciada.
