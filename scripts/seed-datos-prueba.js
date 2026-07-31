// Siembra el Supabase de prueba con datos pseudo-reales para verificar el
// sitio publico y el panel admin end-to-end.
//
//   node --env-file=.env.local scripts/seed-datos-prueba.js
//
// Es re-ejecutable: arranca purgando lo sembrado antes. Los ranking_snapshots
// NO se escriben a mano -- se calculan con recalcularSnapshots(), el mismo
// codigo que usa la importacion real, para que no puedan divergir.

import { writeFile } from "node:fs/promises";

import { getSupabaseAdmin } from "../src/lib/supabaseAdmin.js";
import { recalcularSnapshots } from "../src/lib/rankings.js";
import { purgar, MANIFIESTO } from "./purgar-datos-prueba.js";
import {
  TORNEOS,
  JUGADORES,
  DUPLICADO_FUSIONADO,
  SIN_VINCULAR,
  MAX_PARTICIPANTES,
  posicionesBracket,
  prng,
} from "./datos-prueba.js";

const SEMILLA = 20260731;

function reventar(error, contexto) {
  if (error) {
    throw new Error(`${contexto}: ${error.message}`);
  }
}

async function insertar(supabase, tabla, filas, contexto, select = "id") {
  const { data, error } = await supabase
    .from(tabla)
    .insert(filas)
    .select(select);
  reventar(error, contexto);
  return data;
}

// Elige quienes fueron al torneo (sesgado por nivel: los fuertes van a casi
// todos) y los ordena por nivel + ruido para que el podio varie de fecha en
// fecha sin volverse aleatorio del todo.
function armarStandings(candidatos, cantidad, random) {
  const asistentes = candidatos
    .map((jugador) => ({
      jugador,
      peso: jugador.nivel * 0.7 + random() * 45,
    }))
    .sort((a, b) => b.peso - a.peso)
    .slice(0, cantidad);

  return asistentes
    .map(({ jugador }) => ({
      jugador,
      fuerza: jugador.nivel + (random() - 0.5) * 22,
    }))
    .sort((a, b) => b.fuerza - a.fuerza)
    .map(({ jugador }) => jugador);
}

