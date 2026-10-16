import { createClient } from "@supabase/supabase-js";

import { getMovimiento } from "./movimiento";
import { armarLiga } from "@/lib/ligaData";
import { isPublicId, projectPlayerProfile, resolvePublicPlayerTarget } from "../playerProfiles.js";

let client = null;

function getClient() {
  if (!client) {
    client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { auth: { persistSession: false } },
    );
  }

  return client;
}

const getTorneos = async () => {
  const { data, error } = await getClient()
    .from("torneos")
    .select("id, nombre, fecha_inicio, temporada, url_challonge")
    .order("fecha_inicio", { ascending: false });

  if (error) {
    throw new Error(`Error al obtener torneos: ${error.message}`);
  }

  return data.map((torneo) => ({
    torneo_id: torneo.id,
    nombre_torneo: torneo.nombre,
    fecha_torneo: torneo.fecha_inicio,
    temporada: String(torneo.temporada),
    url_challonge: torneo.url_challonge ?? null,
  }));
};

const getTorneoResultados = async (torneoId) => {
  const id = Number(torneoId);
  if (!Number.isFinite(id)) {
    return null;
  }

  // torneo_resultados_publicos ya filtra pendientes de resolucion y jugadores
  // fusionados -- tournament_participants_raw no debe leerse desde paginas
  // publicas (no tiene policy de select para anon).
  const { data, error } = await getClient()
    .from("torneo_resultados_publicos")
    .select("torneo_nombre, player_id, jugador_nombre, posicion, puntaje")
    .eq("torneo_id", id)
    .order("posicion", { ascending: true });

  if (error) {
    throw new Error(`Error al obtener resultados: ${error.message}`);
  }

  if (!data || data.length === 0) {
    return null;
  }

  return data.map((resultado) => ({
    torneo: {
      nombre_torneo: resultado.torneo_nombre,
    },
    jugador: {
      id: resultado.player_id,
      nombre: resultado.jugador_nombre,
    },
    posicion: resultado.posicion,
    puntaje: resultado.puntaje,
  }));
};

const getCompetidores = async () => {
  const { data, error } = await getClient()
    .from("players")
    .select("id, display_name");

  if (error) {
    throw new Error(`Error al obtener competidores: ${error.message}`);
  }

  return data
    .map((jugador) => ({ id: jugador.id, nombre: jugador.display_name }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre));
};

const getRankings = async (temporada) => {
  const supabase = getClient();

  // Ultimos dos torneos de la temporada pedida (o de la mas reciente si no
  // se especifica una): el ultimo define el ranking y el anterior sirve
  // para calcular el movimiento.
  let torneosQuery = supabase
    .from("torneos")
    .select("id, temporada")
    .order("temporada", { ascending: false })
    .order("fecha_inicio", { ascending: false })
    .order("id", { ascending: false });

  if (temporada) {
    torneosQuery = torneosQuery.eq("temporada", temporada);
  }

  const { data: ultimosTorneos, error: torneosError } = await torneosQuery.limit(2);

  if (torneosError) {
    throw new Error(`Error al obtener torneos: ${torneosError.message}`);
  }

  if (!ultimosTorneos || ultimosTorneos.length === 0) {
    return [];
  }

  const [ultimo, anterior] = ultimosTorneos;

  const { data: snapshots, error: snapshotsError } = await supabase
    .from("ranking_snapshots")
    .select(
      "player_id, posicion_global, puntaje_acumulado, jugador:players ( id, display_name )",
    )
    .eq("torneo_id", ultimo.id)
    .order("posicion_global", { ascending: true });

  if (snapshotsError) {
    throw new Error(`Error al obtener ranking: ${snapshotsError.message}`);
  }

  const posicionesAnteriores = new Map();
  if (anterior && anterior.temporada === ultimo.temporada) {
    const { data: previos, error: previosError } = await supabase
      .from("ranking_snapshots")
      .select("player_id, posicion_global")
      .eq("torneo_id", anterior.id);

    if (previosError) {
      throw new Error(
        `Error al obtener ranking anterior: ${previosError.message}`,
      );
    }

    previos.forEach((snapshot) => {
      posicionesAnteriores.set(snapshot.player_id, snapshot.posicion_global);
    });
  }

  return snapshots.map((snapshot) => ({
    id: snapshot.jugador.id,
    posicion: snapshot.posicion_global,
    nombre: snapshot.jugador.display_name,
    puntaje: snapshot.puntaje_acumulado,
    movimiento: getMovimiento(
      snapshot.posicion_global,
      posicionesAnteriores.get(snapshot.player_id),
    ),
  }));
};

const getRankingsCount = async (temporada) => {
  const supabase = getClient();

  let torneosQuery = supabase
    .from("torneos")
    .select("id, temporada")
    .order("temporada", { ascending: false })
    .order("fecha_inicio", { ascending: false })
    .order("id", { ascending: false });

  if (temporada) {
    torneosQuery = torneosQuery.eq("temporada", temporada);
  }

  const { data: ultimosTorneos, error: torneosError } =
    await torneosQuery.limit(1);

  if (torneosError) {
    throw new Error(`Error al obtener torneos: ${torneosError.message}`);
  }

  if (!ultimosTorneos || ultimosTorneos.length === 0) {
    return 0;
  }

  const { count, error: countError } = await supabase
    .from("ranking_snapshots")
    .select("player_id", { count: "exact", head: true })
    .eq("torneo_id", ultimosTorneos[0].id);

  if (countError) {
    throw new Error(`Error al contar ranking: ${countError.message}`);
  }

  return count ?? 0;
};

