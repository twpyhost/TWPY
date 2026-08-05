import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/apiAuth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { obtenerLigaActual, obtenerGrupoPorNumero } from "@/lib/ligaAdmin";

export async function PUT(req, { params }) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const numero = Number((await params).numero);
    if (!Number.isInteger(numero)) {
      return Response.json({ error: "Numero de grupo invalido" }, { status: 400 });
    }

    const { orden } = await req.json();
    if (!Array.isArray(orden) || orden.length === 0) {
      return Response.json({ error: "Se requiere un orden con al menos un participante" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const liga = await obtenerLigaActual(supabase);
    if (!liga) {
      return Response.json({ error: "No hay ninguna liga cargada" }, { status: 404 });
    }

    const grupo = await obtenerGrupoPorNumero(supabase, liga.id, numero);
    if (!grupo) {
      return Response.json({ error: "Grupo no encontrado" }, { status: 404 });
    }

    const { data: participantes, error: participantesError } = await supabase
      .from("liga_participantes")
      .select("id")
      .eq("grupo_id", grupo.id);
    if (participantesError) throw participantesError;

    const idsDelGrupo = new Set(participantes.map((p) => p.id));
    if (!orden.every((id) => idsDelGrupo.has(id))) {
      return Response.json(
        { error: "El orden incluye participantes que no son de este grupo" },
        { status: 400 },
      );
    }

    for (let i = 0; i < orden.length; i += 1) {
      const { error: updateError } = await supabase
        .from("liga_participantes")
        .update({ orden_desempate: i + 1 })
        .eq("id", orden[i]);
      if (updateError) throw updateError;
    }

    revalidatePath("/liga");

    return Response.json({ message: "Desempate guardado" }, { status: 200 });
  } catch (error) {
    console.error(error);
    return Response.json(
      { error: "Ocurrio un error al guardar el desempate" },
      { status: 500 },
    );
  }
}
