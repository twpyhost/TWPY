import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/apiAuth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { validarPuntajes, reemplazarPuntajes } from "@/lib/puntajes";

// Un solo juego en el MVP (Tekken 8) -- sin tabla de seleccion de juego en
// la UI, la config de puntajes es siempre la de ese juego.
async function obtenerJuegoTekken8(supabase) {
  const { data, error } = await supabase
    .from("juegos")
    .select("id")
    .ilike("nombre", "Tekken 8")
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function GET() {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const supabase = getSupabaseAdmin();
    const juego = await obtenerJuegoTekken8(supabase);
    if (!juego) {
      return Response.json({ puntajes: [] }, { status: 200 });
    }

    const { data, error } = await supabase
      .from("puntajes_config")
      .select("posicion, puntos")
      .eq("juego_id", juego.id)
      .order("posicion", { ascending: true });

    if (error) throw error;

    return Response.json({ puntajes: data }, { status: 200 });
  } catch (error) {
    console.error(error);
    return Response.json(
      { error: "Ocurrio un error al obtener los puntajes" },
      { status: 500 },
    );
  }
}

export async function PUT(req) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const { puntajes } = await req.json();

    const validacion = validarPuntajes(puntajes);
    if (!validacion.ok) {
      return Response.json({ error: validacion.error }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const juego = await obtenerJuegoTekken8(supabase);
    if (!juego) {
      return Response.json({ error: "No se encontro el juego Tekken 8" }, { status: 404 });
    }

    await reemplazarPuntajes(supabase, juego.id, puntajes);

    revalidatePath("/ranking");

    return Response.json({ message: "Puntajes actualizados" }, { status: 200 });
  } catch (error) {
    console.error(error);
    return Response.json(
      { error: "Ocurrio un error al guardar los puntajes" },
      { status: 500 },
    );
  }
}
