# Plan de pruebas — TWPY

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
| Gate de acceso | `/auth/login`, todas las rutas `/admin/*` como anónimo | TS-AUTH |
| Panel (lectura) | las 6 secciones de `/admin` con sesión admin | TS-ADM |
| Paginación del panel | `?page=` y filtros en las listas de `/admin` | TS-PAG |

### Fuera de alcance (y por qué)

- **Acciones de escritura del panel** — fusionar identidades, vincular, borrar
  torneos, recalcular rankings. La suite es de **solo lectura** por decisión
  explícita: son operaciones destructivas sobre datos de la comunidad y ya
  tienen cobertura de integración en `tests/integration/`.
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
| Sistema / e2e | `tests/e2e/` | Playwright, projects `e2e` y `e2e-admin` | Supabase local + `next dev` |

La siembra está montada como un **project** (`datos`) y no como `globalSetup`,
justamente para que `npx playwright test tests/unit --project=unit` siga
funcionando sin Docker: solo paga el costo del stack quien declara la
dependencia.

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
- Playwright levanta `next dev` solo. Si ya tenés uno corriendo en el 3000, lo
  reutiliza.

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

Al agregar una suite nueva que escriba en la BD, **tomá una banda nueva y
anotala acá**. Hoy `fullyParallel: false` disimula las colisiones; el día que
se paralelice, dejaría de hacerlo.

---

## 4. Criterios de entrada y salida

**Entrada** (se puede empezar a testear cuando):
- `npm run lint` y `npm run build` pasan.
- El stack local está arriba y con las migraciones aplicadas
  (`npx supabase db reset` si hay dudas).

**Salida** (la corrida se considera buena cuando):
- Los 132 casos pasan (81 e2e + 51 unit/integración), sin `test.skip` ni
  `test.fixme` nuevos.
- Dos corridas seguidas dan el mismo resultado (verifica que el cleanup sea
  idempotente).
- **Control de mutación**: al romper a propósito el código bajo prueba, el caso
  correspondiente falla. Un test que pasa igual con el código roto no está
  probando nada.

---

## 5. Riesgos conocidos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| **`.env.local` apunta al proyecto remoto** | La suite testearía **producción** sin avisar | `NODE_ENV=test` en el `webServer`: Next no carga `.env.local` en modo test, así que ganan las variables que inyecta la config. Además `reuseExistingServer: false`, para no engancharse a un `npm run dev` tuyo que sí lee `.env.local`. **No quites ninguna de las dos.** |
| La BD local tiene datos además de los sembrados | Los conteos exactos fallarían | Los casos que cuentan filas filtran siempre por el prefijo `E2E Jugador` |
| El login del admin no anda en local | Toda la suite del panel queda sin correr | `[auth.email] enable_signup` en `supabase/config.toml` tiene que estar en `true`: en el CLI de Supabase ese flag apaga el **proveedor de email entero**, no solo el alta. El registro público sigue cerrado por el `enable_signup` global de `[auth]` |
| **Puerto 3000 ocupado por una corrida anterior** | La corrida siguiente falla al toque: `http://localhost:3000 is already used` | En Windows, `command: "npm run dev"` metía una capa extra (`npm.cmd` → `node`) que Playwright no lograba cerrar del todo al terminar. El `webServer.command` invoca `next` directo (`npx next dev --turbopack`) para evitarlo. Si aun así ves este error, algo más tiene el puerto tomado — cerralo (`netstat -ano \| findstr :3000` en PowerShell, después `taskkill /PID <pid> /F`) y volvé a correr |
| `revalidate = 60` en las páginas públicas | Datos recién sembrados servidos viejos | La siembra ocurre antes de arrancar los tests; en `next dev` el cacheo es mínimo |
| `fullyParallel: false` | Corrida más lenta | Aceptado: la suite escribe en una BD compartida |
| El stack local no está arriba | Errores opacos | `globalSetup` falla temprano con instrucciones |
| Cambios de copy en la UI | Selectores por texto se rompen | Se prefiere `getByRole` y, donde el texto es identidad (nombres sembrados), el texto es dato del test, no de la UI |

---

## 6. Trazabilidad

Cada caso del catálogo referencia el requisito que cubre: los ítems de
`TODO.todo` y las reglas de negocio de `CLAUDE.md`. La matriz completa está en
[casos-de-prueba.md](casos-de-prueba.md#7-matriz-de-trazabilidad).
