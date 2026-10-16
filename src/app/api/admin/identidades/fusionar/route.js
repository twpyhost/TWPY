import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/apiAuth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { resolvePlayerChain } from "@/lib/players";
import { recalcularSnapshotsPorTorneos } from "@/lib/rankings";


export async function POST(req) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;
    const { user } = auth;

    const { basePlayerId, duplicatePlayerId } = await req.json();
    if (!basePlayerId || !duplicatePlayerId) {
      return Response.json(
        { error: "Se requieren basePlayerId y duplicatePlayerId" },
        { status: 400 },
      );
    }

    const supabase = getSupabaseAdmin();

    const baseId = await resolvePlayerChain(supabase, basePlayerId);
    const duplicateId = await resolvePlayerChain(supabase, duplicatePlayerId);

    if (!baseId || !duplicateId) {
      return Response.json({ error: "Jugador no encontrado" }, { status: 404 });
    }
    if (baseId === duplicateId) {
      return Response.json(
        { error: "Los jugadores ya estan fusionados o son el mismo" },
        { status: 400 },
      );
    }

    const { data: merged, error: mergeError } = await supabase.rpc("merge_player_profiles", {
      p_base_id: baseId, p_duplicate_id: duplicateId,
      p_actor_id: user.id, p_actor_email: user.email,
    });
    if (mergeError) throw mergeError;

    let temporadasRecalculadas = [];
    let advertencia = null;
    try {
      temporadasRecalculadas = await recalcularSnapshotsPorTorneos(
        supabase,
        merged.torneos_reasignados,
      );
    } catch (recalcError) {
      console.error(recalcError);
      advertencia =
        "La fusion se aplico pero el recalculo de rankings fallo: usa 'Recalcular rankings' en la seccion Rankings.";
    }

    revalidatePath("/ranking");
    revalidatePath("/competidores", "layout");
    revalidatePath("/torneo-resultado", "layout");
    revalidatePath("/liga");
    revalidatePath("/sitemap.xml");
    revalidatePath("/torneos");

    return Response.json(
      {
        message: "Jugadores fusionados",
        cuentas_reasignadas: merged.cuentas_reasignadas,
        participantes_reasignados: merged.participantes_reasignados,
        conflictos: merged.conflictos,
        temporadas_recalculadas: temporadasRecalculadas,
        advertencia,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error(error);
    return Response.json(
      { error: "Ocurrio un error al fusionar los jugadores" },
      { status: 500 },
    );
  }
}
