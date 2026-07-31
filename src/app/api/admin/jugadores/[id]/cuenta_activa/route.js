import { requireAdmin } from "@/lib/apiAuth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { registrarEvento } from "@/lib/identidadEventos";

export async function PATCH(req, { params }) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;
    const { user } = auth;

    const { id } = await params;
    const playerId = Number(id);
    if (!Number.isFinite(playerId)) {
      return Response.json({ error: "Id invalido" }, { status: 400 });
    }

    const { challongeId } = await req.json();
    if (!challongeId) {
      return Response.json({ error: "Se requiere challongeId" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    const { data: cuenta, error: cuentaError } = await supabase
      .from("player_challonge_accounts")
      .select("id, challonge_username")
      .eq("player_id", playerId)
      .eq("challonge_id", challongeId)
      .maybeSingle();

    if (cuentaError) throw cuentaError;
    if (!cuenta) {
      return Response.json(
        { error: "Esa cuenta de Challonge no pertenece a este jugador" },
        { status: 404 },
      );
    }

    // Desactivar todas las cuentas del jugador antes de activar la elegida:
    // el indice unico parcial (0005) solo permite una cuenta activa a la
    // vez, asi que activar directamente sin este paso previo violaria la
    // constraint si ya habia otra activa.
    const { error: desactivarError } = await supabase
      .from("player_challonge_accounts")
      .update({ active: false })
      .eq("player_id", playerId);
    if (desactivarError) throw desactivarError;

    const { error: activarError } = await supabase
      .from("player_challonge_accounts")
      .update({ active: true })
      .eq("id", cuenta.id);
    if (activarError) throw activarError;

    const { data: jugador } = await supabase
      .from("players")
      .select("display_name")
      .eq("id", playerId)
      .maybeSingle();

    await registrarEvento(supabase, {
      tipo: "cambiar_cuenta_activa",
      actorUserId: user.id,
      detalle: {
        player_id: playerId,
        display_name: jugador?.display_name ?? null,
        challonge_id: challongeId,
        challonge_username: cuenta.challonge_username,
        actor_email: user.email,
      },
    });

    return Response.json({ message: "Cuenta activa actualizada" }, { status: 200 });
  } catch (error) {
    console.error(error);
    return Response.json(
      { error: "Ocurrio un error al cambiar la cuenta activa" },
      { status: 500 },
    );
  }
}
