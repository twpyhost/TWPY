import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/apiAuth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { resolverParticipante } from "@/lib/identidadResolucion";
import { ApiError } from "@/lib/apiError";

export async function POST(req) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;
    const { user } = auth;

    const { participanteId, displayName } = await req.json();
    if (!participanteId) {
      return Response.json({ error: "Se requiere participanteId" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    const { data: participante, error: participanteError } = await supabase
      .from("tournament_participants_raw")
      .select("nombre_participante")
      .eq("id", participanteId)
      .maybeSingle();

    if (participanteError) throw participanteError;
    if (!participante) {
      return Response.json({ error: "Participante no encontrado" }, { status: 404 });
    }

    const nombre = (displayName || participante.nombre_participante || "").trim();
    if (!nombre) {
      return Response.json({ error: "Se requiere un nombre" }, { status: 400 });
    }

    let jugador = null;

    try {
      const { data, error: jugadorError } = await supabase
        .from("players")
        .insert({ display_name: nombre })
        .select("id, display_name")
        .single();

      if (jugadorError) throw jugadorError;
      jugador = data;

      const resultado = await resolverParticipante(supabase, {
        participanteId,
        playerId: jugador.id,
        actorUserId: user.id,
        actorEmail: user.email,
        tipoEvento: "crear_jugador",
      });

      revalidatePath("/ranking");
      revalidatePath("/competidores");
      revalidatePath("/torneos");

      return Response.json(
        { message: "Jugador creado", player: jugador, ...resultado },
        { status: 200 },
      );
    } catch (innerError) {
      // Revierte el jugador recien creado si algo despues fallo, para no
      // dejar un player huerfano sin cuentas ni resultados.
      if (jugador) {
        await supabase.from("players").delete().eq("id", jugador.id);
      }
      throw innerError;
    }
  } catch (error) {
    if (error instanceof ApiError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    console.error(error);
    return Response.json(
      { error: "Ocurrio un error al crear el jugador" },
      { status: 500 },
    );
  }
}
