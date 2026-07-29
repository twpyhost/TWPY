import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/apiAuth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { registrarEvento } from "@/lib/identidadEventos";

export async function POST(req) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;
    const { user } = auth;

    const { displayName } = await req.json();
    const nombre = (displayName || "").trim();
    if (!nombre) {
      return Response.json({ error: "Se requiere un nombre" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    const { data: jugador, error } = await supabase
      .from("players")
      .insert({ display_name: nombre })
      .select("id, display_name")
      .single();

    if (error) throw error;

    await registrarEvento(supabase, {
      tipo: "registrar_manual",
      actorUserId: user.id,
      detalle: {
        player_id: jugador.id,
        display_name: jugador.display_name,
        actor_email: user.email,
      },
    });

    revalidatePath("/competidores");

    return Response.json(
      { message: "Jugador registrado", player: jugador },
      { status: 200 },
    );
  } catch (error) {
    console.error(error);
    return Response.json(
      { error: "Ocurrio un error al registrar el jugador" },
      { status: 500 },
    );
  }
}
