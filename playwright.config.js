import { defineConfig, devices } from "@playwright/test";

import {
  LOCAL_SUPABASE_URL,
  LOCAL_SUPABASE_ANON_KEY,
  LOCAL_SUPABASE_SERVICE_ROLE_KEY,
} from "./tests/testSupabase.js";

// Projects:
//   unit       -- funciones puras + integracion con DB, sin browser.
//   datos      -- verifica el stack local y siembra la data de la suite.
//   limpieza   -- teardown de `datos`.
//   setup      -- crea el admin de pruebas y guarda su sesion.
//   e2e        -- paginas publicas, siempre como visitante anonimo.
//   e2e-admin  -- panel de administracion, con la sesion del setup.
//
// La siembra es un project y no globalSetup para que `--project=unit` siga
// corriendo sin Docker: solo paga el costo del stack quien lo declara como
// dependencia.
//
// Todo corre contra `next dev` + el stack local de Supabase (`supabase start`),
// nunca contra el proyecto remoto.
//
// El plan de pruebas y el catalogo de casos viven en docs/qa/.
export default defineConfig({
  fullyParallel: false,
  // Fijado en 1: dos specs (liga.spec.js y ligaDesempate.spec.js) siembran
  // su propia liga en beforeAll y dependen de que obtenerLigaActual() elija
  // "la liga creada mas recientemente" -- si Playwright corriera sus
  // beforeAll en paralelo en workers distintos (el default, ya que
  // fullyParallel: false solo serializa tests DENTRO de un archivo, no
  // entre archivos), podrian pisarse entre si y corromper ambas corridas.
  workers: 1,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    // Para poder ver que paso cuando algo falla sin tener que reproducirlo.
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "unit",
      testDir: "./tests",
      testMatch: ["unit/**/*.test.js", "integration/**/*.test.js"],
    },
    {
      name: "datos",
      testDir: "./tests/e2e/fixtures",
      testMatch: "datos.setup.js",
      teardown: "limpieza",
    },
    {
      name: "limpieza",
      testDir: "./tests/e2e/fixtures",
      testMatch: "datos.teardown.js",
    },
    {
      name: "setup",
      testDir: "./tests/e2e/fixtures",
      testMatch: "admin.setup.js",
      dependencies: ["datos"],
      use: { ...devices["Desktop Chrome"], baseURL: "http://localhost:3000" },
    },
    {
      name: "e2e",
      testDir: "./tests/e2e/publico",
      testMatch: "**/*.spec.js",
      dependencies: ["datos"],
      use: { ...devices["Desktop Chrome"], baseURL: "http://localhost:3000" },
    },
    {
      name: "e2e-admin",
      testDir: "./tests/e2e/admin",
      testMatch: "**/*.spec.js",
      dependencies: ["setup"],
      use: {
        ...devices["Desktop Chrome"],
        baseURL: "http://localhost:3000",
        storageState: "tests/e2e/.auth/admin.json",
      },
    },
  ],
  webServer: {
    // Se invoca `next` directo (no `npm run dev`): en Windows, "npm run dev"
    // mete una capa extra (npm.cmd -> node) y Playwright solo manda la senal
    // de cierre al proceso de arriba, no a next dev en si -- el server queda
    // vivo en el puerto 3000 y la proxima corrida falla con "already used"
    // antes de ejecutar un solo test.
    command: "npx next dev --turbopack",
    url: "http://localhost:3000",
    // NUNCA reusar un servidor ya levantado: si es el `npm run dev` de tu
    // sesion, apunta al proyecto REMOTO (por .env.local) y la suite pasaria a
    // testear produccion sin avisar. Mejor fallar con "puerto ocupado".
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      // Clave: con NODE_ENV=test, Next NO carga .env.local (es su escape
      // hatch documentado para tests). Sin esto, .env.local pisa las
      // variables de aca -- Next sobreescribe las env heredadas del proceso
      // padre cuando coinciden con las originales -- y el servidor de pruebas
      // termina hablando con el Supabase de produccion.
      NODE_ENV: "test",
      DATA_SOURCE: "supabase",
      NEXT_PUBLIC_SUPABASE_URL: process.env.SUPABASE_URL || LOCAL_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY:
        process.env.SUPABASE_ANON_KEY || LOCAL_SUPABASE_ANON_KEY,
      SUPABASE_SERVICE_ROLE_KEY:
        process.env.SUPABASE_SERVICE_ROLE_KEY || LOCAL_SUPABASE_SERVICE_ROLE_KEY,
    },
  },
});
