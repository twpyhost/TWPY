import { requireAdmin } from "@/lib/apiAuth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(req) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();

    if (!q) {
      return Response.json({ jugadores: [] }, { status: 200 });
    }

    const supabase = getSupabaseAdmin();

    // service_role ignora RLS: hay que excluir fusionados a mano (la
    // policy publica de "players" ya hace esto para el resto de la app).
    const { data, error } = await supabase
      .from("players")
      .select(
        "id, display_name, player_challonge_accounts ( id ), tournament_participants_raw ( id )",
      )
      .ilike("display_name", `%${q}%`)
      .is("merged_into_player_id", null)
      .limit(15);

    if (error) throw error;

    const ids = data.map((jugador) => jugador.id);
    const { data: snapshots, error: snapshotsError } = await supabase
      .from("ranking_snapshots")
      .select("player_id, posicion_global, torneo:torneos ( fecha_inicio )")
      .in("player_id", ids.length > 0 ? ids : [-1]);

    if (snapshotsError) throw snapshotsError;

    const posicionPorJugador = new Map();
    for (const snapshot of snapshots) {
      const actual = posicionPorJugador.get(snapshot.player_id);
      const fecha = snapshot.torneo?.fecha_inicio ?? "";
      if (!actual || fecha > actual.fecha) {
        posicionPorJugador.set(snapshot.player_id, {
          fecha,
          posicion: snapshot.posicion_global,
        });
      }
    }

    const jugadores = data.map((jugador) => ({
      id: jugador.id,
      display_name: jugador.display_name,
      cuentas_challonge: jugador.player_challonge_accounts?.length ?? 0,
      torneos_jugados: jugador.tournament_participants_raw?.length ?? 0,
      posicion_actual: posicionPorJugador.get(jugador.id)?.posicion ?? null,
    }));

    return Response.json({ jugadores }, { status: 200 });
  } catch (error) {
    console.error(error);
    return Response.json(
      { error: "Ocurrio un error al buscar jugadores" },
      { status: 500 },
    );
  }
}
