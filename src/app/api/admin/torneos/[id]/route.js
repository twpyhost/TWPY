import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/apiAuth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { eliminarTorneo } from "@/lib/torneos";

export async function GET(req, { params }) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const { id } = await params;
    const torneoId = Number(id);
    if (!Number.isFinite(torneoId)) {
      return Response.json({ error: "Id de torneo invalido" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    const { data: torneo, error: torneoError } = await supabase
      .from("torneos")
      .select("id, nombre, fecha_inicio, temporada, challonge_source_account, url_challonge")
      .eq("id", torneoId)
      .maybeSingle();

    if (torneoError) throw torneoError;
    if (!torneo) {
      return Response.json({ error: "El torneo no existe" }, { status: 404 });
    }

    const { data: participantes, error: participantesError } = await supabase
      .from("tournament_participants_raw")
      .select(
        "id, challonge_id, challonge_username, nombre_participante, posicion, puntaje, player_id, jugador:players ( id, display_name )",
      )
      .eq("torneo_id", torneoId)
      .order("posicion", { ascending: true });

    if (participantesError) throw participantesError;

    const participantesResultado = participantes.map((p) => ({
      id: p.id,
      nombre_participante: p.nombre_participante,
      posicion: p.posicion,
      puntaje: p.puntaje,
      estado: p.player_id
        ? "vinculado"
        : p.challonge_id
          ? "pendiente"
          : "sin_cuenta",
      jugador: p.jugador ? { id: p.jugador.id, nombre: p.jugador.display_name } : null,
    }));

    return Response.json(
      { torneo, participantes: participantesResultado },
      { status: 200 },
    );
  } catch (error) {
    console.error(error);
    return Response.json(
      { error: "Ocurrio un error al obtener el torneo" },
      { status: 500 },
    );
  }
}

export async function DELETE(req, { params }) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;
    const { user } = auth;

    const { id } = await params;
    const torneoId = Number(id);
    if (!Number.isFinite(torneoId)) {
      return Response.json({ error: "Id de torneo invalido" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    const resultado = await eliminarTorneo(supabase, torneoId);
    if (!resultado) {
      return Response.json({ error: "El torneo no existe" }, { status: 404 });
    }

    await supabase.from("sistema_eventos").insert({
      tipo: "torneo_eliminado",
      ok: true,
      detalle: {
        torneo_id: torneoId,
        nombre: resultado.nombre,
        temporada: resultado.temporada,
        actor_email: user.email,
      },
    });

    revalidatePath("/ranking");
    revalidatePath("/competidores");
    revalidatePath("/torneos");
    revalidatePath(`/torneo-resultado/${torneoId}`);

    return Response.json(
      { message: "Torneo eliminado", temporada: resultado.temporada },
      { status: 200 },
    );
  } catch (error) {
    console.error(error);
    return Response.json(
      { error: "Ocurrio un error al eliminar el torneo" },
      { status: 500 },
    );
  }
}