const getFiltroAno = async () => {
  const { data, error } = await getClient()
    .from("torneos")
    .select("temporada")
    .order("temporada", { ascending: false });

  if (error) {
    throw new Error(`Error al obtener temporadas: ${error.message}`);
  }

  return [...new Set(data.map((torneo) => String(torneo.temporada)))];
};

const getLiga = async (slug) => {
  const supabase = getClient();

  const { data: liga, error: ligaError } = await supabase
    .from("ligas")
    .select("id, slug, nombre, temporada, estado")
    .eq("slug", slug)
    .maybeSingle();

  if (ligaError) {
    throw new Error(`Error al obtener la liga: ${ligaError.message}`);
  }
  if (!liga) {
    return null;
  }

  const { data: fechas, error: fechasError } = await supabase
    .from("liga_fechas")
    .select("id, numero, fecha, hora")
    .eq("liga_id", liga.id);

  if (fechasError) {
    throw new Error(`Error al obtener las fechas de la liga: ${fechasError.message}`);
  }

  const { data: grupos, error: gruposError } = await supabase
    .from("liga_grupos")
    .select("id, numero, nombre, cupos_clasificados, cerrado")
    .eq("liga_id", liga.id);

  if (gruposError) {
    throw new Error(`Error al obtener los grupos de la liga: ${gruposError.message}`);
  }

  const grupoIds = grupos.map((g) => g.id);
  if (grupoIds.length === 0) {
    return armarLiga({ liga, fechas, grupos, participantes: [], partidos: [] });
  }

  const { data: participantes, error: participantesError } = await supabase
    .from("liga_participantes")
    .select("id, grupo_id, nombre, player_id, orden_desempate")
    .in("grupo_id", grupoIds);

  if (participantesError) {
    throw new Error(
      `Error al obtener los participantes de la liga: ${participantesError.message}`,
    );
  }

  const { data: partidos, error: partidosError } = await supabase
    .from("liga_partidos")
    .select(
      "id, grupo_id, fecha_id, participante_a_id, participante_b_id, orden, ganador_id, matches_a, matches_b, resultado_tipo",
    )
    .in("grupo_id", grupoIds);

  if (partidosError) {
    throw new Error(`Error al obtener los partidos de la liga: ${partidosError.message}`);
  }

  return armarLiga({ liga, fechas, grupos, participantes, partidos });
};

const getPublicPlayerTarget = async (playerId) => {
  if (!isPublicId(playerId)) return null;
  // Active records use the anonymous projection. Hidden merge pointers are
  // resolved server-side with a narrowly selected privileged lookup only.
  return resolvePublicPlayerTarget(playerId, async (id) => {
    const visible = await getClient().from("players").select("id::text,merged_into_player_id::text").eq("id", id).maybeSingle();
    if (visible.error) throw visible.error;
    if (visible.data) return visible.data;
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
    const { getSupabaseAdmin } = await import("../supabaseAdmin.js");
    const hidden = await getSupabaseAdmin().from("players").select("id::text,merged_into_player_id::text").eq("id", id).maybeSingle();
    if (hidden.error) throw hidden.error;
    return hidden.data;
  });
};

const getPlayerProfile = async (playerId, year) => {
  if (!isPublicId(playerId) || (year !== undefined && !/^\d{4}$/.test(year))) return null;
  const supabase = getClient();
  const { data: player, error } = await supabase.from("players").select("id::text,display_name,avatar_url").eq("id", playerId).maybeSingle();
  if (error) throw error;
  if (!player) return null;
  const season = year ?? (await getFiltroAno())[0] ?? new Intl.DateTimeFormat("en", { year: "numeric", timeZone: "America/Asuncion" }).format(new Date());
  const [characters, accounts, results, torneos] = await Promise.all([
    supabase.from("player_characters").select("character_key,is_main").eq("player_id", playerId).order("character_key"),
    supabase.from("player_tekken_accounts").select("tekken_id,is_public").eq("player_id", playerId).eq("is_public", true).order("id"),
    supabase.from("torneo_resultados_publicos").select("torneo_id::text,posicion,puntaje").eq("player_id", playerId),
    supabase.from("torneos").select("id::text,nombre,fecha_inicio").eq("temporada", season).order("fecha_inicio", { ascending: false }).order("id", { ascending: false }),
  ]);
  for (const result of [characters, accounts, results, torneos]) if (result.error) throw result.error;
  const byId = new Map(torneos.data.map((t) => [String(t.id), t]));
  let ranking = null;
  if (torneos.data[0]) {
    const snapshot = await supabase.from("ranking_snapshots").select("posicion_global,puntaje_acumulado").eq("torneo_id", torneos.data[0].id).eq("player_id", playerId).maybeSingle();
    if (snapshot.error) throw snapshot.error;
    if (snapshot.data) ranking = { posicion: snapshot.data.posicion_global, puntaje: snapshot.data.puntaje_acumulado };
  }
  return projectPlayerProfile({
    player, season, characters: characters.data, accounts: accounts.data, ranking,
    results: results.data.filter((r) => byId.has(String(r.torneo_id))).map((r) => {
      const t = byId.get(String(r.torneo_id));
      return { tournamentId: String(t.id), title: t.nombre, date: t.fecha_inicio, placement: r.posicion, points: r.puntaje };
    }).sort((a, b) => b.date.localeCompare(a.date) || (BigInt(a.tournamentId) < BigInt(b.tournamentId) ? 1 : -1)),
  });
};

export {
  getTorneos,
  getRankings,
  getCompetidores,
  getFiltroAno,
  getTorneoResultados,
  getRankingsCount,
  getLiga,
  getPlayerProfile,
  getPublicPlayerTarget,
};