async function main() {
  const supabase = getSupabaseAdmin();

  console.log("1/7 Purgando datos de prueba previos...");
  await purgar(supabase, { silencioso: true });

  console.log("2/7 Puntajes por posicion...");
  const { data: config, error: configError } = await supabase
    .from("puntajes_config")
    .select("posicion, puntos");
  reventar(configError, "leyendo puntajes_config");
  const puntos = new Map(config.map((fila) => [fila.posicion, fila.puntos]));

  const { data: juego, error: juegoError } = await supabase
    .from("juegos")
    .select("id")
    .ilike("nombre", "Tekken 8")
    .single();
  reventar(juegoError, "leyendo el juego Tekken 8");

  console.log("3/7 Torneos...");
  await insertar(
    supabase,
    "torneos",
    TORNEOS.map(({ participantes, ...torneo }) => ({
      ...torneo,
      juego_id: juego.id,
    })),
    "insertando torneos",
  );

  console.log("4/7 Jugadores, cuentas y alias...");
  const playersInsertados = await insertar(
    supabase,
    "players",
    [
      ...JUGADORES.map((j) => ({ display_name: j.nick })),
      { display_name: DUPLICADO_FUSIONADO.nick },
    ],
    "insertando players",
    "id, display_name",
  );
  const idPorNick = new Map(
    playersInsertados.map((p) => [p.display_name, p.id]),
  );
  const idsPlayers = playersInsertados.map((p) => p.id);

  const { error: fusionError } = await supabase
    .from("players")
    .update({
      merged_into_player_id: idPorNick.get(DUPLICADO_FUSIONADO.fusionado_en),
    })
    .eq("id", idPorNick.get(DUPLICADO_FUSIONADO.nick));
  reventar(fusionError, "marcando el player fusionado");

  const cuentas = [];
  const alias = [];
  for (const jugador of JUGADORES) {
    for (const cuenta of jugador.cuentas ?? []) {
      cuentas.push({
        player_id: idPorNick.get(jugador.nick),
        challonge_id: cuenta.challonge_id,
        challonge_username: cuenta.username,
        active: cuenta.active !== false,
      });
      alias.push({
        challonge_id: cuenta.challonge_id,
        nombre: cuenta.username,
        activo: true,
      });
    }
    if (jugador.alias_previo) {
      alias.push({
        challonge_id: jugador.cuentas[0].challonge_id,
        nombre: jugador.alias_previo,
        activo: false,
      });
    }
  }
  await insertar(
    supabase,
    "player_challonge_accounts",
    cuentas,
    "insertando cuentas",
  );
  await insertar(
    supabase,
    "player_aliases",
    alias,
    "insertando alias",
    "challonge_id",
  );

  console.log("5/7 Participantes por torneo...");
  const random = prng(SEMILLA);
  const cuentaActivaPorNick = new Map(
    JUGADORES.filter((j) => j.cuentas).map((j) => [
      j.nick,
      j.cuentas.find((c) => c.active !== false),
    ]),
  );
  const filasRaw = [];
  const advertencias = [];

  for (const torneo of TORNEOS) {
    const cantidad = Math.min(torneo.participantes, MAX_PARTICIPANTES);
    const orden = armarStandings(JUGADORES, cantidad, random);
    const posiciones = posicionesBracket(cantidad);

    orden.forEach((jugador, indice) => {
      const posicion = posiciones[indice];
      const cuenta = cuentaActivaPorNick.get(jugador.nick);
      if (!puntos.has(posicion)) {
        advertencias.push(`posicion ${posicion} sin puntaje configurado`);
      }
      filasRaw.push({
        torneo_id: torneo.id,
        challonge_id: cuenta?.challonge_id ?? null,
        challonge_username: cuenta?.username ?? null,
        nombre_participante: cuenta?.username ?? jugador.nick,
        posicion,
        puntaje: puntos.get(posicion) ?? 0,
        player_id: idPorNick.get(jugador.nick),
        resolved_at: new Date().toISOString(),
      });
    });
  }

  // Escenario 3: los sin resolver ocupan posiciones extra al final del bracket
  // de su torneo, con player_id null -> cola de /admin/identidades.
  for (const pendiente of SIN_VINCULAR) {
    filasRaw.push({
      torneo_id: pendiente.torneo_id,
      challonge_id: pendiente.challonge_id,
      challonge_username: pendiente.challonge_username,
      nombre_participante: pendiente.nombre_participante,
      posicion: pendiente.posicion,
      puntaje: puntos.get(pendiente.posicion) ?? 0,
      player_id: null,
    });
  }

  await insertar(
    supabase,
    "tournament_participants_raw",
    filasRaw,
    "insertando participantes",
  );
  if (advertencias.length) {
    console.warn(`  advertencias: ${[...new Set(advertencias)].join(", ")}`);
  }

  console.log("6/7 Recalculando ranking_snapshots...");
  for (const temporada of [
    ...new Set(TORNEOS.map((t) => t.temporada)),
  ].sort()) {
    await recalcularSnapshots(supabase, temporada);
    console.log(`  temporada ${temporada} lista`);
  }

  console.log("7/7 Eventos de identidad y sistema...");
  const ahora = Date.now();
  const haceHoras = (h) => new Date(ahora - h * 3600_000).toISOString();

  const identidadEventos = await insertar(
    supabase,
    "identidad_eventos",
    [
      {
        tipo: "vincular",
        detalle: {
          challonge_id: 8100015,
          player_id: idPorNick.get("Yvyra"),
          origen: "datos de prueba",
        },
        created_at: haceHoras(52),
      },
      {
        tipo: "registrar_manual",
        detalle: {
          player_id: idPorNick.get("Rodri (registro manual)"),
          nombre: "Rodri (registro manual)",
          origen: "datos de prueba",
        },
        created_at: haceHoras(30),
      },
      {
        tipo: "fusionar",
        detalle: {
          base_player_id: idPorNick.get(DUPLICADO_FUSIONADO.fusionado_en),
          duplicado_player_id: idPorNick.get(DUPLICADO_FUSIONADO.nick),
          origen: "datos de prueba",
        },
        created_at: haceHoras(6),
      },
    ],
    "insertando identidad_eventos",
  );

  const sistemaEventos = await insertar(
    supabase,
    "sistema_eventos",
    [
      {
        tipo: "health",
        ok: true,
        detalle: { origen: "datos de prueba" },
        created_at: haceHoras(72),
      },
      {
        tipo: "health",
        ok: false,
        detalle: { origen: "datos de prueba", error: "timeout" },
        created_at: haceHoras(48),
      },
      {
        tipo: "import",
        ok: true,
        detalle: { torneo_id: 800007, participantes: 32 },
        created_at: haceHoras(20),
      },
      {
        tipo: "health",
        ok: true,
        detalle: { origen: "datos de prueba" },
        created_at: haceHoras(1),
      },
    ],
    "insertando sistema_eventos",
  );

  await writeFile(
    MANIFIESTO,
    `${JSON.stringify(
      {
        generado: new Date().toISOString(),
        players: idsPlayers,
        identidad_eventos: identidadEventos.map((e) => e.id),
        sistema_eventos: sistemaEventos.map((e) => e.id),
      },
      null,
      2,
    )}\n`,
  );

  console.log(
    `\nListo: ${TORNEOS.length} torneos, ${idsPlayers.length} players, ` +
      `${filasRaw.length} participantes (${SIN_VINCULAR.length} sin vincular).`,
  );
  console.log("Para deshacer: npm run seed:purgar");
}

await main();
