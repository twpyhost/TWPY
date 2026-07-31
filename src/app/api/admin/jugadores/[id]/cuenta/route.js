import { requireAdmin } from "@/lib/apiAuth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { registrarEvento } from "@/lib/identidadEventos";

// Desvincula una cuenta de Challonge de un jugador (boton "x" en la ficha).
// No borra el historial ya resuelto (tournament_participants_raw.player_id
// no depende de esta fila), solo evita que ese challonge_id se
// auto-resuelva a este jugador en futuras importaciones.
export async function DELETE(req, { params }) {
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

    const { error: deleteError } = await supabase
      .from("player_challonge_accounts")
      .delete()
      .eq("id", cuenta.id);
    if (deleteError) throw deleteError;

    await registrarEvento(supabase, {
      tipo: "eliminar_cuenta_challonge",
      actorUserId: user.id,
      detalle: {
        player_id: playerId,
        challonge_id: challongeId,
        challonge_username: cuenta.challonge_username,
        actor_email: user.email,
      },
    });

    return Response.json({ message: "Cuenta desvinculada" }, { status: 200 });
  } catch (error) {
    console.error(error);
    return Response.json(
      { error: "Ocurrio un error al desvincular la cuenta" },
      { status: 500 },
    );
  }
}
