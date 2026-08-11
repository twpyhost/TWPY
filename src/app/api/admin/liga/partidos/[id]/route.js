import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/apiAuth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export async function PUT(req, { params }) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;
    const { user } = auth;

    const id = Number((await params).id);
    if (!Number.isInteger(id)) {
      return Response.json({ error: "Id de partido invalido" }, { status: 400 });
    }

    const { ganadorId } = await req.json();

    const supabase = getSupabaseAdmin();

    const { data: partido, error: partidoError } = await supabase
      .from("liga_partidos")
      .select("id, grupo_id, participante_a_id, participante_b_id")
      .eq("id", id)
      .maybeSingle();
    if (partidoError) throw partidoError;
    if (!partido) {
      return Response.json({ error: "Partido no encontrado" }, { status: 404 });
    }

    if (
      ganadorId != null &&
      ganadorId !== partido.participante_a_id &&
      ganadorId !== partido.participante_b_id
    ) {
      return Response.json(
        { error: "El ganador debe ser uno de los dos participantes del partido" },
        { status: 400 },
      );
    }

    const { data: grupo, error: grupoError } = await supabase
      .from("liga_grupos")
      .select("cerrado")
      .eq("id", partido.grupo_id)
      .maybeSingle();
    if (grupoError) throw grupoError;
    if (grupo?.cerrado) {
      return Response.json({ error: "El grupo esta cerrado" }, { status: 409 });
    }

    const { error: updateError } = await supabase
      .from("liga_partidos")
      .update({
        ganador_id: ganadorId ?? null,
        cargado_at: ganadorId ? new Date().toISOString() : null,
        cargado_by: ganadorId ? user.id : null,
      })
      .eq("id", id);
    if (updateError) throw updateError;

    revalidatePath("/liga");

    return Response.json({ message: "Resultado actualizado" }, { status: 200 });
  } catch (error) {
    console.error(error);
    return Response.json(
      { error: "Ocurrio un error al actualizar el partido" },
      { status: 500 },
    );
  }
}
