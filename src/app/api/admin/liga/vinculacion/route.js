import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/apiAuth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { resolvePlayerChain } from "@/lib/players";
import { sugerirJugador } from "@/lib/nameSimilarity";
import { obtenerLigaActual } from "@/lib/ligaAdmin";

export async function GET() {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const supabase = getSupabaseAdmin();
    const liga = await obtenerLigaActual(supabase);
    if (!liga) {
      return Response.json({ error: "No hay ninguna liga cargada" }, { status: 404 });
    }

    const { data: grupos, error: gruposError } = await supabase
      .from("liga_grupos")
      .select("id, numero")
      .eq("liga_id", liga.id);
    if (gruposError) throw gruposError;

    const numeroPorGrupoId = new Map(grupos.map((g) => [g.id, g.numero]));
    const grupoIds = grupos.map((g) => g.id);

    const { data: pendientes, error: pendientesError } = grupoIds.length
      ? await supabase
          .from("liga_participantes")
          .select("id, grupo_id, nombre")
          .in("grupo_id", grupoIds)
          .is("player_id", null)
      : { data: [], error: null };
    if (pendientesError) throw pendientesError;

    // No sugerir jugadores fusionados/absorbidos -- mismo filtro que la
    // policy publica de players (merged_into_player_id is null).
    const { data: candidatos, error: candidatosError } = await supabase
      .from("players")
      .select("id, display_name")
      .is("merged_into_player_id", null);
    if (candidatosError) throw candidatosError;

    const resultado = pendientes.map((p) => {
      const sugerencia = sugerirJugador(p.nombre, candidatos);
      return {
        participanteId: p.id,
        nombre: p.nombre,
        grupoNumero: numeroPorGrupoId.get(p.grupo_id),
        sugerencia,
      };
    });

    return Response.json({ pendientes: resultado }, { status: 200 });
  } catch (error) {
    console.error(error);
    return Response.json(
      { error: "Ocurrio un error al obtener la cola de vinculacion" },
      { status: 500 },
    );
  }
}

export async function POST(req) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const { participanteId, playerId, crearComo } = await req.json();
    if (!participanteId) {
      return Response.json({ error: "Se requiere participanteId" }, { status: 400 });
    }
    if (!playerId && !crearComo) {
      return Response.json(
        { error: "Se requiere playerId o crearComo" },
        { status: 400 },
      );
    }

    const supabase = getSupabaseAdmin();
    let jugador;

    if (playerId) {
      const playerIdResuelto = await resolvePlayerChain(supabase, playerId);
      if (!playerIdResuelto) {
        return Response.json({ error: "Jugador no encontrado" }, { status: 404 });
      }
      jugador = { id: playerIdResuelto };
    } else {
      const nombre = crearComo.trim();
      if (!nombre) {
        return Response.json({ error: "Se requiere un nombre" }, { status: 400 });
      }
      const { data: nuevoJugador, error: crearError } = await supabase
        .from("players")
        .insert({ display_name: nombre })
        .select("id")
        .single();
      if (crearError) throw crearError;
      jugador = nuevoJugador;
    }

    const { error: updateError } = await supabase
      .from("liga_participantes")
      .update({ player_id: jugador.id })
      .eq("id", participanteId);
    if (updateError) throw updateError;

    revalidatePath("/liga");
    if (crearComo) revalidatePath("/competidores");

    return Response.json(
      { message: "Participante vinculado", playerId: jugador.id },
      { status: 200 },
    );
  } catch (error) {
    console.error(error);
    return Response.json(
      { error: "Ocurrio un error al vincular el participante" },
      { status: 500 },
    );
  }
}
