import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/apiAuth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { registrarEvento } from "@/lib/identidadEventos";
import { savePlayerProfileMetadata } from "@/lib/playerProfileAdmin";
import { isPublicId, validateProfileMetadata } from "@/lib/playerProfiles";

export async function PATCH(req, { params }) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;
    const { user } = auth;

    const { id } = await params;
    const playerId = Number(id);
    if (!Number.isFinite(playerId)) {
      return Response.json({ error: "Id invalido" }, { status: 400 });
    }

    const body = await req.json();
    if ("profileMetadata" in body) {
      if (!isPublicId(id)) return Response.json({ error: "Id inválido" }, { status: 400 });
      let metadata;
      try { metadata = validateProfileMetadata(body.profileMetadata); }
      catch (error) { return Response.json({ error: error.message }, { status: 400 }); }
      const supabase = getSupabaseAdmin();
      const { data: player, error: lookupError } = await supabase.from("players").select("id").eq("id", id).is("merged_into_player_id", null).maybeSingle();
      if (lookupError) throw lookupError;
      if (!player) return Response.json({ error: "Jugador no encontrado" }, { status: 404 });
      try { await savePlayerProfileMetadata(supabase, id, metadata); }
      catch (error) { return Response.json({ error: error.message }, { status: 400 }); }
      await registrarEvento(supabase, { tipo: "editar_jugador", actorUserId: user.id, detalle: { player_id: playerId, cambios: { profileMetadata: metadata }, actor_email: user.email } });
      revalidatePath("/competidores", "layout");
      revalidatePath("/ranking");
      return Response.json({ message: "Personajes y cuentas actualizados" });
    }
    const cambios = {};

    if (typeof body.display_name === "string" && body.display_name.trim()) {
      cambios.display_name = body.display_name.trim();
    }
    if ("avatar_url" in body) {
      cambios.avatar_url = body.avatar_url || null;
    }
    if ("discord_id" in body) {
      cambios.discord_id = body.discord_id || null;
    }

    if (Object.keys(cambios).length === 0) {
      return Response.json({ error: "No hay cambios para aplicar" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    const { data: jugador, error } = await supabase
      .from("players")
      .update(cambios)
      .eq("id", playerId)
      .select("id, display_name, avatar_url, discord_id")
      .maybeSingle();

    if (error) throw error;
    if (!jugador) {
      return Response.json({ error: "Jugador no encontrado" }, { status: 404 });
    }

    await registrarEvento(supabase, {
      tipo: "editar_jugador",
      actorUserId: user.id,
      detalle: { player_id: playerId, cambios, actor_email: user.email },
    });

    revalidatePath("/competidores", "layout");
    revalidatePath("/ranking");

    return Response.json(
      { message: "Jugador actualizado", jugador },
      { status: 200 },
    );
  } catch (error) {
    console.error(error);
    return Response.json(
      { error: "Ocurrio un error al actualizar el jugador" },
      { status: 500 },
    );
  }
}
