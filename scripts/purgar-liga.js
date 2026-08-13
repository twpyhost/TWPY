// Borra la liga sembrada por scripts/seed-liga.js.
//
//   node --env-file=.env.local scripts/purgar-liga.js
//   node --env-file=.env.local scripts/purgar-liga.js --slug=otra-liga
//   node --env-file=.env.local scripts/purgar-liga.js --e2e
//
// Borra por slug: `ligas` cae en cascada sobre fechas, grupos, participantes y
// partidos (migracion 0012), asi que una sola sentencia se lleva todo -- con
// los resultados cargados incluidos. Es lo contrario de sembrarLiga(), que es
// idempotente justamente para NO pisar resultados.
//
// `--e2e` borra ademas las ligas efimeras que dejan las suites de Playwright
// (`liga-e2e-*`) si alguna corrida murio antes de su afterAll.

import { getSupabaseAdmin } from "../src/lib/supabaseAdmin.js";
import { exigirSupabaseLocal } from "./entorno.js";
import fixture from "./data/liga-2026-fixture.json" with { type: "json" };

function argumento(nombre) {
  const prefijo = `--${nombre}=`;
  const encontrado = process.argv.find((arg) => arg.startsWith(prefijo));
  return encontrado ? encontrado.slice(prefijo.length) : null;
}

exigirSupabaseLocal({ accion: "purgar-liga" });

const supabase = getSupabaseAdmin();
const slug = argumento("slug") ?? fixture.slug;

const { data: borradas, error } = await supabase
  .from("ligas")
  .delete()
  .eq("slug", slug)
  .select("id, slug, nombre");
if (error) throw new Error(`borrando la liga ${slug}: ${error.message}`);

if (borradas.length === 0) {
  console.log(`No habia ninguna liga con slug "${slug}".`);
} else {
  for (const liga of borradas) {
    console.log(`Borrada: ${liga.nombre} (${liga.slug})`);
  }
}

if (process.argv.includes("--e2e")) {
  const { data: efimeras, error: efimerasError } = await supabase
    .from("ligas")
    .delete()
    .like("slug", "liga-e2e-%")
    .select("slug");
  if (efimerasError) {
    throw new Error(`borrando ligas de e2e: ${efimerasError.message}`);
  }
  console.log(`Ligas efimeras de e2e borradas: ${efimeras.length}`);
}
