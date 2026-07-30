import { requireAdmin } from "@/lib/apiAuth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET() {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const supabase = getSupabaseAdmin();

    const { data: jugadores, error: jugadoresError } = await supabase
      .from("players")
      .select("id, display_name, avatar_url")
      .is("merged_into_player_id", null)
      .order("display_name", { ascending: true });

    if (jugadoresError) throw jugadoresError;

    const { data: participantes, error: participantesError } = await supabase
      .from("tournament_participants_raw")
      .select("player_id")
      .not("player_id", "is", null);

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
        .eq("torneo_id", ultimoTorneo.id);

      if (snapshotsError) throw snapshotsError;
      posicionPorJugador = new Map(snapshots.map((s) => [s.player_id, s.posicion_global]));
    }

    const resultado = jugadores.map((jugador) => ({
      id: jugador.id,
      display_name: jugador.display_name,
      avatar_url: jugador.avatar_url,
      torneos_jugados: torneosPorJugador.get(jugador.id) ?? 0,
      posicion_actual: posicionPorJugador.get(jugador.id) ?? null,
    }));

    return Response.json({ jugadores: resultado }, { status: 200 });
  } catch (error) {
    console.error(error);
    return Response.json(
      { error: "Ocurrio un error al obtener los jugadores" },
      { status: 500 },
    );
  }
}
