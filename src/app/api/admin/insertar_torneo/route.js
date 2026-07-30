import { revalidatePath } from "next/cache";
import { getAdminUser } from "@/lib/adminAuth";
import { extractTournamentId, fetchChallongeApi } from "@/lib/challonge";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { insertarTorneo } from "@/lib/importarTorneo";

export async function POST(req) {
  try {
    const { user, isAdmin, error } = await getAdminUser();
    if (error) {
      return Response.json(
        { error: "Ha ocurrido un error al validar la sesion" },
        { status: 500 },
      );
    }

    if (!user) {
      return Response.json(
        { error: "Debes iniciar sesion para cargar torneos" },
        { status: 401 },
      );
    }

    if (!isAdmin) {
      return Response.json(
        { error: "No tenes permisos para cargar torneos" },
        { status: 403 },
      );
    }

    const { url, cuenta: cuentaBody } = await req.json();
    if (!url) {
      return Response.json({ error: "Se requiere la URL" }, { status: 400 });
    }

    const cuenta = ["A", "B"].includes(cuentaBody) ? cuentaBody : "B";

    const tournamentId = extractTournamentId(url);
    if (!tournamentId) {
      return Response.json({ error: "URL no valida" }, { status: 400 });
    }

    const apiResponse = await fetchChallongeApi(tournamentId, cuenta);
    if (!apiResponse) {
      return Response.json(
        { error: "No se pudo conectar con Challonge" },
        { status: 502 },
      );
    }

    if (!apiResponse.ok) {
      const errorMessage = await apiResponse.text();
      return Response.json(
        { error: errorMessage },
        { status: apiResponse.status },
      );
    }

    const { tournament } = await apiResponse.json();

    if (tournament.state !== "complete") {
      return Response.json(
        { error: "El torneo todavia no esta finalizado en Challonge" },
        { status: 400 },
      );
    }

    const supabase = getSupabaseAdmin();

    const { data: existente, error: existenteError } = await supabase
      .from("torneos")
      .select("id")
      .eq("id", tournament.id)
      .maybeSingle();

    if (existenteError) {
      throw existenteError;
    }

    if (existente) {
      return Response.json(
        { error: "Este torneo ya fue cargado anteriormente" },
        { status: 409 },
      );
    }

    const resumen = await insertarTorneo(supabase, tournament, cuenta);

    // Refresca las paginas publicas cacheadas de inmediato.
    revalidatePath("/ranking");
    revalidatePath("/competidores");
    revalidatePath("/torneos");

    return Response.json(
      { message: "Torneo insertado exitosamente", resumen },
      { status: 200 },
    );
  } catch (error) {
    console.error(error);
    return Response.json(
      { error: "Ocurrio un error al insertar el torneo" },
      { status: 500 },
    );
  }
}
