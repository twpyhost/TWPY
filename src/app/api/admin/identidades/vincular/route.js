import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/apiAuth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { resolvePlayerChain } from "@/lib/players";
import { resolverParticipante } from "@/lib/identidadResolucion";
import { ApiError } from "@/lib/apiError";

export async function POST(req) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;
    const { user } = auth;

    const { participanteId, playerId } = await req.json();
    if (!participanteId || !playerId) {
      return Response.json(
        { error: "Se requieren participanteId y playerId" },
        { status: 400 },
      );
    }

    const supabase = getSupabaseAdmin();

    const playerIdResuelto = await resolvePlayerChain(supabase, playerId);
    if (!playerIdResuelto) {
      return Response.json({ error: "Jugador no encontrado" }, { status: 404 });
    }

    const resultado = await resolverParticipante(supabase, {
      participanteId,
      playerId: playerIdResuelto,
      actorUserId: user.id,
      actorEmail: user.email,
      tipoEvento: "vincular",
    });

    revalidatePath("/ranking");
    revalidatePath("/competidores");
    revalidatePath("/torneos");
    // El badge de "Pendientes" del sidebar admin lo calcula
    // src/app/admin/layout.js -- sin esto queda desactualizado hasta un
    // reload completo.
    revalidatePath("/admin", "layout");

    return Response.json(
      { message: "Participante vinculado", ...resultado },
      { status: 200 },
    );
  } catch (error) {
    if (error instanceof ApiError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    console.error(error);
    return Response.json(
      { error: "Ocurrio un error al vincular el participante" },
      { status: 500 },
    );
  }
}
