import { requireAdmin } from "@/lib/apiAuth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(_req, { params }) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const { id } = await params;
    const playerId = Number(id);
    if (!Number.isFinite(playerId)) {
      return Response.json({ error: "Id invalido" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    const { data: jugador, error: jugadorError } = await supabase
      .from("players")
      .select(
        "id, display_name, avatar_url, discord_id, player_challonge_accounts ( challonge_id, challonge_username, active )",
      )
      .eq("id", playerId)
      .maybeSingle();

    if (jugadorError) throw jugadorError;
    if (!jugador) {
      return Response.json({ error: "Jugador no encontrado" }, { status: 404 });
    }

    const { data: participaciones, error: participacionesError } = await supabase
      .from("tournament_participants_raw")
      .select(
        "puntaje, posicion, torneo:torneos ( id, nombre, fecha_inicio )",
      )
      .eq("player_id", playerId);

    if (participacionesError) throw participacionesError;

    const historial = [...participaciones]
      .sort((a, b) => (b.torneo?.fecha_inicio ?? "").localeCompare(a.torneo?.fecha_inicio ?? ""))
      .map((p) => ({
        torneo_id: p.torneo?.id ?? null,
        torneo_nombre: p.torneo?.nombre ?? "Torneo",
        fecha: p.torneo?.fecha_inicio ?? null,
        posicion: p.posicion,
        puntaje: p.puntaje,
      }));

    const { data: snapshots, error: snapshotsError } = await supabase
      .from("ranking_snapshots")
      .select("posicion_global, torneo:torneos ( fecha_inicio )")
      .eq("player_id", playerId);

    if (snapshotsError) throw snapshotsError;

    const ultimoSnapshot = [...snapshots].sort((a, b) =>
      (b.torneo?.fecha_inicio ?? "").localeCompare(a.torneo?.fecha_inicio ?? ""),
    )[0];

    return Response.json(
      {
        jugador: {
          id: jugador.id,
          display_name: jugador.display_name,
          avatar_url: jugador.avatar_url,
          discord_id: jugador.discord_id,
          torneos_jugados: participaciones.length,
          puntaje_total: participaciones.reduce((sum, p) => sum + p.puntaje, 0),
          posicion_actual: ultimoSnapshot?.posicion_global ?? null,
          cuentas: jugador.player_challonge_accounts ?? [],
          historial,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error(error);
    return Response.json(
      { error: "Ocurrio un error al obtener el detalle del jugador" },
      { status: 500 },
    );
  }
}
