// Project de setup de datos: verifica que el stack local este arriba y siembra
// lo que consume toda la suite e2e.
//
// Es un project (y no globalSetup) a proposito: asi los tests unitarios puros
// siguen corriendo sin Docker. Solo los projects que declaran `dependencies`
// sobre este pagan el costo del stack.
import { test as setup } from "@playwright/test";

import { LOCAL_SUPABASE_URL } from "../../testSupabase.js";
import { sembrar } from "./seed.js";

const AYUDA = [
  "",
  "  No se pudo hablar con el stack local de Supabase.",
  "",
  "  Antes de correr los tests e2e:",
  "    1. Abri Docker Desktop y espera a que arranque.",
  "    2. npx supabase start",
  "    3. npx playwright test",
  "",
  "  Los tests nunca corren contra el proyecto remoto.",
  "",
].join("\n");

setup("verificar el stack local y sembrar los datos de la suite", async () => {
  const url = process.env.SUPABASE_URL || LOCAL_SUPABASE_URL;

  try {
    const respuesta = await fetch(`${url}/rest/v1/`, {
      signal: AbortSignal.timeout(5000),
    });
    // 401 esta bien: significa que hay alguien atendiendo y pidiendo apikey.
    if (respuesta.status >= 500) {
      throw new Error(`Supabase respondio ${respuesta.status}`);
    }
  } catch (error) {
    throw new Error(`${AYUDA}\n  Detalle: ${error.message}\n`);
  }

  await sembrar();
});
