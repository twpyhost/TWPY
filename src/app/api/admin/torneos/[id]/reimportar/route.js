import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/apiAuth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { fetchChallongeApi } from "@/lib/challonge";
import { insertarTorneo } from "@/lib/importarTorneo";

export async function POST(req, { params }) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const { id } = await params;
    const torneoId = Number(id);
    if (!Number.isFinite(torneoId)) {
      return Response.json({ error: "Id de torneo invalido" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    const { data: existente, error: existenteError } = await supabase
      .from("torneos")
      .select("id, challonge_source_account")
      .eq("id", torneoId)
      .maybeSingle();

    if (existenteError) throw existenteError;
    if (!existente) {
      return Response.json({ error: "El torneo no existe" }, { status: 404 });
    }

    const cuenta = existente.challonge_source_account;

    const apiResponse = await fetchChallongeApi(torneoId, cuenta);
    if (!apiResponse) {
      return Response.json(
        { error: "No se pudo conectar con Challonge" },
        { status: 502 },
      );
    }
    if (!apiResponse.ok) {
      const errorMessage = await apiResponse.text();
      return Response.json({ error: errorMessage }, { status: apiResponse.status });
    }

    const { tournament } = await apiResponse.json();

    // Cascade en torneos.delete limpia tournament_participants_raw y
    // ranking_snapshots de este torneo; insertarTorneo recalcula la
    // temporada completa al reinsertar.
    const { error: deleteError } = await supabase
      .from("torneos")
      .delete()
      .eq("id", torneoId);
    if (deleteError) throw deleteError;

    const resumen = await insertarTorneo(supabase, tournament, cuenta);

    revalidatePath("/ranking");
    revalidatePath("/competidores");
    revalidatePath("/torneos");
    revalidatePath(`/torneo-resultado/${torneoId}`);

    return Response.json(
      { message: "Torneo reimportado exitosamente", resumen },
      { status: 200 },
    );
  } catch (error) {
    console.error(error);
    return Response.json(
      { error: "Ocurrio un error al reimportar el torneo" },
      { status: 500 },
    );
  }
}
