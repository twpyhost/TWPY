import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/apiAuth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { recalcularSnapshotsPorTorneos } from "@/lib/rankings";
import { registrarEvento } from "@/lib/identidadEventos";
import { puedeDeshacer } from "@/lib/identidadDeshacer";

export async function POST(req) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;
    const { user } = auth;

    const { eventoId } = await req.json();
    if (!eventoId) {
      return Response.json({ error: "Se requiere eventoId" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // Trae el log completo (no solo el evento pedido): el guard de
    // deshacer necesita ver que paso DESPUES de este evento.
    const { data: eventos, error: eventosError } = await supabase
      .from("identidad_eventos")
      .select("id, tipo, detalle, created_at")
      .order("created_at", { ascending: false })
      .limit(500);

    if (eventosError) throw eventosError;

    const evento = eventos.find((item) => item.id === eventoId);
    if (!evento) {
      return Response.json({ error: "Evento no encontrado" }, { status: 404 });
    }

    if (!puedeDeshacer(evento, eventos)) {
      return Response.json(
        { error: "No se puede deshacer: hubo otras acciones desde entonces" },
        { status: 409 },
      );
    }

    const participanteIds = evento.detalle?.participante_ids ?? [];
    let temporadasRecalculadas = [];

    if (participanteIds.length > 0) {
      const { data: filas, error: filasError } = await supabase
        .from("tournament_participants_raw")
        .select("torneo_id")
        .in("id", participanteIds);

      if (filasError) throw filasError;

      const { error: updateError } = await supabase
        .from("tournament_participants_raw")
        .update({ player_id: null, resolved_at: null, resolved_by: null })
        .in("id", participanteIds);

      if (updateError) throw updateError;

      temporadasRecalculadas = await recalcularSnapshotsPorTorneos(
        supabase,
        filas.map((fila) => fila.torneo_id),
      );
    }

    if (
      (evento.tipo === "vincular" || evento.tipo === "crear_jugador") &&
      evento.detalle?.cuenta_creada &&
      evento.detalle?.challonge_id
    ) {
      // player_aliases cascadea por FK on delete cascade.
      await supabase
        .from("player_challonge_accounts")
        .delete()
        .eq("challonge_id", evento.detalle.challonge_id)
        .eq("player_id", evento.detalle.player_id);
    }

    if (
      (evento.tipo === "crear_jugador" || evento.tipo === "registrar_manual") &&
      evento.detalle?.player_id
    ) {
      await supabase.from("players").delete().eq("id", evento.detalle.player_id);
    }

    await registrarEvento(supabase, {
      tipo: "deshacer",
      actorUserId: user.id,
      detalle: {
        evento_original_id: evento.id,
        tipo_original: evento.tipo,
        actor_email: user.email,
      },
    });

    revalidatePath("/ranking");
    revalidatePath("/competidores");
    revalidatePath("/torneos");

    return Response.json({ message: "Accion deshecha" }, { status: 200 });
  } catch (error) {
    console.error(error);
    return Response.json(
      { error: "Ocurrio un error al deshacer la accion" },
      { status: 500 },
    );
  }
}
