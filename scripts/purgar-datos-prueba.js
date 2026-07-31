// Borra todo lo que sembro scripts/seed-datos-prueba.js, usando el manifiesto
// de ids que ese script deja en scripts/.datos-prueba-ids.json.
//
//   node --env-file=.env.local scripts/purgar-datos-prueba.js
//
// Correr esto ANTES del backfill real desde Challonge para no mezclar datos
// inventados con los historicos de verdad.

import { readFile, unlink } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

import { getSupabaseAdmin } from "../src/lib/supabaseAdmin.js";
import { BANDA_TORNEOS } from "./datos-prueba.js";

const RAIZ = path.dirname(fileURLToPath(import.meta.url));
export const MANIFIESTO = path.join(RAIZ, ".datos-prueba-ids.json");

async function leerManifiesto() {
  try {
    return JSON.parse(await readFile(MANIFIESTO, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

function reventar(error, contexto) {
  if (error) {
    throw new Error(`${contexto}: ${error.message}`);
  }
}

export async function purgar(supabase, { silencioso = false } = {}) {
  const log = silencioso ? () => {} : (...args) => console.log(...args);
  const manifiesto = await leerManifiesto();

  // Los torneos de la banda centinela se borran siempre, haya manifiesto o
  // no: la cascada se lleva tournament_participants_raw y ranking_snapshots.
  const { data: torneos, error: torneosError } = await supabase
    .from("torneos")
    .delete()
    .gte("id", BANDA_TORNEOS.desde)
    .lte("id", BANDA_TORNEOS.hasta)
    .select("id");
  reventar(torneosError, "borrando torneos de prueba");
  log(`  torneos borrados: ${torneos?.length ?? 0}`);

  if (!manifiesto) {
    log("  sin manifiesto: no hay players/eventos de prueba que borrar");
    return;
  }

  if (manifiesto.identidad_eventos?.length) {
    const { error } = await supabase
      .from("identidad_eventos")
      .delete()
      .in("id", manifiesto.identidad_eventos);
    reventar(error, "borrando identidad_eventos");
    log(`  identidad_eventos borrados: ${manifiesto.identidad_eventos.length}`);
  }

  if (manifiesto.sistema_eventos?.length) {
    const { error } = await supabase
      .from("sistema_eventos")
      .delete()
      .in("id", manifiesto.sistema_eventos);
    reventar(error, "borrando sistema_eventos");
    log(`  sistema_eventos borrados: ${manifiesto.sistema_eventos.length}`);
  }

  if (manifiesto.players?.length) {
    // player_challonge_accounts y player_aliases caen por cascada.
    // Primero los duplicados fusionados: apuntan al canonico via FK.
    const { error: fusionadosError } = await supabase
      .from("players")
      .delete()
      .in("id", manifiesto.players)
      .not("merged_into_player_id", "is", null);
    reventar(fusionadosError, "borrando players fusionados");

    const { error } = await supabase
      .from("players")
      .delete()
      .in("id", manifiesto.players);
    reventar(error, "borrando players");
    log(`  players borrados: ${manifiesto.players.length}`);
  }

  await unlink(MANIFIESTO).catch(() => {});
}

const ejecutadoDirecto =
  process.argv[1] &&
  fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (ejecutadoDirecto) {
  console.log("Purgando datos de prueba...");
  await purgar(getSupabaseAdmin());
  console.log("Listo.");
}
