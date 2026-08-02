# Pagina Web TWPy

Esta página web será utilizada para rastrear los resultados y puntajes de torneos de la comunidad de Tekken PY

## Observaciones del análisis

El objetivo del PMV(Producto Mínimo Viable) es obtener una página web que permita consultar los resultados de los torneos, las puntuaciones y el ranking de jugadores de la comunidad (o comunidades en caso de querer expandir el objetivo)

La API de Challonge permite acceder a la información de los torneos como el nombre, fecha de creación e inicio, a que juego corresponde, la lista de participantes con su nombre de usuario e id de la plataforma, así también como su posición en dicho torneo.

Con este desarrollo lo que se busca es consumir la api de Challonge (de preferencia, que la api sea de la cuenta con la que se generan todos los torneos, para obtener el listado de torneos de manera más fácil) para obtener la información de cada torneo realizado, como los participantes y sus posiciones, y estos datos, cruzarlos con el sistema de puntaciones determinado por el administrador(en una BD para que sea parametrizable).

## Los datos que se estarían almacenando dentro nuestra BD serían los siguientes:

- Los datos de usuarios de Challonge(id y nombre de usuario)
- Datos de Nombres alternativos para los usuarios(pk compuesta del id de challonge y el nombre, pudiendo estar solamente un nombre alternativo como Activo)
- Los datos de Torneos de Challonge(id, fecha de inicio, a que juego corresponde)
- Las posiciones de los usuarios por cada Torneo
- Las puntuaciones por cada posicion según el juego (los puntajes deben ser parametrizables)
- La sumatoria de puntajes de los distintos torneos por año de cada usuario
- Por cada torneo, se añade una flecha arriba o abajo para indicar la subida o bajada de posición global del participante

El "sistema" debe registrar en la tabla local aquellos usuarios de challonge que no se encuentren registrados anteriormente, así también su nombre alternativo con estado Activo, la informacion del torneo y las posiciones del torneo junto con la puntuación correspondiente.

Para calcular las posiciones del ranking, el sistema debe realizar la sumatoria de los puntos obtenidos en cada torneo del año correspondiente, realizando cortes por cada torneo para poder mantener un registro historico de posiciones dentro del año

Los usuarios serán registrados automáticamente con el usuario y el id de challonge, exceptuando a aquellos participantes que no se hayan registrado con su usuario a traves de la web, para los cuales se deberá crear un id temporal y un nombre temporal, el cual se actualizará cuando se conozca el id de su usuario de challonge. Este nombre temporal se deberá respetar para todos los torneos venideros hasta que el usuario cuente con un id de challonge, ahi se reemplazará la información de sus resultados en torneos y nombres.

El proyecto se decidió construir en Next.js con hosting Vercel utilizando Neon para guardar PostgreSQL (Probar Supabase con postgres primero)
Estudiar la posibilidad de comprar dominios usando cnc.py (o hostinger si no se puede) costeando con torneo

## Como ejecutar este código en su máquina local

- Descargar este repositorio
- Ejecutar `npm install` en linea de comando dentro de la carpeta descargada
- Copiar `.env.example` a `.env.local` y completar las credenciales (ver comentarios en el archivo)
- Ejecutar `npm run dev`
- Abrir en el navegador http://localhost:3000/

## Fuente de datos (mock vs Supabase)

La variable `DATA_SOURCE` controla de donde salen los datos (solo servidor):

- `DATA_SOURCE=mock` (default): usa los JSON locales `src/torneos.json` y `src/resultado.json`. No requiere Supabase.
- `DATA_SOURCE=supabase`: lee de Supabase. Requiere `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` y, para insertar torneos desde el admin, `SUPABASE_SERVICE_ROLE_KEY`.

La capa de datos vive en `src/lib/data/` (`mockDb.js`, `supabaseDb.js` y el facade `index.js`).

## Base de datos

El esquema completo vive en `supabase/migrations/` (0001 a la ultima,
incluye tablas, RLS, vistas publicas y seed de puntajes). Para aplicarlo a
un proyecto de Supabase: `supabase link --project-ref <ref>` y despues
`supabase db push` — no hace falta pegar SQL a mano en el dashboard.

## Tests

`npm test` corre unit + integracion + e2e con Playwright. Prerrequisito:
Docker Desktop corriendo y `supabase start` levantado (stack local de
Supabase) — los tests con DB nunca tocan el proyecto remoto. Scripts:
`npm run test:unit`, `npm run test:e2e`, `npm run test:ui`.

La suite e2e siembra y limpia sus propios datos sola (globalSetup /
globalTeardown) y crea el usuario admin que necesita el project
`e2e-admin`. Despues de correrla, `npx playwright show-report` abre el
reporte HTML.

El plan de pruebas y el catalogo de casos (clases de equivalencia, valores
limite, matriz pairwise y modelos de estado) estan en `docs/qa/`.

## Deploy (Vercel)

1. Importar el repo en Vercel.
2. Configurar las variables de entorno de `.env.example` en el proyecto
   (empezar con `DATA_SOURCE=mock` para salir online; cambiar a `supabase`
   cuando la BD tenga datos reales cargados y verificados).
3. `CHALLONGE_API_KEY` y `SUPABASE_SERVICE_ROLE_KEY` son secretos de servidor:
   nunca usar el prefijo `NEXT_PUBLIC_` con ellos.

### DER disponible aqui: https://miro.com/app/board/uXjVLtzFaL8=/

### API de Challonge: https://api.challonge.com/v1

### Trello del proyecto: https://trello.com/b/LT8wZFFH/mokete-gaming

#### Version 1.1

Añadir cache para seguridad respecto a DDOS a las consultas SQL (Redis???)
