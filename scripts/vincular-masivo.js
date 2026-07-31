// Resuelve en bloque la cola de tournament_participants_raw sin player_id,
// reusando resolverParticipante() -- la misma funcion que usan /vincular y
// /crear_jugador desde el panel admin -- para que quede auditada igual
// (identidad_eventos) y las ranking_snapshots se recalculen consistentemente.
//
// Estrategia (nunca por nombre, solo por identificador de Challonge, en
// linea con la regla del proyecto de no fusionar por coincidencia de nombre):
//   1. Filas con challonge_id numerico (torneos importados por API, cuenta B):
//      se agrupan por challonge_id. Una sola llamada a resolverParticipante
//      por id unico resuelve automaticamente TODAS las filas hermanas (todas
//      las apariciones de esa cuenta en cualquier torneo), como ya hace el
//      flujo de "vincular" manual.
//   2. Filas sin challonge_id pero con challonge_username (torneos de cuenta
//      A, scrapeados de standings publicas): se agrupan por username en
//      minusculas. Si ese username ya quedo vinculado a un jugador en el
//      paso 1 (la misma persona jugo en cuenta A y B), se linkean ahi. Si no,
//      se crea un jugador nuevo sin cuenta challonge verificada (mismo caso
//      que "player registrado manualmente", escenario 4 del modelo de
//      identidad) y se linkean todas las filas de ese username.
//   3. Filas sin challonge_id NI username (nombre suelto, sin cuenta
//      linkeada en Challonge) se dejan intactas para revision manual --
//      no hay forma confiable de agruparlas sin arriesgar fusionar a dos
//      personas distintas.
//
//   node --env-file=.env.local --import ./scripts/register-alias.mjs scripts/vincular-masivo.js

import { resolverParticipante } from "../src/lib/identidadResolucion.js";
import { getSupabaseAdmin } from "../src/lib/supabaseAdmin.js";

const ACTOR_EMAIL = "script:vincular-masivo (resolucion en bloque por challonge_id/username)";

async function crearJugador(supabase, displayName) {
  const { data, error } = await supabase
    .from("players")
    .insert({ display_name: displayName })
    .select("id, display_name")
    .single();
  if (error) throw error;
  return data;
}

async function main() {
  const supabase = getSupabaseAdmin();

  const { data: pendientes, error } = await supabase
    .from("tournament_participants_raw")
    .select("id, torneo_id, challonge_id, challonge_username, nombre_participante")
    .is("player_id", null);
  if (error) throw error;

  console.log(`Pendientes al arrancar: ${pendientes.length}`);

  // --- Paso 1: agrupar por challonge_id ---
  const porChallongeId = new Map();
  for (const fila of pendientes) {
    if (!fila.challonge_id) continue;
    if (!porChallongeId.has(fila.challonge_id)) porChallongeId.set(fila.challonge_id, []);
    porChallongeId.get(fila.challonge_id).push(fila);
  }

  let creadosPorId = 0;
  let filasResueltasPorId = 0;

  for (const [challongeId, filas] of porChallongeId) {
    // Puede que ya se haya resuelto como "hermana" de un challonge_id
    // procesado antes en este mismo loop -- resolverParticipante ya lo
    // filtra (busca is player_id null), pero evitamos la llamada de mas.
    const { data: yaExiste } = await supabase
      .from("player_challonge_accounts")
      .select("player_id")
      .eq("challonge_id", challongeId)
      .maybeSingle();

    let playerId = yaExiste?.player_id;
    let tipoEvento = "vincular";

    if (!playerId) {
      const representativa = filas[0];
      const nombre = representativa.challonge_username || representativa.nombre_participante;
      const jugador = await crearJugador(supabase, nombre);
      playerId = jugador.id;
      tipoEvento = "crear_jugador";
      creadosPorId += 1;
    }

    const resultado = await resolverParticipante(supabase, {
      participanteId: filas[0].id,
      playerId,
      actorUserId: null,
      actorEmail: ACTOR_EMAIL,
      tipoEvento,
    });
    filasResueltasPorId += resultado.filas_resueltas;
  }

  console.log(
    `Paso 1 (challonge_id): ${porChallongeId.size} cuentas, ${creadosPorId} jugadores nuevos, ${filasResueltasPorId} filas resueltas.`,
  );

  // --- Paso 2: lo que quede, agrupar por challonge_username (sin challonge_id) ---
  const { data: restantes, error: restantesError } = await supabase
    .from("tournament_participants_raw")
    .select("id, torneo_id, challonge_id, challonge_username, nombre_participante")
    .is("player_id", null);
  if (restantesError) throw restantesError;

  const porUsername = new Map();
  const sinIdentificador = [];
  for (const fila of restantes) {
    const username = (fila.challonge_username || "").trim().toLowerCase();
    if (!username) {
      sinIdentificador.push(fila);
      continue;
    }
    if (!porUsername.has(username)) porUsername.set(username, []);
    porUsername.get(username).push(fila);
  }

  let creadosPorUsername = 0;
  let vinculadosAExistente = 0;
  let filasResueltasPorUsername = 0;

  for (const [username, filas] of porUsername) {
    const { data: cuenta } = await supabase
      .from("player_challonge_accounts")
      .select("player_id")
      .ilike("challonge_username", username)
      .maybeSingle();

    let playerId = cuenta?.player_id;

    if (playerId) {
      vinculadosAExistente += 1;
    } else {
      const representativa = filas[0];
      const jugador = await crearJugador(
        supabase,
        representativa.challonge_username || representativa.nombre_participante,
      );
      playerId = jugador.id;
      creadosPorUsername += 1;
    }

    for (const [indice, fila] of filas.entries()) {
      const resultado = await resolverParticipante(supabase, {
        participanteId: fila.id,
        playerId,
        actorUserId: null,
        actorEmail: ACTOR_EMAIL,
        tipoEvento: indice === 0 && !cuenta ? "crear_jugador" : "vincular",
      });
      filasResueltasPorUsername += resultado.filas_resueltas;
    }
  }

  console.log(
    `Paso 2 (username sin challonge_id): ${porUsername.size} usernames -- ` +
      `${creadosPorUsername} jugadores nuevos, ${vinculadosAExistente} linkeados a cuenta existente, ` +
      `${filasResueltasPorUsername} filas resueltas.`,
  );

  console.log(
    `Sin identificador (ni challonge_id ni username) -- quedan para revision manual: ${sinIdentificador.length}`,
  );
  for (const fila of sinIdentificador) {
    console.log(`  - participante #${fila.id} torneo ${fila.torneo_id}: "${fila.nombre_participante}"`);
  }

  const { count: totalPendientes } = await supabase
    .from("tournament_participants_raw")
    .select("id", { count: "exact", head: true })
    .is("player_id", null);

  console.log(`\nPendientes al terminar: ${totalPendientes}`);
}

await main();
