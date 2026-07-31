// Importa los 7 torneos de la cuenta A (TWPY_host) que no se pudieron traer
// por la API de Challonge porque esa cuenta ya agoto la cuota mensual (500
// requests/30 dias, ver docs/challonge-api-reference.md). Los datos de
// posiciones/participantes se extrajeron a mano de las paginas publicas de
// standings (challonge.com/es/<slug>/standings, accesibles sin API key) via
// Playwright, y quedaron en .playwright-mcp/torneos-cuenta-a.json.
//
// No se cuenta con el challonge_user_id numerico de cada participante (ese
// dato no esta expuesto en la pagina publica) -- todos quedan con
// challonge_id null, por lo que van a la cola de /admin/identidades sin
// excepcion, igual que cualquier participante sin cuenta conocida.
//
//   node --env-file=.env.local --import ./scripts/register-alias.mjs scripts/importar-torneos-cuenta-a.js

import { readFile } from "node:fs/promises";

import { insertarTorneo } from "../src/lib/importarTorneo.js";
import { getSupabaseAdmin } from "../src/lib/supabaseAdmin.js";

const CUENTA = "A"; // TWPY_host, segun aclaracion del usuario (no la B)

async function main() {
  const torneos = JSON.parse(
    await readFile(
      new URL("../.playwright-mcp/torneos-cuenta-a.json", import.meta.url),
      "utf8",
    ),
  );

  const supabase = getSupabaseAdmin();
  const resumen = { importados: [], omitidos: [], fallidos: [] };

  for (const t of torneos) {
    process.stdout.write(`Torneo ${t.id} (${t.slug})... `);

    const { data: existente, error: existenteError } = await supabase
      .from("torneos")
      .select("id")
      .eq("id", t.id)
      .maybeSingle();

    if (existenteError) {
      console.log(`ERROR verificando existencia: ${existenteError.message}`);
      resumen.fallidos.push({ id: t.id, error: existenteError.message });
      continue;
    }

    if (existente) {
      console.log("ya existe, omitido.");
      resumen.omitidos.push(t.id);
      continue;
    }

    const tournament = {
      id: t.id,
      name: t.nombre,
      game_name: "TEKKEN 8",
      state: "complete",
      full_challonge_url: `https://challonge.com/es/${t.slug}`,
      started_at: t.fecha_inicio,
      participants: t.participantes.map((p) => ({
        participant: {
          challonge_user_id: null,
          challonge_username: p.usuario,
          display_name: p.nombre,
          final_rank: p.rango,
        },
      })),
    };

    try {
      const resultado = await insertarTorneo(supabase, tournament, CUENTA);
      console.log(
        `OK "${resultado.torneo}" -- ${resultado.participantes} participantes ` +
          `(${resultado.resueltos} resueltos, ${resultado.sin_resolver} sin vincular)`,
      );
      resumen.importados.push({ id: t.id, ...resultado });
    } catch (error) {
      console.log(`ERROR al insertar: ${error.message}`);
      resumen.fallidos.push({ id: t.id, error: error.message });
    }
  }

  console.log("\n--- Resumen ---");
  console.log(`Importados: ${resumen.importados.length}`);
  console.log(`Omitidos: ${resumen.omitidos.length}`);
  console.log(`Fallidos: ${resumen.fallidos.length}`);
  if (resumen.fallidos.length) {
    for (const f of resumen.fallidos) {
      console.log(`  - ${f.id}: ${f.error}`);
    }
    process.exitCode = 1;
  }
}

await main();
