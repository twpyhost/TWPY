// Importa torneos reales de Challonge (los IDs listados en tournamentIDs.json,
// en la raiz del repo) usando el mismo pipeline que la carga manual desde el
// admin (fetchChallongeApi + insertarTorneo), para no duplicar logica de
// resolucion de identidades ni de calculo de puntajes.
//
//   node --env-file=.env.local scripts/importar-torneos-reales.js
//
// Es re-ejecutable: si un torneo ya existe en `torneos` se omite (no hay
// "reimportar" acá -- para eso ya existe /api/admin/torneos/[id]/reimportar).

import { readFile } from "node:fs/promises";

import { fetchChallongeApi } from "../src/lib/challonge.js";
import { insertarTorneo } from "../src/lib/importarTorneo.js";
import { getSupabaseAdmin } from "../src/lib/supabaseAdmin.js";

const CUENTA = "B"; // unica API key configurada en este entorno (.env.local)

async function main() {
  const idsRaw = JSON.parse(
    await readFile(new URL("../tournamentIDs.json", import.meta.url), "utf8"),
  );
  const ids = idsRaw.map((item) => item.id);

  const supabase = getSupabaseAdmin();

  const resumen = { importados: [], omitidos: [], fallidos: [] };

  for (const tournamentId of ids) {
    process.stdout.write(`Torneo ${tournamentId}... `);

    const { data: existente, error: existenteError } = await supabase
      .from("torneos")
      .select("id")
      .eq("id", tournamentId)
      .maybeSingle();

    if (existenteError) {
      console.log(`ERROR verificando existencia: ${existenteError.message}`);
      resumen.fallidos.push({ tournamentId, error: existenteError.message });
      continue;
    }

    if (existente) {
      console.log("ya existe, omitido.");
      resumen.omitidos.push(tournamentId);
      continue;
    }

    const apiResponse = await fetchChallongeApi(tournamentId, CUENTA);
    if (!apiResponse) {
      console.log("ERROR: no se pudo conectar con Challonge.");
      resumen.fallidos.push({ tournamentId, error: "conexion fallida" });
      continue;
    }

    if (!apiResponse.ok) {
      const mensaje = await apiResponse.text();
      console.log(`ERROR Challonge (${apiResponse.status}): ${mensaje}`);
      resumen.fallidos.push({ tournamentId, error: mensaje });
      continue;
    }

    const { tournament } = await apiResponse.json();

    if (tournament.state !== "complete") {
      console.log(`omitido: estado "${tournament.state}" (no finalizado).`);
      resumen.omitidos.push(tournamentId);
      continue;
    }

    try {
      const resultado = await insertarTorneo(supabase, tournament, CUENTA);
      console.log(
        `OK "${resultado.torneo}" -- ${resultado.participantes} participantes ` +
          `(${resultado.resueltos} resueltos, ${resultado.sin_resolver} sin vincular)`,
      );
      if (resultado.advertencias.length) {
        for (const advertencia of resultado.advertencias) {
          console.log(`  - ${advertencia}`);
        }
      }
      resumen.importados.push({ tournamentId, ...resultado });
    } catch (error) {
      console.log(`ERROR al insertar: ${error.message}`);
      resumen.fallidos.push({ tournamentId, error: error.message });
    }
  }

  console.log("\n--- Resumen ---");
  console.log(`Importados: ${resumen.importados.length}`);
  console.log(`Omitidos (ya existian o no finalizados): ${resumen.omitidos.length}`);
  console.log(`Fallidos: ${resumen.fallidos.length}`);
  if (resumen.fallidos.length) {
    for (const f of resumen.fallidos) {
      console.log(`  - ${f.tournamentId}: ${f.error}`);
    }
    process.exitCode = 1;
  }
}

await main();
