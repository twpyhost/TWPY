// Siembra y limpieza de los datos de la suite e2e. Corre una sola vez por
// corrida (globalSetup / globalTeardown) en vez de por archivo: asi ningun
// spec depende del orden de los demas y no se re-siembra 8 veces.
//
// Siempre contra el stack local (`supabase start`) -- ver tests/testSupabase.js.
import { getServiceClient } from "../../testSupabase.js";

import {
  CANTIDAD_JUGADORES,
  FECHA_ACTUAL,
  FECHA_PREVIA,
  FECHA_VIEJA,
  JUGADORES_TEMPORADA_ANTERIOR,
  PREFIJO_JUGADOR,
  TEMPORADA_ACTUAL,
  TEMPORADA_ANTERIOR,
  TORNEO_ACTUAL,
  TORNEO_PREVIO,
  TORNEO_VIEJO,
  nombreJugador,
} from "./datos.js";

const TORNEOS = [TORNEO_ACTUAL, TORNEO_PREVIO, TORNEO_VIEJO];

// Puntaje decreciente por posicion, con piso en 1 para que ninguna fila quede
// en 0 y se confunda con "sin datos".
function puntajeDe(posicion) {
  return Math.max(1, 200 - posicion * 4);
}

export async function limpiar() {
  const supabase = getServiceClient();

  // Los torneos caen primero: tournament_participants_raw y ranking_snapshots
  // tienen on delete cascade contra torneos.
  await supabase.from("torneos").delete().in("id", TORNEOS);
  // Los jugadores no cuelgan de ningun torneo, se borran por prefijo. Corre
  // tambien al arrancar, por si una corrida anterior murio antes del teardown.
  await supabase.from("players").delete().like("display_name", `${PREFIJO_JUGADOR} %`);
}

export async function sembrar() {
  const supabase = getServiceClient();

  await limpiar();

  const { data: juego, error: juegoError } = await supabase
    .from("juegos")
    .select("id")
    .ilike("nombre", "Tekken 8")
    .maybeSingle();

  if (juegoError) throw juegoError;
  if (!juego) {
    throw new Error(
      "No existe el juego 'Tekken 8' en la BD local: corre `npx supabase db reset` para aplicar las migraciones.",
    );
  }

  const { error: torneosError } = await supabase.from("torneos").insert([
    {
      id: TORNEO_ACTUAL,
      nombre: "Torneo E2E Actual",
      fecha_inicio: FECHA_ACTUAL,
      temporada: TEMPORADA_ACTUAL,
      juego_id: juego.id,
      url_challonge: "https://challonge.com/e2e_actual",
    },
    {
      id: TORNEO_PREVIO,
      nombre: "Torneo E2E Previo",
      fecha_inicio: FECHA_PREVIA,
      temporada: TEMPORADA_ACTUAL,
      juego_id: juego.id,
      // Sin url a proposito: cubre el caso del boton de bracket que no debe
      // renderizarse (historicos de la cuenta B importados sin url).
      url_challonge: null,
    },
    {
      id: TORNEO_VIEJO,
      nombre: "Torneo E2E Temporada Anterior",
      fecha_inicio: FECHA_VIEJA,
      temporada: TEMPORADA_ANTERIOR,
      juego_id: juego.id,
      url_challonge: "https://challonge.com/e2e_viejo",
    },
  ]);

  if (torneosError) throw torneosError;

  const nombres = Array.from({ length: CANTIDAD_JUGADORES }, (_, i) => ({
    display_name: nombreJugador(i + 1),
  }));

  const { data: jugadores, error: jugadoresError } = await supabase
    .from("players")
    .insert(nombres)
    .select("id, display_name");

  if (jugadoresError) throw jugadoresError;

  // Se reordena por nombre porque el insert no garantiza el orden de vuelta y
  // las posiciones tienen que ser deterministas para poder assertar sobre
  // "quien va primero".
  jugadores.sort((a, b) => a.display_name.localeCompare(b.display_name));

  const resueltoAhora = new Date().toISOString();

  const participantes = [];
  const snapshots = [];

  jugadores.forEach((jugador, indice) => {
    const posicion = indice + 1;

    // Torneo actual: todos participan, posicion = orden alfabetico.
    participantes.push({
      torneo_id: TORNEO_ACTUAL,
      nombre_participante: jugador.display_name,
      posicion,
      puntaje: puntajeDe(posicion),
      player_id: jugador.id,
      resolved_at: resueltoAhora,
    });
    snapshots.push({
      torneo_id: TORNEO_ACTUAL,
      player_id: jugador.id,
      temporada: TEMPORADA_ACTUAL,
      puntaje_acumulado: puntajeDe(posicion) * 2,
      posicion_global: posicion,
    });

    // Torneo previo de la misma temporada, con las posiciones rotadas en 1
    // para que la tabla publica muestre tendencias (flechas) reales.
    const posicionPrevia = ((indice + 1) % CANTIDAD_JUGADORES) + 1;
    participantes.push({
      torneo_id: TORNEO_PREVIO,
      nombre_participante: jugador.display_name,
      posicion: posicionPrevia,
      puntaje: puntajeDe(posicionPrevia),
      player_id: jugador.id,
      resolved_at: resueltoAhora,
    });
    snapshots.push({
      torneo_id: TORNEO_PREVIO,
      player_id: jugador.id,
      temporada: TEMPORADA_ACTUAL,
      puntaje_acumulado: puntajeDe(posicionPrevia),
      posicion_global: posicionPrevia,
    });
  });

  // Temporada anterior: solo los primeros jugadores, para que el cambio de
  // temporada sea observable (aparecen unos, desaparecen otros).
  jugadores.slice(0, JUGADORES_TEMPORADA_ANTERIOR).forEach((jugador, indice) => {
    const posicion = indice + 1;
    participantes.push({
      torneo_id: TORNEO_VIEJO,
      nombre_participante: jugador.display_name,
      posicion,
      puntaje: puntajeDe(posicion),
      player_id: jugador.id,
      resolved_at: resueltoAhora,
    });
    snapshots.push({
      torneo_id: TORNEO_VIEJO,
      player_id: jugador.id,
      temporada: TEMPORADA_ANTERIOR,
      puntaje_acumulado: puntajeDe(posicion),
      posicion_global: posicion,
    });
  });

  const { error: participantesError } = await supabase
    .from("tournament_participants_raw")
    .insert(participantes);
  if (participantesError) throw participantesError;

  const { error: snapshotsError } = await supabase
    .from("ranking_snapshots")
    .insert(snapshots);
  if (snapshotsError) throw snapshotsError;

  return { jugadores };
}
