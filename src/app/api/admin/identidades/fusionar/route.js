import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/apiAuth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { resolvePlayerChain } from "@/lib/players";
import { recalcularSnapshotsPorTorneos } from "@/lib/rankings";
import { registrarEvento } from "@/lib/identidadEventos";

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

    // Torneos donde AMBOS jugadores ya tienen fila propia: no se pueden
    // reasignar en un solo UPDATE (violarian el indice unico
    // tournament_participants_raw_torneo_player_un). Se excluyen de la
    // reasignacion y se reportan como conflicto para revision manual, en
    // vez de perder datos o pisar silenciosamente uno de los dos.
    const { data: filasBase, error: filasBaseError } = await supabase
      .from("tournament_participants_raw")
      .select("torneo_id")
      .eq("player_id", baseId);

    if (filasBaseError) throw filasBaseError;

    const { data: filasDuplicado, error: filasDuplicadoError } = await supabase
      .from("tournament_participants_raw")
      .select("id, torneo_id")
      .eq("player_id", duplicateId);

    if (filasDuplicadoError) throw filasDuplicadoError;

    const torneosBase = new Set(filasBase.map((fila) => fila.torneo_id));
    const conflictos = [
      ...new Set(
        filasDuplicado
          .filter((fila) => torneosBase.has(fila.torneo_id))
          .map((fila) => fila.torneo_id),
      ),
    ];
    const filasAReasignar = filasDuplicado.filter(
      (fila) => !torneosBase.has(fila.torneo_id),
    );

    const { data: cuentasReasignadas, error: cuentasError } = await supabase
      .from("player_challonge_accounts")
      .update({ player_id: baseId, active: false })
      .eq("player_id", duplicateId)
      .select("id");

    if (cuentasError) throw cuentasError;

    if (filasAReasignar.length > 0) {
      const { error: reasignarError } = await supabase
        .from("tournament_participants_raw")
        .update({ player_id: baseId })
        .in(
          "id",
          filasAReasignar.map((fila) => fila.id),
        );

      if (reasignarError) throw reasignarError;
    }

    const { error: mergeError } = await supabase
      .from("players")
      .update({ merged_into_player_id: baseId })
      .eq("id", duplicateId);

    if (mergeError) throw mergeError;

    let temporadasRecalculadas = [];
    let advertencia = null;
    try {
      temporadasRecalculadas = await recalcularSnapshotsPorTorneos(
        supabase,
        filasAReasignar.map((fila) => fila.torneo_id),
      );
    } catch (recalcError) {
      console.error(recalcError);
      advertencia =
        "La fusion se aplico pero el recalculo de rankings fallo: usa 'Recalcular rankings' en la seccion Rankings.";
    }

    const { data: jugadoresFusionados } = await supabase
      .from("players")
      .select("id, display_name")
      .in("id", [baseId, duplicateId]);
    const nombrePor = (id) =>
      jugadoresFusionados?.find((j) => j.id === id)?.display_name ?? null;

    await registrarEvento(supabase, {
      tipo: "fusionar",
      actorUserId: user.id,
      detalle: {
        base_player_id: baseId,
        base_display_name: nombrePor(baseId),
        duplicate_player_id: duplicateId,
        duplicate_display_name: nombrePor(duplicateId),
        cuentas_reasignadas: cuentasReasignadas.length,
        participantes_reasignados: filasAReasignar.length,
        conflictos,
        temporadas_recalculadas: temporadasRecalculadas,
        actor_email: user.email,
      },
    });

    revalidatePath("/ranking");
    revalidatePath("/competidores");
    revalidatePath("/torneos");

    return Response.json(
      {
        message: "Jugadores fusionados",
        cuentas_reasignadas: cuentasReasignadas.length,
        participantes_reasignados: filasAReasignar.length,
        conflictos,
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
