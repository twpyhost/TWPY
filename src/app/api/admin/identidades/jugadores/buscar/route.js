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

    const jugadores = data.map((jugador) => ({
      id: jugador.id,
      display_name: jugador.display_name,
      cuentas_challonge: jugador.player_challonge_accounts?.length ?? 0,
      torneos_jugados: jugador.tournament_participants_raw?.length ?? 0,
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
