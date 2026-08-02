import { requireAdmin } from "@/lib/apiAuth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { consultarPagina, escaparLike, leerPaginacion } from "@/lib/paginacion";

export async function GET(req) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const supabase = getSupabaseAdmin();

    const { searchParams } = new URL(req.url);
    const { pagina, porPagina, q, desde, hasta } = leerPaginacion(searchParams);

    // El filtro por nombre va en la query, no en el cliente: con paginacion
    // server-side, filtrar en memoria buscaria solo dentro de la pagina.
    const construir = ({ head }) => {
      let consulta = supabase
        .from("players")
        .select(
          "id, display_name, avatar_url, player_challonge_accounts ( challonge_username, active )",
          { count: "exact", head },
        )
        .is("merged_into_player_id", null);

      if (q) {
        consulta = consulta.ilike("display_name", `%${escaparLike(q)}%`);
      }

      return consulta.order("display_name", { ascending: true });
    };

    const { filas: jugadores, total } = await consultarPagina(construir, { desde, hasta });

    // Los agregados se acotan a los jugadores de la pagina en vez de traer
    // todas las participaciones del historico.
    const idsPagina = jugadores.map((jugador) => jugador.id);

    const { data: participantes, error: participantesError } = await supabase
      .from("tournament_participants_raw")
      .select("player_id")
      .in("player_id", idsPagina.length > 0 ? idsPagina : [-1]);

    if (participantesError) throw participantesError;

    const torneosPorJugador = new Map();
    for (const participante of participantes) {
      torneosPorJugador.set(
        participante.player_id,
        (torneosPorJugador.get(participante.player_id) ?? 0) + 1,
      );
    }

    const { data: ultimoTorneo, error: ultimoTorneoError } = await supabase
      .from("torneos")
      .select("id")
      .order("temporada", { ascending: false })
      .order("fecha_inicio", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (ultimoTorneoError) throw ultimoTorneoError;

    let posicionPorJugador = new Map();
    if (ultimoTorneo) {
      const { data: snapshots, error: snapshotsError } = await supabase
        .from("ranking_snapshots")
        .select("player_id, posicion_global")
        .eq("torneo_id", ultimoTorneo.id)
        .in("player_id", idsPagina.length > 0 ? idsPagina : [-1]);

      if (snapshotsError) throw snapshotsError;
      posicionPorJugador = new Map(snapshots.map((s) => [s.player_id, s.posicion_global]));
    }

    const resultado = jugadores.map((jugador) => ({
      id: jugador.id,
      display_name: jugador.display_name,
      avatar_url: jugador.avatar_url,
      aliases: (jugador.player_challonge_accounts ?? []).map((c) => c.challonge_username),
      torneos_jugados: torneosPorJugador.get(jugador.id) ?? 0,
      posicion_actual: posicionPorJugador.get(jugador.id) ?? null,
    }));

    return Response.json(
      { jugadores: resultado, total, pagina, porPagina },
      { status: 200 },
    );
  } catch (error) {
    console.error(error);
    return Response.json(
      { error: "Ocurrio un error al obtener los jugadores" },
      { status: 500 },
    );
  }
}
